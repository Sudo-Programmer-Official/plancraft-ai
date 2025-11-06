import { db } from './firebaseAdmin.js'

const DEFAULT_PREFS = {
  enable_whatsapp: true,
  enable_email: true,
  enable_pwa: true,
  enable_voice: true,
  enable_sms: false,
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

function applyFromSource(prefs, source) {
  if (!source || typeof source !== 'object') return
  applyFlag(prefs, 'enable_whatsapp', source.enable_whatsapp ?? source.whatsapp)
  applyFlag(prefs, 'enable_email', source.enable_email ?? source.email)
  applyFlag(prefs, 'enable_pwa', source.enable_pwa ?? source.pwa ?? source.push ?? source.enable_push)
  applyFlag(prefs, 'enable_voice', source.enable_voice ?? source.voice ?? source.enable_voice_call ?? source.voice_call)
  applyFlag(prefs, 'enable_sms', source.enable_sms ?? source.sms ?? source.text)
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

  applyFromSource(prefs, notifications)
  applyFromSource(prefs, reminderPrefs)

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

  return prefs
}

export default {
  getUserPrefs,
}
