const TIMEZONE_KEY = 'user_timezone'
const TIMEZONE_MODE_KEY = 'user_timezone_mode'

export const TIMEZONE_MODES = Object.freeze({
  AUTO: 'auto',
  MANUAL: 'manual',
})

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
]

function readStorage(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) || '' : ''
  } catch {
    return ''
  }
}

function writeStorage(key, value) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  } catch {
    /* Storage may be unavailable in private or embedded browsers. */
  }
}

export function isValidTimezone(value) {
  const timezone = String(value || '').trim()
  if (!timezone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

export function detectDeviceTimezone() {
  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    return isValidTimezone(detected) ? detected : 'UTC'
  } catch {
    return 'UTC'
  }
}

export function readTimezonePreference() {
  const mode = readStorage(TIMEZONE_MODE_KEY) === TIMEZONE_MODES.MANUAL
    ? TIMEZONE_MODES.MANUAL
    : TIMEZONE_MODES.AUTO
  const storedTimezone = readStorage(TIMEZONE_KEY)

  return {
    mode,
    timezone: mode === TIMEZONE_MODES.MANUAL && isValidTimezone(storedTimezone)
      ? storedTimezone
      : detectDeviceTimezone(),
  }
}

/**
 * Resolve the zone used for new requests and newly-created reminders.
 * Automatic mode intentionally re-reads the device zone so travel is reflected
 * without requiring a logout or a manual settings update.
 */
export function getEffectiveUserTimezone() {
  const preference = readTimezonePreference()
  const timezone = preference.mode === TIMEZONE_MODES.MANUAL
    ? preference.timezone
    : detectDeviceTimezone()

  writeStorage(TIMEZONE_MODE_KEY, preference.mode)
  writeStorage(TIMEZONE_KEY, timezone)
  return timezone || 'UTC'
}

export function persistTimezonePreference(mode, timezone) {
  const nextMode = mode === TIMEZONE_MODES.MANUAL ? TIMEZONE_MODES.MANUAL : TIMEZONE_MODES.AUTO
  const nextTimezone = nextMode === TIMEZONE_MODES.MANUAL && isValidTimezone(timezone)
    ? String(timezone).trim()
    : detectDeviceTimezone()

  writeStorage(TIMEZONE_MODE_KEY, nextMode)
  writeStorage(TIMEZONE_KEY, nextTimezone)
  return { mode: nextMode, timezone: nextTimezone }
}

export function listSupportedTimezones() {
  try {
    const supported = typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : FALLBACK_TIMEZONES
    return [...new Set(['UTC', ...supported].filter(isValidTimezone))].sort((a, b) => a.localeCompare(b))
  } catch {
    return FALLBACK_TIMEZONES
  }
}

export function timezoneOffsetLabel(timezone, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(date)
    return parts.find((part) => part.type === 'timeZoneName')?.value || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function timezoneClockLabel(timezone, date = new Date()) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  } catch {
    return ''
  }
}

export function timezoneOptionLabel(timezone, date = new Date()) {
  const name = String(timezone || 'UTC').replace(/_/g, ' ')
  return `${name} (${timezoneOffsetLabel(timezone, date)})`
}

