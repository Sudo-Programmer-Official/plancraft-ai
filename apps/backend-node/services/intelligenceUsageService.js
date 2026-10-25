import dayjs from '../utils/dayjs.js'
import { db } from './firebaseAdmin.js'
import { getEffectiveAccess } from './planService.js'

const DEFAULT_MONTHLY_LIMIT = 30

function positiveLimit(value, fallback = DEFAULT_MONTHLY_LIMIT) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function accessResult(access) {
  const limit = positiveLimit(process.env.INTELLIGENCE_PREMIUM_REQUESTS_PER_MONTH)
  const premium = access?.isPremium === true
  return {
    ok: premium,
    premium,
    plan: access?.effectivePlan || 'free',
    limit,
    period: 'month',
    dateKey: dayjs().format('YYYY-MM'),
    access,
  }
}

export async function getIntelligenceAccess(userId) {
  const uid = String(userId || '').trim()
  if (!uid) return { ok: false, premium: false, plan: 'free', limit: 0, dateKey: null, access: null }
  return accessResult(await getEffectiveAccess(uid))
}

export async function reserveIntelligenceRequest(userId, options = {}) {
  const uid = String(userId || '').trim()
  if (!uid) return { ok: false, code: 'unauthorized', used: 0, limit: 0 }

  const eligibility = options.access ? accessResult(options.access) : await getIntelligenceAccess(uid)
  if (!eligibility.ok) {
    return {
      ok: false,
      code: 'intelligence_premium_required',
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

