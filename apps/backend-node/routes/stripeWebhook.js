// apps/backend-node/routes/stripeWebhook.js
import Stripe from "stripe"
import { db } from "../services/firebaseAdmin.js"
import { recomputeSeatsUsed } from "../services/workspaceService.js"

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" })
  : null
const STRIPE_EVENT_COLLECTION = "stripe_events"

async function isEventProcessed(eventId) {
  if (!eventId) return false
  const snap = await db.collection(STRIPE_EVENT_COLLECTION).doc(String(eventId)).get()
  return snap.exists
}

async function markEventProcessed(event, meta = {}) {
  if (!event?.id) return
  try {
    const payload = {
      id: event.id,
      type: event.type,
      created: event.created ? new Date(event.created * 1000) : new Date(),
      processedAt: new Date(),
    }
    if (meta.workspaceId || meta.workspace_id) payload.workspaceId = meta.workspaceId || meta.workspace_id
    if (meta.plan) payload.plan = meta.plan
    if (meta.seats || meta.seatQuantity) payload.seats = meta.seats || meta.seatQuantity
    if (meta.billingStatus) payload.billingStatus = meta.billingStatus
    if (meta.reason) payload.reason = meta.reason
    await db
      .collection(STRIPE_EVENT_COLLECTION)
      .doc(String(event.id))
      .set(payload, { merge: true })
  } catch (err) {
    console.warn("[Stripe] failed to persist event marker", err?.message || err)
  }
}

async function syncWorkspaceSubscription(meta = {}, sub = null, status = "active") {
  const workspaceId = meta.workspaceId || meta.workspace_id
  if (!workspaceId) return
  const plan = meta.plan || "starter"
  const seats = Number(meta.seats) || null
  const featurePayload = {
    voiceReminders: plan === "starter" || plan === "pro",
    advancedPermissions: plan === "pro",
    prioritySupport: plan === "pro",
  }
  const payload = {
    plan,
    billingStatus: status,
    stripeSubscriptionId: (sub && sub.id) || meta.subscriptionId || null,
    stripeCustomerId: (sub && sub.customer) || meta.customer || null,
    updated_at: new Date(),
    features: featurePayload,
  }
  if (seats && seats > 0) payload.seats = seats
  await db.collection("workspaces").doc(String(workspaceId)).set(payload, { merge: true })
  await recomputeSeatsUsed(workspaceId, { excludeViewers: true })
  await markEventProcessed(meta.__event, {
    workspaceId,
    plan,
    seats,
    billingStatus: status,
    reason: meta.reason || null,
  })
}

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
    if (await isEventProcessed(event.id)) {
      return res.json({ received: true, duplicate: true })
    }
    console.log('[Stripe] Webhook event received:', event.type)
    let lastMeta = {}
    switch (event.type) {
      /**
       * User completed checkout
       */
      case "checkout.session.completed": {
        const session = event.data.object
        const uid = session?.metadata?.userId
        const workspaceId = session?.metadata?.workspaceId
        if (!uid && !workspaceId) {
          console.warn('[Stripe] checkout.session.completed missing metadata identifiers')
          break
        }

        // Workspace subscription flow
        if (workspaceId) {
          console.log(`✅ Workspace checkout success ws=${workspaceId} plan=${session?.metadata?.plan}`)
          const sub = session.subscription
            ? await stripe.subscriptions.retrieve(session.subscription)
            : null
          if (sub?.id) {
            try { await stripe.subscriptions.update(sub.id, { metadata: { ...(sub.metadata || {}), workspaceId, plan: session?.metadata?.plan || 'starter', seats: session?.metadata?.seats || null } }) } catch (e) {
              console.warn('Failed to attach workspaceId to subscription metadata:', e?.message || e)
            }
          }
          const billingStatus = (sub?.status === "trialing" || sub?.status === "active") ? "active" : "past_due"
          await syncWorkspaceSubscription(
            {
              workspaceId,
              plan: session?.metadata?.plan || "starter",
              seats: session?.metadata?.seats || session?.metadata?.seatQuantity || null,
              customer: session?.customer,
              subscriptionId: session?.subscription,
              reason: "checkout_completed",
              __event: event,
            },
            sub,
            billingStatus,
          )
          lastMeta = { workspaceId, plan: session?.metadata?.plan, seats: session?.metadata?.seats || session?.metadata?.seatQuantity, billingStatus, reason: "checkout_completed" }
          break
        }

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
            plan: "premium",
            subscription: {
              status: "active",
              stripeSubId: sub?.id || session.subscription,
              customerId: session?.customer || sub?.customer || null,
              currentPeriodEnd: sub?.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null,
              plan: "premium",
              billingInterval: session?.metadata?.plan || "monthly",
            },
          },
          { merge: true }
        )
        console.log(`[Stripe] Premium plan activated for user ${uid}`)
        break
      }

      /**
       * Recurring invoice payment success
       */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object
        console.log("💰 Payment succeeded:", invoice.id)
        if (invoice.subscription && invoice.customer) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription)
          const wsId = sub?.metadata?.workspaceId
          if (wsId) {
            await syncWorkspaceSubscription(
              { workspaceId: wsId, plan: sub?.metadata?.plan || "starter", seats: sub?.metadata?.seats || sub?.metadata?.seatQuantity, customer: sub?.customer || invoice.customer, subscriptionId: sub?.id, reason: "payment_succeeded", __event: event },
              sub,
              "active",
            )
            lastMeta = { workspaceId: wsId, plan: sub?.metadata?.plan || "starter", seats: sub?.metadata?.seats || sub?.metadata?.seatQuantity, billingStatus: "active", reason: "payment_succeeded" }
          }
          let uid = sub?.metadata?.userId
          if (uid) {
            await db.collection("users").doc(uid).set(
              {
                plan: "premium",
                subscription: {
                  status: "active",
                  plan: "premium",
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
                plan: 'premium',
                subscription: {
                  status: 'active',
                  plan: 'premium',
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
       * Created/Updated subscription: ensure user is premium and store metadata
       */
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        try {
          // Make sure userId is in metadata for future mapping
          const uid = sub?.metadata?.userId
          const wsId = sub?.metadata?.workspaceId
          if (sub?.id && !uid && !wsId) {
            console.warn('[Stripe] subscription missing metadata identifiers; unable to map')
            break
          }
          if (wsId) {
            const status =
              sub?.status === "active" || sub?.status === "trialing"
                ? "active"
              : sub?.status === "canceled"
                ? "canceled"
                : sub?.status === "past_due" || sub?.status === "unpaid"
                    ? "past_due"
                    : "past_due"
            await syncWorkspaceSubscription(
              {
                workspaceId: wsId,
                plan: sub?.metadata?.plan || "starter",
                seats: sub?.metadata?.seats || sub?.metadata?.seatQuantity || null,
                customer: sub?.customer || null,
                subscriptionId: sub?.id,
                reason: "subscription_updated",
                __event: event,
              },
              sub,
              status,
            )
            lastMeta = { workspaceId: wsId, plan: sub?.metadata?.plan || "starter", seats: sub?.metadata?.seats || sub?.metadata?.seatQuantity, billingStatus: status, reason: "subscription_updated" }
          }
          if (uid) {
            const base = {
              plan: 'premium',
              subscription: {
                stripeSubId: sub?.id,
                customerId: sub?.customer || null,
                currentPeriodEnd: sub?.current_period_end ? new Date(sub.current_period_end * 1000) : null,
                plan: 'premium',
              },
            }
            if (sub?.cancel_at_period_end) {
              base.subscription.status = 'canceled'
              base.subscription.cancelAtPeriodEnd = true
              base.subscription.cancelAt = sub?.current_period_end ? new Date(sub.current_period_end * 1000) : null
            } else {
              base.subscription.status = (sub?.status === 'active' || sub?.status === 'trialing') ? 'active' : 'past_due'
              base.subscription.cancelAtPeriodEnd = false
              base.subscription.cancelAt = null
            }
            await db.collection('users').doc(uid).set(base, { merge: true })
            console.log(`[Stripe] Synced subscription ${sub?.id} for user ${uid}`)
          }
        } catch (e) {
          console.error('Failed to sync subscription:', e?.message || e)
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
        const wsId = payload?.metadata?.workspaceId
        const billingStatus = event.type === "customer.subscription.deleted" ? "canceled" : "past_due"
        if (wsId) {
          await syncWorkspaceSubscription(
            { workspaceId: wsId, plan: payload?.metadata?.plan || "starter", seats: payload?.metadata?.seats || payload?.metadata?.seatQuantity, reason: "payment_failed", __event: event },
            payload,
            billingStatus,
          )
          lastMeta = { workspaceId: wsId, plan: payload?.metadata?.plan || "starter", seats: payload?.metadata?.seats || payload?.metadata?.seatQuantity, billingStatus, reason: "payment_failed" }
        }
        if (!uid && subId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subId)
            uid = sub?.metadata?.userId
            if (!sub?.metadata?.workspaceId && wsId) {
              await stripe.subscriptions.update(subId, { metadata: { ...(sub.metadata || {}), workspaceId: wsId } })
            }
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
                plan: 'free',
                subscription: { status: 'canceled', plan: 'free' },
              }, { merge: true })
            }
          }
          break
        }

        console.log(`⚠️ Downgrading user ${uid} → free`)

        await db.collection("users").doc(uid).set(
          {
            plan: 'free',
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

    await markEventProcessed(event, lastMeta)
    res.json({ received: true })
  } catch (err) {
    console.error("❌ Webhook handler error:", err)
    res.status(500).send("server error")
  }
}
