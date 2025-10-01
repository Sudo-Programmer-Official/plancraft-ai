import express from 'express'
import { db } from '../services/firebaseAdmin.js'

const router = express.Router()

// GET /api/subscription/status?userId=123
router.get('/subscription/status', async (req, res) => {
  try {
    const userId = String(req.query.userId || '')
    if (!userId) return res.json({ plan: 'free', remainingDays: 0 })
    const snap = await db.collection('users').doc(userId).get()
    const data = snap.exists ? snap.data() : {}
    const sub = data?.subscription || {}
    const status = String(sub.status || '').toLowerCase()
    const plan = status === 'active' ? (sub.plan || 'premium') : 'free'
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
