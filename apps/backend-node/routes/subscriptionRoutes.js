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
const APPLE_SOLO_PRODUCT_ID =
  String(process.env.APPLE_SOLO_PREMIUM_PRODUCT_ID || 'solo_premium_monthly').trim() ||
  'solo_premium_monthly'
const PREMIUM_ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'in_grace_period'])
const PREMIUM_CANCELLED_STATUSES = new Set(['canceled', 'cancelled'])

function normalizeProductId(value) {
  const raw = String(value || '').trim()
  return raw || null
}

function normalizeSubscriptionStatusValue(value, fallback = 'free') {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return fallback
  if (raw === 'subscribed') return 'active'
  if (raw === 'billing_retry' || raw === 'in_billing_retry_period') return 'in_grace_period'
  if (raw === 'grace' || raw === 'grace_period' || raw === 'in_grace' || raw === 'in_grace_period') {
    return 'in_grace_period'
  }
  if (raw === 'revoked' || raw === 'cancelled') return 'cancelled'
  return raw
}

function inferSubscriptionSource(sub = {}) {
  const explicit = String(sub?.source || '').trim().toLowerCase()
  if (explicit) return explicit
  if (sub?.originalTransactionId || sub?.productId === APPLE_SOLO_PRODUCT_ID) return 'apple'
  if (sub?.stripeSubId || sub?.customerId || sub?.id) return 'stripe'
  return null
}

function calculateRemainingDays(expiresAt) {
  if (!expiresAt) return 0
  const diffMs = expiresAt.getTime() - Date.now()
  if (diffMs <= 0) return 0
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

function resolveEffectiveSubscriptionStatus(sub = {}) {
  const expiresAt = normalizeDate(sub?.expiresAt || sub?.currentPeriodEnd)
  let status = normalizeSubscriptionStatusValue(
    sub?.status,
    expiresAt && expiresAt.getTime() > Date.now() ? 'active' : 'free',
  )

  if (status === 'free' && expiresAt && expiresAt.getTime() > Date.now()) {
    status = 'active'
  }

  if (PREMIUM_ACTIVE_STATUSES.has(status) && expiresAt && expiresAt.getTime() <= Date.now()) {
    status = 'expired'
  }

  if (PREMIUM_CANCELLED_STATUSES.has(status) && expiresAt && expiresAt.getTime() <= Date.now()) {
    status = 'expired'
  }

  return {
    status,
    expiresAt,
  }
}

function isPremiumSubscriptionStatus(status, expiresAt) {
  if (PREMIUM_ACTIVE_STATUSES.has(status)) return true
  if (PREMIUM_CANCELLED_STATUSES.has(status)) {
    return !!expiresAt && expiresAt.getTime() > Date.now()
  }
  return false
}

function buildNormalizedSubscription(sub = {}) {
  const source = inferSubscriptionSource(sub)
  const { status, expiresAt } = resolveEffectiveSubscriptionStatus(sub)
  let cancelAt = normalizeDate(sub?.cancelAt)
  if (!cancelAt && sub?.cancelAtPeriodEnd && expiresAt) {
    cancelAt = expiresAt
  }

  const plan = isPremiumSubscriptionStatus(status, expiresAt) ? 'premium' : 'free'

  return {
    plan,
    status,
    cancelAt: cancelAt ? cancelAt.toISOString() : null,
    remainingDays: calculateRemainingDays(expiresAt),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    source: source || (plan === 'premium' ? 'stripe' : null),
    productId: normalizeProductId(sub?.productId),
    originalTransactionId: sub?.originalTransactionId == null ? null : String(sub.originalTransactionId),
  }
}

function buildAppleSubscriptionWrite(existingSubscription = {}, input = {}) {
  const productId = normalizeProductId(input?.productId)
  const expiresAt = normalizeDate(input?.expiresAt)
  const purchaseDate = normalizeDate(input?.purchaseDate)
  const revocationDate = normalizeDate(input?.revocationDate)
  const originalTransactionId =
    input?.originalTransactionId == null ? null : String(input.originalTransactionId)
  const transactionId = input?.transactionId == null ? null : String(input.transactionId)
  const rawStatus = String(input?.rawStatus || '').trim().toLowerCase() || null

  let status = normalizeSubscriptionStatusValue(
    input?.status,
    expiresAt && expiresAt.getTime() > Date.now() ? 'active' : 'expired',
  )
  if (revocationDate) status = 'cancelled'

  if (PREMIUM_ACTIVE_STATUSES.has(status) && expiresAt && expiresAt.getTime() <= Date.now()) {
    status = 'expired'
  }
  if (PREMIUM_CANCELLED_STATUSES.has(status) && expiresAt && expiresAt.getTime() <= Date.now()) {
    status = 'expired'
  }

  const cancelAtPeriodEnd = PREMIUM_CANCELLED_STATUSES.has(status)
  const cancelAt = cancelAtPeriodEnd
    ? normalizeDate(input?.cancelAt) || expiresAt || revocationDate || null
    : null

  const appleDetails = existingSubscription?.apple && typeof existingSubscription.apple === 'object'
    ? existingSubscription.apple
    : {}

  const subscription = {
    ...existingSubscription,
    source: 'apple',
    productId,
    status,
    expiresAt,
    currentPeriodEnd: expiresAt,
    cancelAt,
    cancelAtPeriodEnd,
    purchaseDate,
    revocationDate,
    originalTransactionId,
    transactionId,
    ownershipType: input?.ownershipType ? String(input.ownershipType) : null,
    apple: {
      ...appleDetails,
      rawStatus,
      origin: input?.origin ? String(input.origin) : null,
      lastIngestedAt: new Date(),
    },
  }

  const normalized = buildNormalizedSubscription(subscription)
  return {
    plan: normalized.plan,
    subscription,
    normalized,
  }
}

// GET /api/subscription/status?userId=123
router.get('/subscription/status', async (req, res) => {
  try {
    const userId = String(req.query.userId || req?.user?.uid || '')
    if (!userId) {
      return res.json({
        plan: 'free',
        status: 'free',
        remainingDays: 0,
        cancelAt: null,
        expiresAt: null,
        source: null,
        productId: null,
        originalTransactionId: null,
      })
    }
    const snap = await db.collection('users').doc(userId).get()
    const data = snap.exists ? snap.data() : {}
    return res.json(buildNormalizedSubscription(data?.subscription || {}))
  } catch (err) {
    console.error('subscription/status error', err)
    res.status(200).json({
      plan: 'free',
      status: 'free',
      remainingDays: 0,
      cancelAt: null,
      expiresAt: null,
      source: null,
      productId: null,
      originalTransactionId: null,
    })
  }
})

router.post('/subscription/apple/ingest', async (req, res) => {
  try {
    const userId = String(req.body?.userId || req?.user?.uid || '')
    const productId = normalizeProductId(req.body?.productId)
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    if (!productId) return res.status(400).json({ error: 'Missing productId' })
    if (productId !== APPLE_SOLO_PRODUCT_ID) {
      return res.status(400).json({ error: 'Unexpected Apple product ID' })
    }

    const originalTransactionId = req.body?.originalTransactionId
    if (originalTransactionId == null || String(originalTransactionId).trim() === '') {
      return res.status(400).json({ error: 'Missing originalTransactionId' })
    }

    console.info('[AppleIAP] ingest request', {
      userId,
      productId,
      status: req.body?.status || null,
      expiresAt: req.body?.expiresAt || null,
      originalTransactionId: String(originalTransactionId),
      origin: req.body?.origin || null,
    })

    const userRef = db.collection('users').doc(userId)
    const snap = await userRef.get()
    const userData = snap.exists ? (snap.data() || {}) : {}
    const existingSubscription = userData?.subscription || {}
    const next = buildAppleSubscriptionWrite(existingSubscription, req.body || {})

    await userRef.set(
      {
        plan: next.plan,
        subscription: next.subscription,
        updatedAt: new Date(),
      },
      { merge: true },
    )

    console.info('[AppleIAP] ingest stored', {
      userId,
      plan: next.plan,
      status: next.normalized.status,
      source: next.normalized.source,
      productId: next.normalized.productId,
      expiresAt: next.normalized.expiresAt,
      originalTransactionId: next.normalized.originalTransactionId,
    })

    return res.json({
      plan: next.plan,
      subscription: next.normalized,
    })
  } catch (error) {
    console.error('[AppleIAP] ingest failed', {
      message: error?.message || String(error),
      code: error?.code || null,
      stack: error?.stack || null,
    })
    return res.status(500).json({ error: 'Failed to ingest Apple subscription' })
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
