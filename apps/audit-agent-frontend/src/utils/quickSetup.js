const QUICK_SETUP_STATE_KEY = 'pcai_quick_setup_state'
const QUICK_SETUP_SNOOZE_KEY = 'pcai_quick_setup_snooze_until'
const QUICK_SETUP_DONE_KEY = 'pcai_setup_done'

const PHONE_CHANNELS = new Set(['whatsapp', 'sms', 'voice_call'])
const CHANNEL_ALLOW_LIST = ['email', 'pwa', 'whatsapp', 'sms', 'voice_call']

function nowIso() {
  return new Date().toISOString()
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
}

export function normalizeQuickSetupChannels(channels) {
  return Array.from(
    new Set(
      (Array.isArray(channels) ? channels : [])
        .map((channel) => String(channel || '').toLowerCase())
        .filter((channel) => CHANNEL_ALLOW_LIST.includes(channel))
    )
  )
}

export function buildQuickSetupState({
  timezone,
  channels,
  phone,
  pushGranted,
  isNative = false,
} = {}) {
  const normalizedChannels = normalizeQuickSetupChannels(channels)
  const phoneValue = String(phone || '').trim()
  const timezoneValue = String(timezone || '').trim()
  const timezoneReady = !!timezoneValue && timezoneValue !== 'UTC'
  const channelsReady = normalizedChannels.length > 0
  const phoneReady = !!phoneValue
  const pushRelevant = !isNative
  const pushReady = !!pushGranted
  const requiredComplete = timezoneReady && channelsReady && phoneReady

  const steps = [
    { key: 'timezone', label: 'Timezone', complete: timezoneReady, required: true },
    { key: 'channels', label: 'Reminder channels', complete: channelsReady, required: true },
    { key: 'phone', label: 'Phone number', complete: phoneReady, required: true },
  ]

  if (pushRelevant) {
    steps.push({
      key: 'push',
      label: 'Browser push',
      complete: pushReady,
      required: false,
    })
  }

  const totalSteps = steps.length
  const completedSteps = steps.filter((step) => step.complete).length

  return {
    completed: requiredComplete,
    requiredComplete,
    completionPercent: clampPercent((completedSteps / Math.max(totalSteps, 1)) * 100),
    completedSteps,
    totalSteps,
    steps,
    timezone: timezoneValue || null,
    channels: normalizedChannels,
    phone: phoneValue || null,
    pushGranted: pushRelevant ? pushReady : null,
    native: !!isNative,
    updatedAt: nowIso(),
  }
}

export function readQuickSetupState() {
  try {
    const raw = localStorage.getItem(QUICK_SETUP_STATE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeQuickSetupState(state) {
  try {
    localStorage.setItem(QUICK_SETUP_STATE_KEY, JSON.stringify(state))
    if (state?.completed) localStorage.setItem(QUICK_SETUP_DONE_KEY, '1')
    else localStorage.removeItem(QUICK_SETUP_DONE_KEY)
  } catch {}
  return state
}

export function snoozeQuickSetup(hours = 24) {
  try {
    const until = new Date(Date.now() + Math.max(1, Number(hours) || 24) * 60 * 60 * 1000).toISOString()
    localStorage.setItem(QUICK_SETUP_SNOOZE_KEY, until)
    return until
  } catch {
    return null
  }
}

export function clearQuickSetupSnooze() {
  try {
    localStorage.removeItem(QUICK_SETUP_SNOOZE_KEY)
  } catch {}
}

export function readQuickSetupSnoozeUntil() {
  try {
    return localStorage.getItem(QUICK_SETUP_SNOOZE_KEY) || ''
  } catch {
    return ''
  }
}

export function isQuickSetupSnoozed() {
  try {
    const until = readQuickSetupSnoozeUntil()
    if (!until) return false
    const time = new Date(until).getTime()
    return Number.isFinite(time) && time > Date.now()
  } catch {
    return false
  }
}

export function getIncompleteQuickSetupLabels(state) {
  return (state?.steps || [])
    .filter((step) => step.required && !step.complete)
    .map((step) => step.label)
}

export function dispatchQuickSetupUpdated(state) {
  try {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('pcai:quick-setup-updated', { detail: state || null }))
  } catch {}
}
