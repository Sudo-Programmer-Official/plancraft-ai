import { db } from './firebaseAdmin.js'

const DEFAULT_PREFS = {
  enable_whatsapp: true,
  enable_email: true,
  enable_pwa: true,
  enable_voice: true,
  enable_sms: false,
}

const ACTION_INBOX_ALLOWED_CHANNELS = ['email', 'pwa', 'whatsapp']
const DEFAULT_ACTION_INBOX_NUDGE_PREFS = {
  enabled: true,
  urgency: 'important',
  maxPerSuggestion: 2,
  channels: ['pwa', 'whatsapp', 'email'],
  dailyDigest: true,
  digestChannels: ['email'],
}

function coerceBoolean(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return null
    if (['true', '1', 'yes', 'on', 'enabled'].includes(normalized)) return true
    if (['false', '0', 'no', 'off', 'disabled'].includes(normalized)) return false
  }
  return null
}

function applyFlag(target, key, value) {
  const bool = coerceBoolean(value)
  if (bool === null) return
  target[key] = bool
}

function normalizeChannelName(channel) {
  if (!channel) return null
  const normalized = String(channel).trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'voice_call' || normalized === 'voice-call' || normalized === 'phone' || normalized === 'call') {
    return 'voice'
  }
  if (normalized === 'push' || normalized === 'webpush' || normalized === 'web-push') {
    return 'pwa'
  }
  if (normalized === 'text' || normalized === 'sms_text') {
    return 'sms'
  }
  return normalized
}

function normalizeChannelList(values, allowed = null) {
  if (!Array.isArray(values)) return []
  const allowSet = Array.isArray(allowed) && allowed.length ? new Set(allowed) : null
  const next = []
  const seen = new Set()
  values.forEach((value) => {
    const normalized = normalizeChannelName(value)
    if (!normalized) return
    if (allowSet && !allowSet.has(normalized)) return
    if (seen.has(normalized)) return
    seen.add(normalized)
    next.push(normalized)
  })
  return next
}

function normalizeActionInboxUrgency(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'urgent_only' || normalized === 'urgent-only') return 'urgent_only'
  return 'important'
}

function clampActionInboxNudgeCount(value, fallback = DEFAULT_ACTION_INBOX_NUDGE_PREFS.maxPerSuggestion) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(Math.max(Math.round(numeric), 1), 3)
}

function applyFromSource(prefs, source) {
  if (!source || typeof source !== 'object') return
  applyFlag(prefs, 'enable_whatsapp', source.enable_whatsapp ?? source.whatsapp)
  applyFlag(prefs, 'enable_email', source.enable_email ?? source.email)
  applyFlag(prefs, 'enable_pwa', source.enable_pwa ?? source.pwa ?? source.push ?? source.enable_push)
  applyFlag(prefs, 'enable_voice', source.enable_voice ?? source.voice ?? source.enable_voice_call ?? source.voice_call)
  applyFlag(prefs, 'enable_sms', source.enable_sms ?? source.sms ?? source.text)
}

function applyActionInboxPrefs(target, source) {
  if (!source || typeof source !== 'object') return
  const nested = source?.actionInboxNudges && typeof source.actionInboxNudges === 'object'
    ? source.actionInboxNudges
    : source

  const enabled = coerceBoolean(nested?.enabled)
  if (enabled !== null) target.enabled = enabled

  const dailyDigest = coerceBoolean(nested?.dailyDigest ?? nested?.daily_digest)
  if (dailyDigest !== null) target.dailyDigest = dailyDigest

  if (nested?.urgency !== undefined) {
    target.urgency = normalizeActionInboxUrgency(nested.urgency)
  }

  if (nested?.maxPerSuggestion !== undefined || nested?.max_per_suggestion !== undefined) {
    target.maxPerSuggestion = clampActionInboxNudgeCount(
      nested?.maxPerSuggestion ?? nested?.max_per_suggestion,
      target.maxPerSuggestion,
    )
  }

  const channels = normalizeChannelList(nested?.channels, ACTION_INBOX_ALLOWED_CHANNELS)
  if (channels.length) {
    target.channels = channels
  }

  const digestChannels = normalizeChannelList(
    nested?.digestChannels ?? nested?.digest_channels,
    ACTION_INBOX_ALLOWED_CHANNELS,
  )
  if (digestChannels.length) {
    target.digestChannels = digestChannels
  }
}

function deriveDefaultActionInboxChannels(prefs) {
  const derived = [
    prefs?.enable_pwa && 'pwa',
    prefs?.enable_whatsapp && 'whatsapp',
    prefs?.enable_email && 'email',
  ].filter(Boolean)
  return derived.length ? derived : [...DEFAULT_ACTION_INBOX_NUDGE_PREFS.channels]
}

function deriveDefaultActionInboxDigestChannels(prefs) {
  const derived = [
    prefs?.enable_email && 'email',
    prefs?.enable_pwa && 'pwa',
    prefs?.enable_whatsapp && 'whatsapp',
  ].filter(Boolean)
  return derived.length ? [derived[0]] : [...DEFAULT_ACTION_INBOX_NUDGE_PREFS.digestChannels]
}

export async function getUserPrefs(userId) {
  const prefs = { ...DEFAULT_PREFS }
  if (!userId) return prefs

  let overrides = {}
  try {
    const snap = await db.collection('user_notification_prefs').doc(String(userId)).get()
    if (snap.exists) overrides = snap.data() || {}
  } catch (err) {
    console.warn('[UserPrefService] prefs lookup failed', err?.message || err)
  }
  applyFromSource(prefs, overrides)

  let profile = {}
  try {
    const snap = await db.collection('users').doc(String(userId)).get()
    if (snap.exists) profile = snap.data() || {}
  } catch (err) {
    console.warn('[UserPrefService] profile lookup failed', err?.message || err)
  }

  const notifications = profile?.preferences?.notifications || profile?.notifications || {}
  const reminderPrefs = profile?.preferences?.reminders || {}
  const actionInboxNudges = { ...DEFAULT_ACTION_INBOX_NUDGE_PREFS }

  applyFromSource(prefs, notifications)
  applyFromSource(prefs, reminderPrefs)
  applyActionInboxPrefs(actionInboxNudges, overrides?.actionInboxNudges)
  applyActionInboxPrefs(actionInboxNudges, overrides?.notifications?.actionInboxNudges)
  applyActionInboxPrefs(actionInboxNudges, profile?.preferences?.actionInboxNudges)
  applyActionInboxPrefs(actionInboxNudges, notifications?.actionInboxNudges)

  const channelLists = [
    Array.isArray(overrides?.channels) ? overrides.channels : null,
    Array.isArray(notifications?.channels) ? notifications.channels : null,
    Array.isArray(reminderPrefs?.channels) ? reminderPrefs.channels : null,
    Array.isArray(profile?.channels) ? profile.channels : null,
  ].filter((list) => Array.isArray(list) && list.length)

  if (channelLists.length) {
    const channelSet = new Set()
    for (const list of channelLists) {
      for (const entry of list) {
        const normalized = normalizeChannelName(entry)
        if (normalized) channelSet.add(normalized)
      }
    }
    if (channelSet.has('whatsapp') && prefs.enable_whatsapp !== false) prefs.enable_whatsapp = true
    if (channelSet.has('email') && prefs.enable_email !== false) prefs.enable_email = true
    if (channelSet.has('pwa') && prefs.enable_pwa !== false) prefs.enable_pwa = true
    if (channelSet.has('voice') && prefs.enable_voice !== false) prefs.enable_voice = true
    if (channelSet.has('sms') && prefs.enable_sms !== false) prefs.enable_sms = true
  }

  if (!Array.isArray(actionInboxNudges.channels) || !actionInboxNudges.channels.length) {
    actionInboxNudges.channels = deriveDefaultActionInboxChannels(prefs)
  }
  if (!Array.isArray(actionInboxNudges.digestChannels) || !actionInboxNudges.digestChannels.length) {
    actionInboxNudges.digestChannels = deriveDefaultActionInboxDigestChannels(prefs)
  }

  return {
    ...prefs,
    actionInboxNudges: {
      ...actionInboxNudges,
      channels: normalizeChannelList(actionInboxNudges.channels, ACTION_INBOX_ALLOWED_CHANNELS),
      digestChannels: normalizeChannelList(actionInboxNudges.digestChannels, ACTION_INBOX_ALLOWED_CHANNELS),
    },
  }
}

export default {
  getUserPrefs,
}
