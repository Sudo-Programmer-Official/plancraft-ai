import { fetchEffectiveAccess, getUsageStatusForFeature, hasEntitlement, normalizeEffectiveAccess } from '@/services/accessService'

export const PLANS = Object.freeze({
  FREE: {
    name: 'Free',
    limits: {
      tasksPerDay: 10,
      remindersPerDay: 10,
      aiGenerations: 10,
      playbooks: 5,
    },
    features: {
      aiSplit: true,
      priorityScheduling: false,
      voiceReminders: false,
      advancedPermissions: false,
      prioritySupport: false,
      teamWorkspaces: false,
    },
  },
  PREMIUM: {
    name: 'Pro',
    limits: {
      tasksPerDay: Infinity,
      remindersPerDay: Infinity,
      aiGenerations: Infinity,
      playbooks: Infinity,
    },
    features: {
      aiSplit: true,
      priorityScheduling: true,
      voiceReminders: true,
      advancedPermissions: false,
      prioritySupport: true,
      teamWorkspaces: false,
    },
  },
  TEAM: {
    name: 'Team',
    limits: {
      tasksPerDay: Infinity,
      remindersPerDay: Infinity,
      aiGenerations: Infinity,
      playbooks: Infinity,
    },
    features: {
      aiSplit: true,
      priorityScheduling: true,
      voiceReminders: true,
      advancedPermissions: true,
      prioritySupport: true,
      teamWorkspaces: true,
    },
  },
})

function normalizePlanKey(plan) {
  const raw = String(plan || '').trim().toLowerCase()
  if (raw === 'team') return 'TEAM'
  if (raw.includes('premium') || raw.includes('pro') || raw.includes('starter')) return 'PREMIUM'
  return 'FREE'
}

function extractAccessLike(source) {
  if (!source) return null
  if (source?.access && typeof source.access === 'object') return normalizeEffectiveAccess(source.access)
  if (source?.effectivePlan || source?.usageStatus || source?.entitlements) return normalizeEffectiveAccess(source)
  return null
}

export function resolvePlanKey(userOrPlan) {
  const access = extractAccessLike(userOrPlan)
  if (access) return normalizePlanKey(access.effectivePlan)

  try {
    if (typeof userOrPlan === 'object' && userOrPlan) {
      const role = String(userOrPlan.role || '').toLowerCase()
      if (role === 'admin' || role === 'superadmin') return 'PREMIUM'
    }
  } catch {}

  const planStr =
    typeof userOrPlan === 'string'
      ? userOrPlan
      : userOrPlan?.plan || userOrPlan?.subscription?.plan

  return normalizePlanKey(planStr)
}

export function getPlanFeatures(userOrPlan) {
  const access = extractAccessLike(userOrPlan)
  if (access) {
    const planKey = resolvePlanKey(access.effectivePlan)
    return {
      name: access.effectivePlanLabel || PLANS[planKey].name,
      limits: {
        tasksPerDay: access.limits.tasksPerDay == null ? Infinity : access.limits.tasksPerDay,
        remindersPerDay: access.limits.remindersPerDay == null ? Infinity : access.limits.remindersPerDay,
        aiGenerations: access.limits.aiGenerations == null ? Infinity : access.limits.aiGenerations,
        playbooks: access.limits.playbooks == null ? Infinity : access.limits.playbooks,
      },
      features: {
        ...PLANS[planKey].features,
        ...(access.entitlements || {}),
      },
    }
  }

  const key = resolvePlanKey(userOrPlan)
  return PLANS[key]
}

export function isFeatureAllowed(userOrPlan, featureKey) {
  const access = extractAccessLike(userOrPlan)
  if (access) return hasEntitlement(access, featureKey, false)
  const plan = getPlanFeatures(userOrPlan)
  return !!plan?.features?.[featureKey]
}

export async function getUsageStatus(uid) {
  return fetchEffectiveAccess(uid)
}

export function getRemainingAI(user) {
  const access = extractAccessLike(user)
  if (access) {
    const status = getUsageStatusForFeature(access, 'ai')
    if (status.isUnlimited) return '∞'
    return Math.max(0, Number(status.remaining || 0))
  }

  const key = resolvePlanKey(user)
  if (key !== 'FREE') return '∞'
  const used = Number(user?.usage?.today?.aiGenerations || 0)
  const limit = Number(PLANS.FREE.limits.aiGenerations)
  return Math.max(0, limit - used)
}
