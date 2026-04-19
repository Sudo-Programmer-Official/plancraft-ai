import { db } from './firebaseAdmin.js'
import dayjs from '../utils/dayjs.js'

export const LIMIT_KEYS = Object.freeze([
  'remindersPerDay',
  'tasksPerDay',
  'aiGenerations',
  'playbooks',
])

export const ENTITLEMENT_KEYS = Object.freeze([
  'aiSplit',
  'priorityScheduling',
  'voiceReminders',
  'advancedPermissions',
  'prioritySupport',
  'teamWorkspaces',
])

export const PLAN_KEYS = Object.freeze(['free', 'premium', 'team'])

export const DEFAULT_ACCESS_CONTROL = Object.freeze({
  gracePeriodDays: 0,
  plans: Object.freeze({
    free: Object.freeze({
      name: 'Free',
      limits: Object.freeze({
        remindersPerDay: 10,
        tasksPerDay: 10,
        aiGenerations: 10,
        playbooks: 5,
      }),
      entitlements: Object.freeze({
        aiSplit: true,
        priorityScheduling: false,
        voiceReminders: false,
        advancedPermissions: false,
        prioritySupport: false,
        teamWorkspaces: false,
      }),
    }),
    premium: Object.freeze({
      name: 'Pro',
      limits: Object.freeze({
        remindersPerDay: null,
        tasksPerDay: null,
        aiGenerations: null,
        playbooks: null,
      }),
      entitlements: Object.freeze({
        aiSplit: true,
        priorityScheduling: true,
        voiceReminders: true,
        advancedPermissions: false,
        prioritySupport: true,
        teamWorkspaces: false,
      }),
    }),
    team: Object.freeze({
      name: 'Team',
      limits: Object.freeze({
        remindersPerDay: null,
        tasksPerDay: null,
        aiGenerations: null,
        playbooks: null,
      }),
      entitlements: Object.freeze({
        aiSplit: true,
        priorityScheduling: true,
        voiceReminders: true,
        advancedPermissions: true,
        prioritySupport: true,
        teamWorkspaces: true,
      }),
    }),
  }),
  campaigns: Object.freeze([]),
})

export const DEFAULT_PLAN_LIMITS = Object.freeze(
  PLAN_KEYS.reduce((acc, planKey) => {
    acc[planKey] = Object.freeze({ ...DEFAULT_ACCESS_CONTROL.plans[planKey].limits })
    return acc
  }, {}),
)

export const PLANS = Object.freeze({
  FREE: {
    name: DEFAULT_ACCESS_CONTROL.plans.free.name,
    limits: DEFAULT_PLAN_LIMITS.free,
  },
  PREMIUM: {
    name: DEFAULT_ACCESS_CONTROL.plans.premium.name,
    limits: DEFAULT_PLAN_LIMITS.premium,
  },
  TEAM: {
    name: DEFAULT_ACCESS_CONTROL.plans.team.name,
    limits: DEFAULT_PLAN_LIMITS.team,
  },
})

const ACCESS_CONFIG_CACHE_TTL_MS = 60 * 1000

let accessConfigCache = {
  fetchedAt: 0,
  value: null,
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function cloneDefaultAccessControl() {
  return cloneJson(DEFAULT_ACCESS_CONTROL)
}

function normalizePlanKey(value, fallback = 'free') {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return fallback
  if (raw === 'team') return 'team'
  if (['premium', 'pro', 'starter', 'paid'].includes(raw)) return 'premium'
  if (raw.includes('team')) return 'team'
  if (raw.includes('pro') || raw.includes('premium') || raw.includes('starter')) return 'premium'
  if (raw === 'free') return 'free'
  return fallback
}

function resolveBasePlan(planValue, roleValue = '') {
  const role = String(roleValue || '').trim().toLowerCase()
  if (role === 'superadmin' || role === 'admin') return 'premium'
  return normalizePlanKey(planValue, 'free')
}

function sanitizeLimitValue(value, fallback = null) {
  if (value == null) return fallback
  const raw = String(value).trim()
  if (!raw) return fallback
  const lowered = raw.toLowerCase()
  if (['unlimited', 'infinity', '∞', 'null'].includes(lowered)) return null
  const num = Number(raw)
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

function sanitizeString(value, fallback = '') {
  if (value == null) return fallback
  const raw = String(value).trim()
  return raw || fallback
}

function sanitizeArray(values = [], mapper = (value) => sanitizeString(value)) {
  if (!Array.isArray(values)) return []
  const seen = new Set()
  return values
    .map((value) => mapper(value))
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })
}

function sanitizeDateString(value, fallback = null) {
  if (!value) return fallback
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toISOString()
}

function sanitizeNumericSetting(value, fallback = null) {
  if (value == null || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return fallback
  return Math.floor(num)
}

function buildLimitKeySet(raw = {}, fallback = {}) {
  return Array.from(new Set([...LIMIT_KEYS, ...Object.keys(raw || {}), ...Object.keys(fallback || {})]))
}

function buildEntitlementKeySet(raw = {}, fallback = {}) {
  return Array.from(new Set([...ENTITLEMENT_KEYS, ...Object.keys(raw || {}), ...Object.keys(fallback || {})]))
}

function sanitizeLimitMap(raw = {}, fallback = {}) {
  const next = {}
  buildLimitKeySet(raw, fallback).forEach((key) => {
    const hasRaw = Object.prototype.hasOwnProperty.call(raw || {}, key)
    const fallbackValue = Object.prototype.hasOwnProperty.call(fallback || {}, key) ? fallback[key] : null
    if (!hasRaw && !Object.prototype.hasOwnProperty.call(fallback || {}, key)) return
    next[key] = sanitizeLimitValue(hasRaw ? raw[key] : undefined, fallbackValue)
  })
  return next
}

function sanitizeEntitlementMap(raw = {}, fallback = {}) {
  const next = {}
  buildEntitlementKeySet(raw, fallback).forEach((key) => {
    const hasRaw = Object.prototype.hasOwnProperty.call(raw || {}, key)
    const fallbackValue = Object.prototype.hasOwnProperty.call(fallback || {}, key) ? fallback[key] : false
    if (!hasRaw && !Object.prototype.hasOwnProperty.call(fallback || {}, key)) return
    next[key] = normalizeBoolean(hasRaw ? raw[key] : undefined, fallbackValue)
  })
  return next
}

function mergeLimitMaps(base = {}, overlay = {}) {
  const next = { ...(base || {}) }
  Object.entries(overlay || {}).forEach(([key, value]) => {
    if (value === undefined) return
    next[key] = value
  })
  return next
}

function mergeEntitlementMaps(base = {}, overlay = {}) {
  const next = { ...(base || {}) }
  Object.entries(overlay || {}).forEach(([key, value]) => {
    if (value === undefined) return
    next[key] = value
  })
  return next
}

function sanitizePlanDefinition(raw = {}, fallback = {}) {
  return {
    name: sanitizeString(raw?.name, fallback?.name || 'Plan'),
    limits: sanitizeLimitMap(raw?.limits || {}, fallback?.limits || {}),
    entitlements: sanitizeEntitlementMap(raw?.entitlements || raw?.features || {}, fallback?.entitlements || {}),
  }
}

function sanitizeAccessLayer(raw = {}, options = {}) {
  if (!raw || typeof raw !== 'object') return null
  const fallbackGracePeriodDays = sanitizeNumericSetting(options?.gracePeriodDays, null)
  const plan = raw?.plan == null || raw?.plan === '' ? null : normalizePlanKey(raw.plan, 'free')
  return {
    enabled: normalizeBoolean(raw?.enabled, true),
    name: sanitizeString(raw?.name, ''),
    reason: sanitizeString(raw?.reason, ''),
    plan,
    startsAt: sanitizeDateString(raw?.startsAt || raw?.startAt || raw?.startDate, null),
    expiresAt: sanitizeDateString(raw?.expiresAt || raw?.endAt || raw?.endDate, null),
    graceUntil: sanitizeDateString(raw?.graceUntil, null),
    gracePeriodDays: sanitizeNumericSetting(raw?.gracePeriodDays, fallbackGracePeriodDays),
    limits: sanitizeLimitMap(raw?.limits || raw?.planLimits || {}, {}),
    entitlements: sanitizeEntitlementMap(raw?.entitlements || raw?.features || {}, {}),
    userIds: sanitizeArray(raw?.userIds),
    emails: sanitizeArray(raw?.emails, (value) => sanitizeString(value).toLowerCase()),
    roles: sanitizeArray(raw?.roles, (value) => sanitizeString(value).toLowerCase()),
    plans: sanitizeArray(raw?.plans, (value) => normalizePlanKey(value, 'free')),
    metadata: raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
  }
}

function sanitizeCampaigns(raw = [], options = {}) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => sanitizeAccessLayer(entry, options))
    .filter((entry) => entry && entry.enabled !== false)
}

export function sanitizePlanLimits(raw = {}) {
  const defaults = cloneDefaultAccessControl().plans
  const freeRaw = raw?.free || raw?.FREE || {}
  const premiumRaw = raw?.premium || raw?.PREMIUM || {}
  const teamRaw = raw?.team || raw?.TEAM || {}

  return {
    free: sanitizeLimitMap(freeRaw?.limits || freeRaw, defaults.free.limits),
    premium: sanitizeLimitMap(premiumRaw?.limits || premiumRaw, defaults.premium.limits),
    team: sanitizeLimitMap(teamRaw?.limits || teamRaw, defaults.team.limits),
  }
}

function mergeLegacyPlanLimits(accessControl, legacyPlanLimits = {}) {
  const next = cloneJson(accessControl)
  PLAN_KEYS.forEach((planKey) => {
    if (!legacyPlanLimits?.[planKey]) return
    next.plans[planKey].limits = mergeLimitMaps(
      next.plans[planKey].limits,
      sanitizeLimitMap(legacyPlanLimits[planKey], next.plans[planKey].limits),
    )
  })
  return next
}

export function sanitizeAccessControl(raw = {}) {
  const defaults = cloneDefaultAccessControl()
  const plansRaw = raw?.plans || {}
  const next = {
    gracePeriodDays: sanitizeNumericSetting(raw?.gracePeriodDays, defaults.gracePeriodDays) ?? defaults.gracePeriodDays,
    plans: {
      free: sanitizePlanDefinition(plansRaw.free || {}, defaults.plans.free),
      premium: sanitizePlanDefinition(plansRaw.premium || {}, defaults.plans.premium),
      team: sanitizePlanDefinition(plansRaw.team || {}, defaults.plans.team),
    },
    campaigns: sanitizeCampaigns(raw?.campaigns || raw?.accessCampaigns || [], {
      gracePeriodDays: raw?.gracePeriodDays,
    }),
  }

  if (raw?.planLimits) {
    return mergeLegacyPlanLimits(next, sanitizePlanLimits(raw.planLimits))
  }

  return next
}

export function sanitizeUserAccessOverride(raw = {}, options = {}) {
  if (!raw || typeof raw !== 'object') return null
  const layer = sanitizeAccessLayer(raw, options)
  if (!layer) return null
  const hasRealContent =
    !!layer.plan ||
    !!layer.startsAt ||
    !!layer.expiresAt ||
    !!layer.graceUntil ||
    Object.keys(layer.limits || {}).length > 0 ||
    Object.keys(layer.entitlements || {}).length > 0
  if (!hasRealContent && layer.enabled !== false) return null
  return layer
}

export function invalidateAccessControlCache() {
  accessConfigCache = {
    fetchedAt: 0,
    value: null,
  }
}

export async function getAccessControlConfig(options = {}) {
  const force = options?.force === true
  const now = Date.now()
  if (!force && accessConfigCache.value && now - accessConfigCache.fetchedAt < ACCESS_CONFIG_CACHE_TTL_MS) {
    return accessConfigCache.value
  }

  try {
    const snap = await db.collection('settings').doc('global').get()
    const data = snap.exists ? (snap.data() || {}) : {}
    const value = sanitizeAccessControl({
      ...(data?.accessControl || {}),
      ...(data?.planLimits ? { planLimits: data.planLimits } : {}),
    })
    accessConfigCache = { fetchedAt: now, value }
    return value
  } catch {
    const fallback = cloneDefaultAccessControl()
    accessConfigCache = { fetchedAt: now, value: fallback }
    return fallback
  }
}

export async function getPlanLimitsConfig(options = {}) {
  const accessControl = options?.accessControl || await getAccessControlConfig(options)
  return PLAN_KEYS.reduce((acc, planKey) => {
    acc[planKey] = { ...(accessControl?.plans?.[planKey]?.limits || DEFAULT_PLAN_LIMITS[planKey]) }
    return acc
  }, {})
}

async function getUserRecord(userId) {
  try {
    const snap = await db.collection('users').doc(String(userId || '')).get()
    return snap.exists ? (snap.data() || {}) : {}
  } catch {
    return {}
  }
}

function getUsageDocFieldKey(feature) {
  const normalized = String(feature || '').toLowerCase()
  if (normalized === 'ai' || normalized === 'ai_calls' || normalized === 'aigenerations') return 'ai'
  if (normalized === 'task' || normalized === 'tasks' || normalized === 'tasksperday') return 'task'
  if (normalized === 'playbook' || normalized === 'playbooks') return 'playbooks'
  return 'reminder'
}

function getUsageKey(feature) {
  const normalized = String(feature || '').toLowerCase()
  if (normalized === 'ai' || normalized === 'ai_calls' || normalized === 'aigenerations') return 'aiGenerations'
  if (normalized === 'task' || normalized === 'tasks' || normalized === 'tasksperday') return 'tasks'
  if (normalized === 'playbook' || normalized === 'playbooks') return 'playbooks'
  return 'reminders'
}

function getLimitKeyForFeature(feature) {
  const normalized = String(feature || '').toLowerCase()
  if (normalized === 'ai' || normalized === 'ai_calls' || normalized === 'aigenerations') return 'aiGenerations'
  if (normalized === 'task' || normalized === 'tasks' || normalized === 'tasksperday') return 'tasksPerDay'
  if (normalized === 'playbook' || normalized === 'playbooks') return 'playbooks'
  return 'remindersPerDay'
}

function getNearLimitThreshold(limit) {
  if (!Number.isFinite(limit) || limit <= 0) return Infinity
  return Math.max(limit - 1, Math.ceil(limit * 0.8))
}

async function getPlaybookCount(userId) {
  const snap = await db.collection('playbooks').where('userId', '==', String(userId || '')).get()
  return snap.size || 0
}

async function getDailyUsageMap(userId) {
  const todayKey = dayjs().format('YYYY-MM-DD')
  const docId = `${String(userId || '')}_${todayKey}`
  const snap = await db.collection('usage').doc(docId).get()
  const data = snap.exists ? (snap.data() || {}) : {}
  return { todayKey, data }
}

function resolveLayerWindow(layer, fallbackGraceDays = 0, now = new Date()) {
  if (!layer || layer.enabled === false) {
    return {
      active: false,
      inGrace: false,
      startsAt: null,
      expiresAt: null,
      graceUntil: null,
    }
  }

  const startsAt = layer.startsAt ? new Date(layer.startsAt) : null
  const expiresAt = layer.expiresAt ? new Date(layer.expiresAt) : null
  if (startsAt && startsAt.getTime() > now.getTime()) {
    return {
      active: false,
      inGrace: false,
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      graceUntil: layer.graceUntil || null,
    }
  }

  if (!expiresAt || expiresAt.getTime() >= now.getTime()) {
    return {
      active: true,
      inGrace: false,
      startsAt: startsAt ? startsAt.toISOString() : null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      graceUntil: layer.graceUntil || null,
    }
  }

  const graceDays = sanitizeNumericSetting(layer.gracePeriodDays, fallbackGraceDays) ?? 0
  const explicitGraceUntil = layer.graceUntil ? new Date(layer.graceUntil) : null
  const derivedGraceUntil =
    explicitGraceUntil && !Number.isNaN(explicitGraceUntil.getTime())
      ? explicitGraceUntil
      : graceDays > 0
        ? new Date(expiresAt.getTime() + graceDays * 24 * 60 * 60 * 1000)
        : null

  const inGrace = !!derivedGraceUntil && derivedGraceUntil.getTime() >= now.getTime()
  return {
    active: inGrace,
    inGrace,
    startsAt: startsAt ? startsAt.toISOString() : null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    graceUntil: derivedGraceUntil ? derivedGraceUntil.toISOString() : null,
  }
}

function doesCampaignMatchUser(layer, userData = {}, basePlan = 'free', userId = '') {
  const userFilters = Array.isArray(layer?.userIds) ? layer.userIds : []
  const emailFilters = Array.isArray(layer?.emails) ? layer.emails : []
  const roleFilters = Array.isArray(layer?.roles) ? layer.roles : []
  const planFilters = Array.isArray(layer?.plans) ? layer.plans : []

  const email = String(userData?.email || '').trim().toLowerCase()
  const role = String(userData?.role || '').trim().toLowerCase()
  const hasTargeting = userFilters.length || emailFilters.length || roleFilters.length || planFilters.length
  if (!hasTargeting) return true
  if (userFilters.length && !userFilters.includes(String(userId || ''))) return false
  if (emailFilters.length && (!email || !emailFilters.includes(email))) return false
  if (roleFilters.length && (!role || !roleFilters.includes(role))) return false
  if (planFilters.length && !planFilters.includes(String(basePlan || 'free'))) return false
  return true
}

function applyAccessLayer(current, accessControl, layer) {
  const next = {
    ...current,
    limits: { ...(current.limits || {}) },
    entitlements: { ...(current.entitlements || {}) },
  }

  if (layer?.plan) {
    const planKey = normalizePlanKey(layer.plan, current.effectivePlan || 'free')
    const planDefinition = accessControl?.plans?.[planKey] || DEFAULT_ACCESS_CONTROL.plans[planKey] || DEFAULT_ACCESS_CONTROL.plans.free
    next.effectivePlan = planKey
    next.planLabel = planDefinition.name || next.planLabel
    next.limits = mergeLimitMaps(next.limits, planDefinition.limits)
    next.entitlements = mergeEntitlementMaps(next.entitlements, planDefinition.entitlements)
  }

  next.limits = mergeLimitMaps(next.limits, layer?.limits || {})
  next.entitlements = mergeEntitlementMaps(next.entitlements, layer?.entitlements || {})

  return next
}

function buildFeatureStatus(access, feature) {
  const limitKey = getLimitKeyForFeature(feature)
  const usageKey = getUsageKey(feature)
  const rawLimit = access?.limits?.[limitKey]
  const limit = rawLimit == null ? null : Number(rawLimit)
  const used = Number(access?.usage?.[usageKey] || 0)
  const isUnlimited = rawLimit == null
  const atLimit = !isUnlimited && used >= limit
  const nearLimit = !isUnlimited && used >= getNearLimitThreshold(limit)
  const remaining = isUnlimited ? null : Math.max(limit - used, 0)

  return {
    feature: limitKey,
    plan: access?.effectivePlan || 'free',
    planKey: String(access?.effectivePlan || 'free').toUpperCase(),
    used,
    limit,
    isUnlimited,
    atLimit,
    nearLimit,
    remaining,
  }
}

function buildUsageStatusMap(access) {
  return {
    remindersPerDay: buildFeatureStatus(access, 'reminders'),
    tasksPerDay: buildFeatureStatus(access, 'tasks'),
    aiGenerations: buildFeatureStatus(access, 'ai'),
    playbooks: buildFeatureStatus(access, 'playbooks'),
  }
}

export async function getEffectiveAccess(userId, options = {}) {
  const uid = String(userId || '')
  const accessControl = options?.accessControl || await getAccessControlConfig(options)
  const userData = options?.userData || await getUserRecord(uid)
  const basePlan = resolveBasePlan(userData?.plan, userData?.role)
  const baseDefinition = accessControl?.plans?.[basePlan] || DEFAULT_ACCESS_CONTROL.plans[basePlan] || DEFAULT_ACCESS_CONTROL.plans.free
  const dailyUsage = options?.dailyUsage || await getDailyUsageMap(uid)
  const playbookCount =
    Number.isFinite(Number(options?.playbookCount))
      ? Number(options.playbookCount)
      : await getPlaybookCount(uid)

  let state = {
    effectivePlan: basePlan,
    planLabel: baseDefinition.name || 'Free',
    limits: { ...(baseDefinition.limits || {}) },
    entitlements: { ...(baseDefinition.entitlements || {}) },
  }

  const activeCampaigns = []
  const gracePeriodDays = accessControl?.gracePeriodDays ?? 0
  const campaigns = Array.isArray(accessControl?.campaigns) ? accessControl.campaigns : []
  campaigns.forEach((campaign, index) => {
    if (!doesCampaignMatchUser(campaign, userData, basePlan, uid)) return
    const windowState = resolveLayerWindow(campaign, gracePeriodDays)
    if (!windowState.active) return
    state = applyAccessLayer(state, accessControl, campaign)
    activeCampaigns.push({
      id: sanitizeString(campaign?.metadata?.id || campaign?.name || `campaign-${index + 1}`),
      name: campaign?.name || `Campaign ${index + 1}`,
      reason: campaign?.reason || '',
      plan: campaign?.plan || null,
      inGrace: windowState.inGrace,
      startsAt: windowState.startsAt,
      expiresAt: windowState.expiresAt,
      graceUntil: windowState.graceUntil,
    })
  })

  const accessOverride = sanitizeUserAccessOverride(userData?.accessOverride || null, {
    gracePeriodDays,
  })
  const overrideWindow = resolveLayerWindow(accessOverride, gracePeriodDays)
  const overrideActive = accessOverride && overrideWindow.active
  if (overrideActive) {
    state = applyAccessLayer(state, accessControl, accessOverride)
  }

  const usage = {
    reminders: Number(dailyUsage?.data?.reminder || 0),
    tasks: Number(dailyUsage?.data?.task || 0),
    aiGenerations: Number(dailyUsage?.data?.ai || 0),
    playbooks: playbookCount,
  }

  const effectiveAccess = {
    userId: uid,
    role: String(userData?.role || '').trim().toLowerCase(),
    email: String(userData?.email || '').trim().toLowerCase() || null,
    basePlan,
    effectivePlan: state.effectivePlan,
    effectivePlanLabel: state.planLabel,
    isPremium: state.effectivePlan !== 'free',
    limits: state.limits,
    entitlements: state.entitlements,
    usage,
    today: {
      reminders: usage.reminders,
      tasks: usage.tasks,
      aiGenerations: usage.aiGenerations,
    },
    date: dailyUsage?.todayKey || dayjs().format('YYYY-MM-DD'),
    layers: {
      campaigns: activeCampaigns,
      override: overrideActive
        ? {
            name: accessOverride?.name || 'User override',
            reason: accessOverride?.reason || '',
            plan: accessOverride?.plan || null,
            inGrace: overrideWindow.inGrace,
            startsAt: overrideWindow.startsAt,
            expiresAt: overrideWindow.expiresAt,
            graceUntil: overrideWindow.graceUntil,
            limits: accessOverride?.limits || {},
            entitlements: accessOverride?.entitlements || {},
          }
        : null,
    },
    status: {
      inGrace: activeCampaigns.some((campaign) => campaign.inGrace) || !!overrideWindow.inGrace,
      hasCampaign: activeCampaigns.length > 0,
      hasOverride: !!overrideActive,
      overrideExpiresAt: overrideActive ? overrideWindow.expiresAt : null,
      overrideGraceUntil: overrideActive ? overrideWindow.graceUntil : null,
    },
  }

  effectiveAccess.usageStatus = buildUsageStatusMap(effectiveAccess)
  return effectiveAccess
}

export async function getFeatureUsageStatus(userId, feature, options = {}) {
  const access = options?.access || await getEffectiveAccess(userId, options)
  const status = buildFeatureStatus(access, feature)

  if (Number.isFinite(Number(options?.used))) {
    const used = Number(options.used)
    const isUnlimited = status.limit == null
    const atLimit = !isUnlimited && used >= Number(status.limit)
    const nearLimit = !isUnlimited && used >= getNearLimitThreshold(Number(status.limit))
    return {
      ...status,
      used,
      atLimit,
      nearLimit,
      remaining: isUnlimited ? null : Math.max(Number(status.limit) - used, 0),
    }
  }

  return status
}

export async function getPlanUsageSnapshot(userId, options = {}) {
  const access = options?.access || await getEffectiveAccess(userId, options)
  return {
    plan: access.effectivePlan,
    planKey: String(access.effectivePlan || 'free').toUpperCase(),
    name: access.effectivePlanLabel,
    limits: {
      remindersPerDay: access.limits.remindersPerDay ?? null,
      tasksPerDay: access.limits.tasksPerDay ?? null,
      aiGenerations: access.limits.aiGenerations ?? null,
      playbooks: access.limits.playbooks ?? null,
    },
    usage: {
      reminders: access.usage.reminders,
      tasks: access.usage.tasks,
      aiGenerations: access.usage.aiGenerations,
      playbooks: access.usage.playbooks,
    },
    today: {
      reminders: access.usage.reminders,
      tasks: access.usage.tasks,
      aiGenerations: access.usage.aiGenerations,
    },
    entitlements: { ...(access.entitlements || {}) },
    date: access.date,
    access,
  }
}

export async function checkUserPlan(userId, options = {}) {
  const access = options?.access || await getEffectiveAccess(userId, options)
  return {
    key: String(access.effectivePlan || 'free').toUpperCase(),
    name: access.effectivePlanLabel,
    limits: access.limits,
    usage: access.usage,
    entitlements: access.entitlements,
    access,
  }
}

export async function checkUserPlanUsage(userId, feature, options = {}) {
  const uid = String(userId || '')
  if (!uid) return { ok: false, used: 0, limit: 0, plan: 'free' }

  const dailyUsage = options?.dailyUsage || await getDailyUsageMap(uid)
  const access = options?.access || await getEffectiveAccess(uid, {
    ...options,
    dailyUsage,
  })
  const status = buildFeatureStatus(access, feature)
  const usageField = getUsageDocFieldKey(feature)
  const limitKey = getLimitKeyForFeature(feature)
  const isCollectionCountFeature = limitKey === 'playbooks'

  if (status.isUnlimited) {
    if (!isCollectionCountFeature) {
      const current = Number(dailyUsage?.data?.[usageField] || 0)
      await db.collection('usage').doc(`${uid}_${dailyUsage.todayKey}`).set(
        {
          ...dailyUsage.data,
          [usageField]: current + 1,
          updatedAt: new Date(),
        },
        { merge: true },
      )
      return {
        ok: true,
        used: current + 1,
        limit: null,
        isUnlimited: true,
        plan: access.effectivePlan,
        access,
      }
    }

    return {
      ok: true,
      used: status.used,
      limit: null,
      isUnlimited: true,
      plan: access.effectivePlan,
      access,
    }
  }

  if (status.used >= Number(status.limit)) {
    return {
      ok: false,
      used: status.used,
      limit: status.limit,
      isUnlimited: false,
      plan: access.effectivePlan,
      access,
      details: status,
    }
  }

  if (isCollectionCountFeature) {
    return {
      ok: true,
      used: status.used,
      limit: status.limit,
      isUnlimited: false,
      plan: access.effectivePlan,
      access,
    }
  }

  const current = Number(dailyUsage?.data?.[usageField] || 0)
  await db.collection('usage').doc(`${uid}_${dailyUsage.todayKey}`).set(
    {
      ...dailyUsage.data,
      [usageField]: current + 1,
      updatedAt: new Date(),
    },
    { merge: true },
  )

  return {
    ok: true,
    used: current + 1,
    limit: status.limit,
    isUnlimited: false,
    plan: access.effectivePlan,
    access,
  }
}

export async function planUsageMiddleware(req, res, next) {
  try {
    const userId = req?.body?.userId || req?.query?.userId || req?.params?.userId || req?.user?.uid
    const result = await checkUserPlanUsage(userId, 'reminder')
    if (result.ok) return next()
    return res.status(403).json({
      success: false,
      error: 'Daily reminder limit reached. Upgrade to Premium to continue.',
      code: 'reminder_limit_reached',
      details: result.details || null,
    })
  } catch (e) {
    try { console.warn('[Plan] planUsageMiddleware error', e?.message || e) } catch {}
    return next()
  }
}

export async function getUsageToday(userId, feature = 'reminder', options = {}) {
  const access = options?.access || await getEffectiveAccess(userId, options)
  const status = buildFeatureStatus(access, feature)
  return {
    used: status.used,
    limit: status.limit,
    plan: status.plan,
    date: access.date || dayjs().format('YYYY-MM-DD'),
    isUnlimited: status.isUnlimited,
    atLimit: status.atLimit,
    nearLimit: status.nearLimit,
    entitlements: access.entitlements,
  }
}
