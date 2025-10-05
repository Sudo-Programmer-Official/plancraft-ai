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
    // Normalize: any active subscription counts as premium for UI gating
    const plan = status === 'active' ? 'premium' : 'free'
    let remainingDays = 0
    try {
      const end = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
      if (end) {
        const diffMs = end.getTime() - Date.now()
        remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
      }
    } catch {}
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

    const snap = await db.collection('users').doc(String(userId)).get()
    if (!snap.exists) return res.status(404).json({ error: 'User not found' })
    const data = snap.data() || {}
    const subId = data?.subscription?.stripeSubId || data?.subscription?.id

    if (!subId) return res.status(400).json({ error: 'No active subscription found' })

    // If Stripe configured, cancel in Stripe (immediate)
    let result = { id: subId, status: 'canceled', source: 'local' }
    if (stripe) {
      try {
        result = await stripe.subscriptions.del(subId)
      } catch (err) {
        console.error('❌ Stripe cancel failed:', err?.message || err)
        return res.status(500).json({ error: 'Stripe cancel failed' })
      }
    }

    // Update Firestore immediately; webhook will also sync in real env
    await db.collection('users').doc(String(userId)).set(
      {
        plan: 'free',
        role: 'free',
        subscription: {
          ...(data.subscription || {}),
          status: 'canceled',
          plan: 'free',
        },
        updatedAt: new Date(),
      },
      { merge: true }
    )

    return res.json({ status: 'canceled', subscription: result })
  } catch (err) {
    console.error('Cancel error:', err)
    res.status(500).json({ error: 'Failed to cancel subscription' })
  }
})
