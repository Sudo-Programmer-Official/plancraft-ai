// apps/backend-node/routes/stripeWebhook.js
import Stripe from "stripe"
import { db } from "../services/firebaseAdmin.js"

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" })
  : null

export async function stripeWebhookHandler(req, res) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(200).send("ok") // dev noop
  }

  const sig = req.headers["stripe-signature"]
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error("❌ Webhook signature failed:", err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      /**
       * User completed checkout
       */
      case "checkout.session.completed": {
        const session = event.data.object
        const uid = session?.metadata?.userId
        if (!uid) break

        console.log(`✅ Subscription success for uid=${uid}`)

        // Fetch real subscription object for reliable dates
        const sub = session.subscription
          ? await stripe.subscriptions.retrieve(session.subscription)
          : null

        // Ensure subscription carries uid for future invoice events
        if (sub?.id) {
          try { await stripe.subscriptions.update(sub.id, { metadata: { userId: uid } }) } catch (e) {
            console.warn('Failed to set subscription metadata userId:', e?.message || e)
          }
        }

        await db.collection("users").doc(uid).set(
          {
            role: "premium",
            subscription: {
              status: "active",
              stripeSubId: sub?.id || session.subscription,
              customerId: session?.customer || sub?.customer || null,
              currentPeriodEnd: sub?.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null,
              plan: session?.metadata?.plan || "monthly",
            },
          },
          { merge: true }
        )
        break
      }

      /**
       * Recurring invoice payment success
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object
        console.log("💰 Payment succeeded:", invoice.id)
        // Optional: refresh subscription info in Firestore
        if (invoice.subscription && invoice.customer) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription)
          let uid = sub?.metadata?.userId
          if (uid) {
            await db.collection("users").doc(uid).set(
              {
                subscription: {
                  status: "active",
                  customerId: sub?.customer || invoice.customer,
                  currentPeriodEnd: sub?.current_period_end
                    ? new Date(sub.current_period_end * 1000)
                    : null,
                },
              },
              { merge: true }
            )
          } else {
            // Fallback: try match by stored customerId
            const qs = await db.collection('users')
              .where('subscription.customerId', '==', String(invoice.customer))
              .get()
            for (const doc of qs.docs) {
              await doc.ref.set({
                subscription: {
                  status: 'active',
                  customerId: sub?.customer || invoice.customer,
                  currentPeriodEnd: sub?.current_period_end
                    ? new Date(sub.current_period_end * 1000)
                    : null,
                },
              }, { merge: true })
            }
          }
        }
        break
      }

      /**
       * Canceled or failed subscription
       */
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const payload = event.data.object
        const subId = payload?.id || payload?.subscription
        let uid = payload?.metadata?.userId
        if (!uid && subId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subId)
            uid = sub?.metadata?.userId
          } catch {}
        }
        if (!uid) {
          // Fallback: locate by stored customerId
          const customer = payload?.customer
          if (customer) {
            const qs = await db.collection('users')
              .where('subscription.customerId', '==', String(customer))
              .get()
            for (const doc of qs.docs) {
              await doc.ref.set({
                role: 'free',
                subscription: { status: 'canceled', plan: 'free' },
              }, { merge: true })
            }
          }
          break
        }

        console.log(`⚠️ Downgrading user ${uid} → free`)

        await db.collection("users").doc(uid).set(
          {
            role: "free",
            subscription: {
              status: "canceled",
              plan: "free",
            },
          },
          { merge: true }
        )
        break
      }

      default:
        console.log("ℹ️ Unhandled Stripe event:", event.type)
    }

    res.json({ received: true })
  } catch (err) {
    console.error("❌ Webhook handler error:", err)
    res.status(500).send("server error")
  }
}
