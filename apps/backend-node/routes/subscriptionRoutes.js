import express from 'express'
import Stripe from 'stripe'
import { db } from '../services/firebaseAdmin.js'

const router = express.Router()

// Optional Stripe client (dev-friendly if missing)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' }) : null

// GET /api/subscription/status?userId=123
router.get('/subscription/status', async (req, res) => {
  try {
    const userId = String(req.query.userId || '')
    if (!userId) return res.json({ plan: 'free', remainingDays: 0 })
    const snap = await db.collection('users').doc(userId).get()
    const data = snap.exists ? snap.data() : {}
    const sub = data?.subscription || {}
    const status = String(sub.status || '').toLowerCase()
    let remainingDays = 0
    let isPremium = false
    try {
      const end = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
      if (end) {
        const diffMs = end.getTime() - Date.now()
        remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
        if ((status === 'active' || status === 'trialing') && diffMs > 0) {
          isPremium = true
        }
      } else if (status === 'active' || status === 'trialing') {
        isPremium = true
      }
    } catch {}
    const plan = isPremium ? 'premium' : 'free'
    return res.json({ plan, remainingDays })
  } catch (err) {
    console.error('subscription/status error', err)
    res.status(200).json({ plan: 'free', remainingDays: 0 })
  }
})

// POST /api/subscription/checkout
router.post('/subscription/checkout', async (req, res) => {
  try {
    const { userId, priceId, successUrl, cancelUrl } = req.body || {}
    if (!userId || !priceId) {
      return res.status(400).json({ error: 'Missing userId or priceId' })
    }

    // In a real app, create a Stripe Checkout Session here.
    // For development/demo, redirect to provided successUrl or configured URL.
    const demoUrl = process.env.STRIPE_CHECKOUT_URL || successUrl || '/subscription?status=success'
    return res.json({ url: demoUrl })
  } catch (err) {
    console.error('subscription/checkout error', err)
    res.status(500).json({ error: 'Checkout initialization failed' })
  }
})

export default router

// POST /api/subscription/cancel
router.post('/subscription/cancel', async (req, res) => {
  try {
    const { userId } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const ref = db.collection('users').doc(String(userId))
    const snap = await ref.get()
    if (!snap.exists) return res.status(404).json({ error: 'User not found' })
    const data = snap.data() || {}
    const existing = data.subscription || {}
    let subId = existing.stripeSubId || existing.id
    const customerId = existing.customerId

    let stripeResult = { id: subId, status: 'scheduled_cancel', source: 'local' }

    if (stripe) {
      try {
        // Prefer scheduling cancellation at period end to preserve access
        if (!subId && customerId) {
          // Try to find an active subscription for this customer
          const list = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
          const activeSub = list.data.find(s => ['active','trialing','past_due','incomplete'].includes(String(s.status)))
          if (activeSub) subId = activeSub.id
        }

        if (subId) {
          // First try to set cancel_at_period_end
          const updated = await stripe.subscriptions.update(subId, { cancel_at_period_end: true })
          stripeResult = { id: updated.id, status: updated.status, cancel_at_period_end: updated.cancel_at_period_end, current_period_end: updated.current_period_end, source: 'stripe.update' }
        } else {
          // Nothing to cancel on Stripe; fall through to local update
          console.warn('[Subscription] No subscription id found for user; marking local cancel_at_period_end')
        }
      } catch (err) {
        const msg = err?.message || ''
        console.error('❌ Stripe cancel (schedule) failed:', msg)
        try {
          if (subId) {
            const deleted = await stripe.subscriptions.del(subId)
            stripeResult = { id: deleted.id, status: deleted.status, source: 'stripe.del' }
          }
        } catch (err2) {
          console.error('❌ Stripe cancel (del) failed:', err2?.message || err2)
          // Do not hard-fail: proceed with local record so user sees canceled state; webhook will reconcile later
        }
      }
    }

    // Compose Firestore update (preserve access until end of period if we scheduled cancel)
    const now = new Date()
    const currentPeriodEnd = stripeResult.current_period_end ? new Date(stripeResult.current_period_end * 1000) : (existing.currentPeriodEnd ? new Date(existing.currentPeriodEnd) : null)
    const payload = {
      subscription: {
        ...existing,
        stripeSubId: subId || existing.stripeSubId,
        status: (stripeResult.cancel_at_period_end ? 'active' : (stripeResult.status || 'canceled')), // stay active until end
        cancelAtPeriodEnd: !!stripeResult.cancel_at_period_end,
        currentPeriodEnd: currentPeriodEnd || existing.currentPeriodEnd || null,
        plan: existing.plan || 'premium',
      },
      updatedAt: now,
    }

    // If we immediately deleted, mark as free; otherwise keep premium until period end
    if (!stripeResult.cancel_at_period_end && (stripeResult.status === 'canceled' || stripeResult.source === 'stripe.del')) {
      payload.plan = 'free'
      payload.role = 'free'
    }

    await ref.set(payload, { merge: true })

    return res.json({ status: payload.subscription.status, subscription: stripeResult })
  } catch (err) {
    console.error('Cancel error:', err)
    res.status(500).json({ error: 'Failed to cancel subscription' })
  }
})
