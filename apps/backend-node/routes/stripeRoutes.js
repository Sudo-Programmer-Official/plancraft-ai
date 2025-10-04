// apps/backend-node/routes/stripeRoutes.js
import express from 'express'
import Stripe from 'stripe'
import { db } from '../services/firebaseAdmin.js'

const router = express.Router()

// Initialize Stripe client if configured
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' })
  : null

// POST /api/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { userId, plan, successUrl, cancelUrl } = req.body || {}

    if (!userId) return res.status(400).json({ error: 'User must be logged in to upgrade' })
    if (!plan) return res.status(400).json({ error: 'Missing plan' })

    // Dynamically resolve plan → Stripe Price ID (with aliases)
    const planKey = String(plan || 'monthly').toLowerCase()
    const aliasMap = {
      pro: 'MONTHLY',
      premium: 'MONTHLY',
      monthly: 'MONTHLY',
      year: 'YEARLY',
      yearly: 'YEARLY',
      annual: 'YEARLY',
    }
    const envSuffix = aliasMap[planKey] || 'MONTHLY'
    const priceIdKey = `STRIPE_${envSuffix}_PRICE_ID`
    const priceId = process.env[priceIdKey] || process.env.STRIPE_MONTHLY_PRICE_ID

    console.log(`Looking up Stripe price with key: ${priceIdKey}, resolved: ${priceId}`)
    console.log(`Creating checkout session for user ${userId}, plan: ${plan}, priceId: ${priceId}`)
    if (!priceId) {
      console.error(`❌ No price ID configured. Expected env ${priceIdKey} or STRIPE_MONTHLY_PRICE_ID`)
      return res.status(400).json({ error: `No price ID configured. Set ${priceIdKey} or STRIPE_MONTHLY_PRICE_ID` })
    }
    if (!/^price_/.test(String(priceId))) {
      console.error('❌ Invalid Stripe price format. Must start with price_')
      return res.status(400).json({ error: 'Invalid Stripe price ID. It should start with "price_"' })
    }

    // If Stripe not configured, fall back to static URL (dev/demo)
    if (!stripe) {
      const url = process.env.STRIPE_CHECKOUT_URL || successUrl || '/subscription?status=success'
      return res.json({ url })
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || process.env.STRIPE_SUCCESS_URL,
      cancel_url: cancelUrl || process.env.STRIPE_CANCEL_URL,
      metadata: { userId, plan: planKey },
    })

    console.log(`✅ Checkout session created for user ${userId}, plan: ${plan}`)
    res.json({ url: session.url })
  } catch (err) {
    const msg = err?.raw?.message || err?.message || 'Failed to create checkout session'
    console.error('❌ Stripe checkout error:', msg)
    const status = err?.statusCode || 500
    res.status(status).json({ error: msg })
  }
})

// Webhook handler to be mounted with express.raw in app
export async function stripeWebhookHandler(req, res) {
  try {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      // Accept and noop in dev when not configured
      return res.status(200).send('ok')
    }
    const sig = req.headers['stripe-signature']
    let event
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('❌ Stripe webhook signature verification failed:', err.message)
      return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log('✅ Webhook completed for userId:', session?.metadata?.userId, 'plan:', session?.metadata?.plan)
        try {
          const userId = String(session?.metadata?.userId || '')
          const plan = (session?.metadata?.plan || 'premium').toLowerCase() === 'premium' ? 'premium' : 'premium'
          if (userId) {
            await db.collection('users').doc(userId).set({ plan, subscription: { status: 'active', sessionId: session.id } }, { merge: true })
          }
        } catch (e) { console.warn('Failed to persist plan on webhook:', e?.message || e) }
        break
      }
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed':
        console.log('⚠️ Subscription ended or payment failed:', event.type)
        try {
          const sub = event.data.object
          const userId = String(sub?.metadata?.userId || '')
          if (userId) {
            await db.collection('users').doc(userId).set({ plan: 'free', subscription: { status: 'canceled' } }, { merge: true })
          }
        } catch (e) { console.warn('Failed to downgrade plan on webhook:', e?.message || e) }
        break
      default:
        console.log('ℹ️ Stripe event:', event.type)
    }
    res.json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    res.status(500).send('server error')
  }
}

export default router
