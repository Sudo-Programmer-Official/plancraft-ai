import dayjs from '../utils/dayjs.js'
import { db } from './firebaseAdmin.js'
import { getEffectiveAccess } from './planService.js'

const DEFAULT_FREE_MONTHLY_LIMIT = 5
const DEFAULT_PREMIUM_MONTHLY_LIMIT = 30

function positiveLimit(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function nonNegativeLimit(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback
}

function accessResult(access) {
  const premium = access?.isPremium === true
  const freeLimit = nonNegativeLimit(
    process.env.INTELLIGENCE_FREE_REQUESTS_PER_MONTH,
    DEFAULT_FREE_MONTHLY_LIMIT,
  )
  const premiumLimit = positiveLimit(
    process.env.INTELLIGENCE_PREMIUM_REQUESTS_PER_MONTH,
    DEFAULT_PREMIUM_MONTHLY_LIMIT,
  )
  const limit = premium ? premiumLimit : freeLimit
  return {
    ok: premium || freeLimit > 0,
    premium,
    plan: access?.effectivePlan || 'free',
    limit,
    freeLimit,
    premiumLimit,
    period: 'month',
    dateKey: dayjs().format('YYYY-MM'),
    access,
  }
}

async function readIntelligenceUsage(userId, dateKey) {
  const ref = db.collection('usage').doc(`${userId}_${dateKey}`)
  const snap = await ref.get()
  const used = Number(snap.exists ? snap.data()?.intelligenceBrief || 0 : 0)
  return Math.max(0, used)
}

export async function getIntelligenceAccess(userId) {
  const uid = String(userId || '').trim()
  if (!uid) return {
    ok: false,
    premium: false,
    plan: 'free',
    limit: 0,
    used: 0,
    remaining: 0,
    dateKey: null,
    access: null,
  }
  const eligibility = accessResult(await getEffectiveAccess(uid))
  const used = await readIntelligenceUsage(uid, eligibility.dateKey)
  return {
    ...eligibility,
    used,
    remaining: Math.max(eligibility.limit - used, 0),
  }
}

export async function reserveIntelligenceRequest(userId, options = {}) {
  const uid = String(userId || '').trim()
  if (!uid) return { ok: false, code: 'unauthorized', used: 0, limit: 0 }

  const eligibility = options.access ? accessResult(options.access) : await getIntelligenceAccess(uid)
  if (!eligibility.ok) {
    return {
      ok: false,
      code: 'intelligence_free_access_disabled',
      used: 0,
      limit: eligibility.limit,
      plan: eligibility.plan,
    }
  }

  const dateKey = eligibility.dateKey || dayjs().format('YYYY-MM-DD')
  const ref = db.collection('usage').doc(`${uid}_${dateKey}`)
  let result = null

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref)
    const data = snap.exists ? snap.data() || {} : {}
    const used = Number(data.intelligenceBrief || 0)

    if (used >= eligibility.limit) {
      result = {
        ok: false,
        code: 'intelligence_monthly_limit_reached',
        used,
        limit: eligibility.limit,
        remaining: 0,
        plan: eligibility.plan,
      }
      return
    }

    const nextUsed = used + 1
    transaction.set(
      ref,
      { intelligenceBrief: nextUsed, updatedAt: new Date() },
      { merge: true },
    )
    result = {
      ok: true,
      used: nextUsed,
      limit: eligibility.limit,
      remaining: Math.max(eligibility.limit - nextUsed, 0),
      plan: eligibility.plan,
    }
  })

  return result || {
    ok: false,
    code: 'intelligence_usage_unavailable',
    used: 0,
    limit: eligibility.limit,
    plan: eligibility.plan,
  }
}

