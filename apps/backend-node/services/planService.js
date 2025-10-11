// services/planService.js
import { db } from './firebaseAdmin.js'
import dayjs from 'dayjs'

export const PLANS = {
  FREE: {
    name: 'Free',
    limits: { remindersPerDay: 3, tasksPerDay: 5, aiGenerations: 10 },
  },
  PREMIUM: {
    name: 'Pro',
    limits: { remindersPerDay: Infinity, tasksPerDay: Infinity, aiGenerations: Infinity },
  },
}

function resolvePlanKey(planStr) {
  return String(planStr || '').toLowerCase() === 'premium' ? 'PREMIUM' : 'FREE'
}

async function getDailyUsage(userId) {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const q = await db
      .collection('reminders')
      .where('userId', '==', String(userId))
      .where('createdAt', '>=', start)
      .get()
    const remindersToday = q.size || 0
    return { remindersToday, tasksToday: 0, aiGenerationsToday: 0 }
  } catch (e) {
    return { remindersToday: 0, tasksToday: 0, aiGenerationsToday: 0 }
  }
}

export async function checkUserPlan(userId) {
  const snap = await db.collection('users').doc(String(userId)).get()
  const data = snap.exists ? snap.data() : {}
  const key = resolvePlanKey(data?.plan)
  const limits = PLANS[key].limits
  const usage = await getDailyUsage(userId)
  return { key, name: PLANS[key].name, limits, usage }
}

// Check and increment per-day usage counters for specific actions
// type: currently supports 'ai' (aiGenerations) and 'reminder'
// export async function checkUserPlanUsage(userId, type = 'ai') {
//   const uid = String(userId)
//   const userRef = db.collection('users').doc(uid)
//   const userSnap = await userRef.get()
//   const data = userSnap.exists ? userSnap.data() : {}
//   const planKey = resolvePlanKey(data?.plan)

//   // Limits for supported usage types
//   const limits = {
//     ai: Number.isFinite(PLANS[planKey]?.limits?.aiGenerations) ? PLANS[planKey].limits.aiGenerations : Infinity,
//     reminder: Number.isFinite(PLANS[planKey]?.limits?.remindersPerDay) ? PLANS[planKey].limits.remindersPerDay : Infinity,
//   }

//   const today = new Date().toISOString().slice(0, 10)
//   const usage = data?.usage || {}
//   const todayUsage = usage[today] || {}
//   const field = type === 'reminder' ? 'reminders' : 'aiGenerations'
//   const current = Number(todayUsage[field] || 0)

//   if (current >= limits[type]) {
//     return { ok: false, limit: limits[type], count: current, plan: PLANS[planKey].name }
//   }

//   // increment counter atomically
//   await userRef.set({
//     usage: {
//       ...usage,
//       [today]: { ...todayUsage, [field]: current + 1 }
//     }
//   }, { merge: true })

//   return { ok: true, count: current + 1, limit: limits[type], plan: PLANS[planKey].name }
// }

// Internal helper to fetch a user's plan. Defaults to 'free' when missing.
async function _getUserPlan(userId) {
  try {
    const snap = await db.collection('users').doc(String(userId)).get()
    const plan = snap.exists ? (snap.data()?.plan || 'free') : 'free'
    return String(plan || 'free').toLowerCase()
  } catch {
    return 'free'
  }
}

// Tracks and enforces daily per-feature usage with a soft warning for free users.
export async function checkUserPlanUsage(userId, feature) {
  const uid = String(userId || '')
  if (!uid) return { ok: false, used: 0, limit: 0 }

  const plan = await _getUserPlan(uid)
  const todayKey = dayjs().format('YYYY-MM-DD')
  const docId = `${uid}_${todayKey}`
  const docRef = db.collection('usage').doc(docId)
  const snap = await docRef.get()
  const data = snap.exists ? (snap.data() || {}) : {}

  const key = String(feature || 'reminder')
  const used = Number(data[key] || 0)
  const limit = plan === 'pro' ? 9999 : 5

  // Under limit: increment and allow
  if (used < limit) {
    await docRef.set({ ...data, [key]: used + 1, updatedAt: new Date() }, { merge: true })
    return { ok: true, used: used + 1, limit, plan }
  }

  // At limit on free: soft warning (allow once but do not increment)
  if (plan === 'free' && used === limit) {
    return { ok: false, softWarning: true, used, limit, plan }
  }

  // Over limit or non-free overflow: block
  return { ok: false, used, limit, plan }
}

// Express middleware for reminders route; sets header on soft warning or blocks on hard limit.
export async function planUsageMiddleware(req, res, next) {
  try {
    const userId = req?.body?.userId || req?.query?.userId || req?.params?.userId
    const result = await checkUserPlanUsage(userId, 'reminder')
    if (result.ok) return next()
    if (result.softWarning) {
      try { res.setHeader('X-Plan-Warning', 'You have reached your free reminder limit for today.') } catch {}
      return next()
    }
    return res.status(403).json({ success: false, error: 'Daily reminder limit reached. Upgrade to Pro for unlimited reminders 🚀' })
  } catch (e) {
    // On error, do not block the user — be graceful
    try { console.warn('[Plan] planUsageMiddleware error', e?.message || e) } catch {}
    return next()
  }
}

// Non-mutating usage peek for UI: returns today's used count and limit
export async function getUsageToday(userId, feature = 'reminder') {
  const uid = String(userId || '')
  if (!uid) return { used: 0, limit: 0, plan: 'free', date: dayjs().format('YYYY-MM-DD') }

  const plan = await _getUserPlan(uid)
  const todayKey = dayjs().format('YYYY-MM-DD')
  const docId = `${uid}_${todayKey}`
  const snap = await db.collection('usage').doc(docId).get()
  const data = snap.exists ? (snap.data() || {}) : {}
  const used = Number(data[String(feature)] || 0)
  const limit = plan === 'pro' ? 9999 : 5
  return { used, limit, plan, date: todayKey }
}
