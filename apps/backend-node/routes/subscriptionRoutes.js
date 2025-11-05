// import express from 'express'
// import Stripe from 'stripe'
// import { db } from '../services/firebaseAdmin.js'

// const router = express.Router()

// // Optional Stripe client (dev-friendly if missing)
// const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
// const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' }) : null

// // GET /api/subscription/status?userId=123
// router.get('/subscription/status', async (req, res) => {
//   try {
//     const userId = String(req.query.userId || '')
//     if (!userId) return res.json({ plan: 'free', remainingDays: 0 })
//     const snap = await db.collection('users').doc(userId).get()
//     const data = snap.exists ? snap.data() : {}
//     const sub = data?.subscription || {}
//     const status = String(sub.status || '').toLowerCase()
//     // Normalize: any active subscription counts as premium for UI gating
//     const plan = status === 'active' ? 'premium' : 'free'
//     let remainingDays = 0
//     try {
//       const end = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
//       if (end) {
//         const diffMs = end.getTime() - Date.now()
//         remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
//       }
//     } catch {}
//     return res.json({ plan, remainingDays })
//   } catch (err) {
//     console.error('subscription/status error', err)
//     res.status(200).json({ plan: 'free', remainingDays: 0 })
//   }
// })

// // POST /api/subscription/checkout
// router.post('/subscription/checkout', async (req, res) => {
//   try {
//     const { userId, priceId, successUrl, cancelUrl } = req.body || {}
//     if (!userId || !priceId) {
//       return res.status(400).json({ error: 'Missing userId or priceId' })
//     }

//     // In a real app, create a Stripe Checkout Session here.
//     // For development/demo, redirect to provided successUrl or configured URL.
//     const demoUrl = process.env.STRIPE_CHECKOUT_URL || successUrl || '/subscription?status=success'
//     return res.json({ url: demoUrl })
//   } catch (err) {
//     console.error('subscription/checkout error', err)
//     res.status(500).json({ error: 'Checkout initialization failed' })
//   }
// })

// export default router

// // POST /api/subscription/cancel
// router.post('/subscription/cancel', async (req, res) => {
//   try {
//     const { userId } = req.body || {}
//     if (!userId) return res.status(400).json({ error: 'Missing userId' })

//     const snap = await db.collection('users').doc(String(userId)).get()
//     if (!snap.exists) return res.status(404).json({ error: 'User not found' })
//     const data = snap.data() || {}
//     const subId = data?.subscription?.stripeSubId || data?.subscription?.id

//     if (!subId) return res.status(400).json({ error: 'No active subscription found' })
//     console.log('[Canceling Stripe Sub]', { subId, userId })
//     if (typeof subId !== 'string' || !subId.startsWith('sub_')) {
//       console.warn('[Cancel] Invalid subscription id format', { subId, userId })
//       return res.status(400).json({ error: 'Invalid subscription ID format' })
//     }

//     // If Stripe configured, prefer graceful cancel then fallback to immediate
//     let result = { id: subId, status: 'canceled', source: 'local' }
//     if (stripe) {
//       try {
//         // Schedule cancel at period end
//         try {
//           const updated = await stripe.subscriptions.update(subId, { cancel_at_period_end: true })
//           result = {
//             id: updated.id,
//             status: updated.status,
//             cancel_at_period_end: updated.cancel_at_period_end,
//             current_period_end: updated.current_period_end,
//             source: 'stripe.update'
//           }
//         } catch (e1) {
//           console.warn('⚠️ Stripe schedule cancel failed; attempting immediate cancel', {
//             message: e1?.message,
//             type: e1?.type,
//             code: e1?.code,
//             requestId: e1?.requestId,
//           })
//           // Immediate cancel (Stripe v12+: cancel; fallback to del for older SDKs)
//           const canceled = await (stripe.subscriptions.cancel
//             ? stripe.subscriptions.cancel(subId)
//             : stripe.subscriptions.del(subId))
//           result = { id: canceled.id, status: canceled.status, source: 'stripe.cancel' }
//         }
//       } catch (err) {
//         console.error('❌ Stripe cancel failed:', {
//           message: err?.message,
//           type: err?.type,
//           code: err?.code,
//           param: err?.param,
//           requestId: err?.requestId,
//           stack: err?.stack,
//           subId,
//           userId,
//         })
//         return res.status(500).json({ error: 'Stripe cancel failed', details: err?.message })
//       }
//     }

//     // Update Firestore: keep active until period end if scheduled; otherwise mark free
//     const payload = { subscription: { ...(data.subscription || {}) }, updatedAt: new Date() }
//     if (result.cancel_at_period_end) {
//       payload.subscription.status = 'active'
//       payload.subscription.cancelAtPeriodEnd = true
//       payload.subscription.currentPeriodEnd = result.current_period_end
//     } else if (result.status === 'canceled') {
//       payload.subscription.status = 'canceled'
//       payload.subscription.plan = 'free'
//       payload['plan'] = 'free'
//       payload['role'] = 'free'
//     }
//     await db.collection('users').doc(String(userId)).set(payload, { merge: true })

//     return res.json({ status: payload.subscription.status, subscription: result })
//   } catch (err) {
//     console.error('Cancel error:', err)
//     res.status(500).json({ error: 'Failed to cancel subscription' })
//   }
// })

import express from 'express'
import pushRoutes from './pushRoutes.js'
import Stripe from 'stripe'
import { db } from '../services/firebaseAdmin.js'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import { normalizeDate } from '../utils/time.js'

const router = express.Router()
router.use(requireAuth, ensureUserMatches)

// Mount push subscription routes under /push so
// app.use('/api', router) yields /api/push/* endpoints.
router.use('/push', pushRoutes)

// Optional Stripe client (dev-friendly if missing)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' }) : null

// GET /api/subscription/status?userId=123
router.get('/subscription/status', async (req, res) => {
  try {
    const userId = String(req.query.userId || req?.user?.uid || '')
    if (!userId) return res.json({ plan: 'free', status: 'free', remainingDays: 0 })
    const snap = await db.collection('users').doc(userId).get()
    const data = snap.exists ? snap.data() : {}
    const sub = data?.subscription || {}
    const rawStatus = String(sub.status || '').toLowerCase()
    const status = rawStatus || 'free'
    // Treat 'canceled' (scheduled at period end) as premium until end date
    const plan = (status === 'active' || status === 'trialing' || status === 'past_due' || status === 'canceled') ? 'premium' : 'free'

    let remainingDays = 0
    let cancelAt = normalizeDate(sub?.cancelAt)
    try {
      const end = normalizeDate(sub?.currentPeriodEnd)
      if (end) {
        const diffMs = end.getTime() - Date.now()
        remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
        // If cancelAt not explicitly set but a period end exists and cancel is scheduled, reflect it
        if (sub?.cancelAtPeriodEnd && !cancelAt) cancelAt = end
      }
    } catch {}
    return res.json({
      plan,
      status,
      cancelAt: cancelAt ? cancelAt.toISOString() : null,
      remainingDays,
    })
  } catch (err) {
    console.error('subscription/status error', err)
    res.status(200).json({ plan: 'free', status: 'free', remainingDays: 0 })
  }
})

// POST /api/subscription/checkout
router.post('/subscription/checkout', async (req, res) => {
  try {
    const { userId: bodyUserId, priceId, successUrl, cancelUrl } = req.body || {}
    const userId = String(bodyUserId || req?.user?.uid || '')
    if (!userId || !priceId) {
      return res.status(400).json({ error: 'Missing userId or priceId' })
    }

    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || 'https://plancraftai.com/subscription?status=success',
      cancel_url: cancelUrl || 'https://plancraftai.com/subscription?status=cancel',
      metadata: { userId },
    })

    return res.json({ url: session.url })
  } catch (err) {
    console.error('subscription/checkout error', err)
    res.status(500).json({ error: 'Checkout initialization failed' })
  }
})

// POST /api/subscription/cancel
router.post('/subscription/cancel', async (req, res) => {
  try {
    const userId = String((req.body && req.body.userId) || req?.user?.uid || '')
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const snap = await db.collection('users').doc(String(userId)).get()
    if (!snap.exists) return res.status(404).json({ error: 'User not found' })
    const data = snap.data() || {}
    const subId = data?.subscription?.stripeSubId || data?.subscription?.id

    if (!subId) return res.status(400).json({ error: 'No active subscription found' })
    console.log('[Canceling Stripe Sub]', { subId, userId })
    if (typeof subId !== 'string' || !subId.startsWith('sub_')) {
      console.warn('[Cancel] Invalid subscription id format', { subId, userId })
      return res.status(400).json({ error: 'Invalid subscription ID format' })
    }

    let result = { id: subId, status: 'canceled', source: 'local' }
    if (stripe) {
      try {
        try {
          const updated = await stripe.subscriptions.update(subId, { cancel_at_period_end: true })
          result = {
            id: updated.id,
            status: updated.status,
            cancel_at_period_end: updated.cancel_at_period_end,
            current_period_end: updated.current_period_end,
            source: 'stripe.update'
          }
        } catch (e1) {
          console.warn('⚠️ Stripe schedule cancel failed; attempting immediate cancel', {
            message: e1?.message,
            type: e1?.type,
            code: e1?.code,
            requestId: e1?.requestId,
          })
          const canceled = await stripe.subscriptions.del(subId)
          result = { id: canceled.id, status: canceled.status, source: 'stripe.cancel' }
        }
      } catch (err) {
        console.error('❌ Stripe cancel failed:', {
          message: err?.message,
          type: err?.type,
          code: err?.code,
          param: err?.param,
          requestId: err?.requestId,
          stack: err?.stack,
          subId,
          userId,
        })
        return res.status(500).json({ error: 'Stripe cancel failed', details: err?.message })
      }
    }

    const payload = { subscription: { ...(data.subscription || {}) }, updatedAt: new Date() }
    if (result.cancel_at_period_end) {
      payload.subscription.status = 'active'
      payload.subscription.cancelAtPeriodEnd = true
      // Stripe returns seconds epoch; convert to Date
      payload.subscription.currentPeriodEnd = result.current_period_end ? new Date(result.current_period_end * 1000) : null
      payload.subscription.cancelAt = payload.subscription.currentPeriodEnd
    } else if (result.status === 'canceled') {
      payload.subscription.status = 'canceled'
      payload.subscription.plan = 'free'
      payload['plan'] = 'free'
    }
    await db.collection('users').doc(String(userId)).set(payload, { merge: true })

    return res.json({ status: payload.subscription.status, subscription: result })
  } catch (err) {
    console.error('Cancel error:', err)
    res.status(500).json({ error: 'Failed to cancel subscription' })
  }
})

const PLAN_ALIAS = {
  pro: 'MONTHLY',
  premium: 'MONTHLY',
  monthly: 'MONTHLY',
  month: 'MONTHLY',
  year: 'YEARLY',
  yearly: 'YEARLY',
  annual: 'YEARLY',
  annually: 'YEARLY',
}

function resolvePlanKey(rawPlan = '') {
  const value = String(rawPlan || '').toLowerCase()
  if (!value) return 'MONTHLY'
  const key = PLAN_ALIAS[value]
  if (key) return key
  if (value.includes('year')) return 'YEARLY'
  return 'MONTHLY'
}

function resolveStripePriceId(planKey) {
  const suffix = resolvePlanKey(planKey)
  const envKey = `STRIPE_${suffix}_PRICE_ID`
  return process.env[envKey] || process.env.STRIPE_MONTHLY_PRICE_ID || null
}

router.post('/subscription/reactivate', async (req, res) => {
  try {
    const { userId: bodyUserId, uid, successUrl, cancelUrl } = req.body || {}
    const userId = String(bodyUserId || uid || req?.user?.uid || '')
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const snap = await db.collection('users').doc(userId).get()
    if (!snap.exists) return res.status(404).json({ error: 'User not found' })

    const data = snap.data() || {}
    const sub = data.subscription || {}
    const subId = sub?.stripeSubId || sub?.id

    const successRedirect =
      successUrl ||
      process.env.STRIPE_REACTIVATE_SUCCESS_URL ||
      'https://plancraftai.com/subscription?reactivated=1'
    const cancelRedirect =
      cancelUrl ||
      process.env.STRIPE_REACTIVATE_CANCEL_URL ||
      'https://plancraftai.com/subscription?reactivate=cancel'

    const planValue = data.plan && data.plan !== 'free' ? data.plan : 'premium'
    const planKey = resolvePlanKey(sub?.plan || planValue)
    const priceId = resolveStripePriceId(planKey)

    const isTerminated = String(sub?.status || '').toLowerCase() === 'canceled' && !sub?.cancelAtPeriodEnd

    if (!stripe) {
      if (!subId) {
        console.warn('[Reactivate] Stripe disabled and no subscription ID; marking premium locally', { userId })
      }
      const payload = {
        plan: planValue,
        subscription: {
          ...sub,
          status: 'active',
          cancelAt: null,
          cancelAtPeriodEnd: false,
        },
        updatedAt: new Date(),
      }
      await db.collection('users').doc(userId).set(payload, { merge: true })
      return res.json({ url: successRedirect, restored: true })
    }

    if (!priceId) {
      console.error('❌ Reactivate failed: missing Stripe price ID', { planKey })
      return res.status(500).json({ error: 'Stripe price not configured' })
    }

    if (!subId || isTerminated) {
      try {
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: successRedirect,
          cancel_url: cancelRedirect,
          metadata: { userId, action: 'reactivate', plan: planKey },
        })
        return res.json({ url: session.url, resumedViaCheckout: true })
      } catch (err) {
        console.error('❌ Stripe checkout (reactivate) failed:', {
          message: err?.message,
          type: err?.type,
          code: err?.code,
          requestId: err?.requestId,
          userId,
        })
        const status = err?.statusCode || err?.status || 500
        return res.status(status).json({ error: err?.message || 'Reactivate checkout failed' })
      }
    }

    let result
    try {
      result = await stripe.subscriptions.update(String(subId), { cancel_at_period_end: false })
    } catch (err) {
      const message = err?.message || 'Stripe reactivate failed'
      const canRetryViaCheckout = /only update its cancellation_details/i.test(message)
      if (canRetryViaCheckout) {
        try {
          const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successRedirect,
            cancel_url: cancelRedirect,
            metadata: { userId, action: 'reactivate', plan: planKey, fallback: 'checkout' },
          })
          return res.json({ url: session.url, resumedViaCheckout: true })
        } catch (checkoutErr) {
          console.error('❌ Stripe checkout fallback failed:', {
            message: checkoutErr?.message,
            type: checkoutErr?.type,
            code: checkoutErr?.code,
            requestId: checkoutErr?.requestId,
            userId,
          })
          const status = checkoutErr?.statusCode || checkoutErr?.status || 500
          return res.status(status).json({ error: checkoutErr?.message || 'Reactivate checkout failed' })
        }
      }

      console.error('❌ Stripe reactivate failed:', {
        message,
        type: err?.type,
        code: err?.code,
        requestId: err?.requestId,
        subId,
        userId,
      })
      const status = err?.statusCode || err?.status || 500
      return res.status(status).json({ error: message })
    }

    const currentPeriodEnd = result?.current_period_end
      ? new Date(result.current_period_end * 1000)
      : normalizeDate(sub?.currentPeriodEnd)

    const payload = {
      plan: planValue,
      subscription: {
        ...sub,
        plan: planValue,
        status: (result?.status === 'active' || result?.status === 'trialing') ? 'active' : result?.status,
        cancelAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodEnd,
        stripeSubId: result?.id || sub?.stripeSubId || subId,
        customerId: result?.customer || sub?.customerId || null,
      },
      updatedAt: new Date(),
    }

    await db.collection('users').doc(userId).set(payload, { merge: true })

    return res.json({ url: successRedirect })
  } catch (err) {
    console.error('Reactivate error:', err)
    res.status(500).json({ error: 'Failed to reactivate subscription' })
  }
})

export default router
