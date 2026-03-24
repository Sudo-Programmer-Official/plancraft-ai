import api from '@/services/api'

const DEFAULT_LIMITS = Object.freeze({
  remindersPerDay: 10,
  tasksPerDay: 10,
  aiGenerations: 10,
  playbooks: 5,
})

const DEFAULT_ENTITLEMENTS = Object.freeze({
  aiSplit: true,
  priorityScheduling: false,
  voiceReminders: false,
  advancedPermissions: false,
  prioritySupport: false,
  teamWorkspaces: false,
})

function normalizeLimit(value, fallback = null) {
  if (value == null || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return fallback
  return Math.floor(num)
}

function normalizeBoolean(value, fallback = false) {
  if (value == null) return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const raw = String(value).trim().toLowerCase()
  if (!raw) return fallback
  if (['true', '1', 'yes', 'on', 'enabled'].includes(raw)) return true
  if (['false', '0', 'no', 'off', 'disabled'].includes(raw)) return false
  return fallback
}

function normalizePlan(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'team') return 'team'
  if (raw.includes('premium') || raw.includes('pro') || raw.includes('starter')) return 'premium'
  return 'free'
}

function normalizeFeatureStatus(raw = {}, feature = 'remindersPerDay') {
  return {
    feature: raw?.feature || feature,
    plan: normalizePlan(raw?.plan || 'free'),
    planKey: String(raw?.planKey || normalizePlan(raw?.plan || 'free')).toUpperCase(),
    used: Number(raw?.used || 0),
    limit: raw?.limit == null ? null : normalizeLimit(raw.limit, null),
    isUnlimited: raw?.isUnlimited === true || raw?.limit == null,
    atLimit: raw?.atLimit === true,
    nearLimit: raw?.nearLimit === true,
    remaining: raw?.remaining == null ? null : Number(raw.remaining),
  }
}

export function normalizeEffectiveAccess(raw = {}) {
  const effectivePlan = normalizePlan(raw?.effectivePlan || raw?.plan || 'free')
  const rawLimits = raw?.limits || {}
  const limits = {
    remindersPerDay:
      Object.prototype.hasOwnProperty.call(rawLimits, 'remindersPerDay')
        ? (rawLimits.remindersPerDay == null ? null : normalizeLimit(rawLimits.remindersPerDay, DEFAULT_LIMITS.remindersPerDay))
        : DEFAULT_LIMITS.remindersPerDay,
    tasksPerDay:
      Object.prototype.hasOwnProperty.call(rawLimits, 'tasksPerDay')
        ? (rawLimits.tasksPerDay == null ? null : normalizeLimit(rawLimits.tasksPerDay, DEFAULT_LIMITS.tasksPerDay))
        : DEFAULT_LIMITS.tasksPerDay,
    aiGenerations:
      Object.prototype.hasOwnProperty.call(rawLimits, 'aiGenerations')
        ? (rawLimits.aiGenerations == null ? null : normalizeLimit(rawLimits.aiGenerations, DEFAULT_LIMITS.aiGenerations))
        : DEFAULT_LIMITS.aiGenerations,
    playbooks:
      Object.prototype.hasOwnProperty.call(rawLimits, 'playbooks')
        ? (rawLimits.playbooks == null ? null : normalizeLimit(rawLimits.playbooks, DEFAULT_LIMITS.playbooks))
        : DEFAULT_LIMITS.playbooks,
  }
  const usage = {
    reminders: Number(raw?.usage?.reminders || raw?.today?.reminders || 0),
    tasks: Number(raw?.usage?.tasks || raw?.today?.tasks || 0),
    aiGenerations: Number(raw?.usage?.aiGenerations || raw?.today?.aiGenerations || 0),
    playbooks: Number(raw?.usage?.playbooks || 0),
  }
  const entitlements = {
    ...DEFAULT_ENTITLEMENTS,
    ...(raw?.entitlements || {}),
  }
  const usageStatus = {
    remindersPerDay: normalizeFeatureStatus(raw?.usageStatus?.remindersPerDay, 'remindersPerDay'),
    tasksPerDay: normalizeFeatureStatus(raw?.usageStatus?.tasksPerDay, 'tasksPerDay'),
    aiGenerations: normalizeFeatureStatus(raw?.usageStatus?.aiGenerations, 'aiGenerations'),
    playbooks: normalizeFeatureStatus(raw?.usageStatus?.playbooks, 'playbooks'),
  }

  return {
    userId: raw?.userId || '',
    role: String(raw?.role || '').toLowerCase(),
    basePlan: normalizePlan(raw?.basePlan || effectivePlan),
    effectivePlan,
    effectivePlanLabel: raw?.effectivePlanLabel || (effectivePlan === 'premium' ? 'Pro' : effectivePlan === 'team' ? 'Team' : 'Free'),
    isPremium: raw?.isPremium === true || effectivePlan === 'premium' || effectivePlan === 'team',
    limits,
    entitlements,
    usage,
    today: {
      reminders: usage.reminders,
      tasks: usage.tasks,
      aiGenerations: usage.aiGenerations,
    },
    usageStatus,
    date: raw?.date || '',
    layers: {
      campaigns: Array.isArray(raw?.layers?.campaigns) ? raw.layers.campaigns : [],
      override: raw?.layers?.override || null,
    },
    status: {
      inGrace: raw?.status?.inGrace === true,
      hasCampaign: raw?.status?.hasCampaign === true,
      hasOverride: raw?.status?.hasOverride === true,
      overrideExpiresAt: raw?.status?.overrideExpiresAt || null,
      overrideGraceUntil: raw?.status?.overrideGraceUntil || null,
    },
  }
}

export async function fetchEffectiveAccess(uid, options = {}) {
  const params = {}
  if (uid) params.uid = uid
  const headers = options?.force ? { 'x-requested-with': 'force-refresh' } : undefined
  const { data } = await api.get('/access/effective', { params, headers })
  return normalizeEffectiveAccess(data?.access || data || {})
}

export function hasEntitlement(access, key, fallback = false) {
  return normalizeBoolean(access?.entitlements?.[key], fallback)
}

export function getUsageStatusForFeature(access, feature) {
  const normalizedFeature = String(feature || '').toLowerCase()
  if (normalizedFeature === 'ai' || normalizedFeature === 'ai_calls') return access?.usageStatus?.aiGenerations || normalizeFeatureStatus({}, 'aiGenerations')
  if (normalizedFeature === 'task' || normalizedFeature === 'tasks') return access?.usageStatus?.tasksPerDay || normalizeFeatureStatus({}, 'tasksPerDay')
  if (normalizedFeature === 'playbook' || normalizedFeature === 'playbooks') return access?.usageStatus?.playbooks || normalizeFeatureStatus({}, 'playbooks')
  return access?.usageStatus?.remindersPerDay || normalizeFeatureStatus({}, 'remindersPerDay')
}
