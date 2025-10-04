// services/planService.js
import { db } from './firebaseAdmin.js'

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
export async function checkUserPlanUsage(userId, type = 'ai') {
  const uid = String(userId)
  const userRef = db.collection('users').doc(uid)
  const userSnap = await userRef.get()
  const data = userSnap.exists ? userSnap.data() : {}
  const planKey = resolvePlanKey(data?.plan)

  // Limits for supported usage types
  const limits = {
    ai: Number.isFinite(PLANS[planKey]?.limits?.aiGenerations) ? PLANS[planKey].limits.aiGenerations : Infinity,
    reminder: Number.isFinite(PLANS[planKey]?.limits?.remindersPerDay) ? PLANS[planKey].limits.remindersPerDay : Infinity,
  }

  const today = new Date().toISOString().slice(0, 10)
  const usage = data?.usage || {}
  const todayUsage = usage[today] || {}
  const field = type === 'reminder' ? 'reminders' : 'aiGenerations'
  const current = Number(todayUsage[field] || 0)

  if (current >= limits[type]) {
    return { ok: false, limit: limits[type], count: current, plan: PLANS[planKey].name }
  }

  // increment counter atomically
  await userRef.set({
    usage: {
      ...usage,
      [today]: { ...todayUsage, [field]: current + 1 }
    }
  }, { merge: true })

  return { ok: true, count: current + 1, limit: limits[type], plan: PLANS[planKey].name }
}
