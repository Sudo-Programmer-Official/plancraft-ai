// src/services/planService.js

export const PLANS = {
  FREE: {
    name: 'Free',
    limits: {
      tasksPerDay: 10,
      remindersPerDay: 10,
      aiGenerations: 10,
    },
    features: {
      email: true,
      whatsapp: false,
      pwa: false,
      aiSplit: true,
      priorityScheduling: false,
    },
  },
  PREMIUM: {
    name: 'Pro',
    limits: {
      tasksPerDay: Infinity,
      remindersPerDay: Infinity,
      aiGenerations: Infinity,
    },
    features: {
      email: true,
      whatsapp: true,
      pwa: true,
      aiSplit: true,
      priorityScheduling: true,
    },
  },
}

export function resolvePlanKey(userOrPlan) {
  // Treat admins as premium for feature gating
  try {
    if (typeof userOrPlan === 'object' && userOrPlan) {
      const role = String(userOrPlan.role || '').toLowerCase()
      if (role === 'admin' || role === 'superadmin') return 'PREMIUM'
    }
  } catch {}
  const planStr = typeof userOrPlan === 'string'
    ? userOrPlan
    : (userOrPlan?.plan || userOrPlan?.subscription?.plan)
  const plan = String(planStr || '').toLowerCase()
  const premiumTokens = ['premium', 'pro', 'team', 'starter']
  return premiumTokens.some((token) => plan.includes(token)) ? 'PREMIUM' : 'FREE'
}

export function getPlanFeatures(userOrPlan) {
  const key = resolvePlanKey(userOrPlan)
  return PLANS[key]
}

export function isFeatureAllowed(userOrPlan, featureKey) {
  const plan = getPlanFeatures(userOrPlan)
  return !!plan?.features?.[featureKey]
}

// Fetch usage snapshot for UI
export async function getUsageStatus(uid) {
  try {
    const res = await api.get('/usage/status', { params: { uid } })
    return res?.data || { today: { aiGenerations: 0, reminders: 0 } }
  } catch {
    return { today: { aiGenerations: 0, reminders: 0 } }
  }
}

export function getRemainingAI(user) {
  const key = resolvePlanKey(user)
  if (key === 'PREMIUM') return '∞'
  const used = Number(user?.usage?.today?.aiGenerations || 0)
  const limit = Number(PLANS.FREE.limits.aiGenerations)
  const remaining = Math.max(0, (Number.isFinite(limit) ? limit : 0) - used)
  return remaining
}
import api from '@/services/api'
