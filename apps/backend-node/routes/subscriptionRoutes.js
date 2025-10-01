import express from 'express'

const router = express.Router()

// GET /api/subscription/status?userId=123
router.get('/subscription/status', async (req, res) => {
  try {
    const userId = String(req.query.userId || '')
    // Simple demo: mark some users as premium via env list
    const premiumIds = (process.env.FAKE_PREMIUM_USER_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const isPremium = premiumIds.includes(userId)
    return res.json({
      plan: isPremium ? 'premium' : 'free',
      remainingDays: isPremium ? 27 : 0,
    })
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

