// src/utils/timeUtils.js

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

// ------------------------------
// Safely convert to JS Date
// ------------------------------
export function toJsDate(v) {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === 'string') {
    // Handles both UTC ("Z") and TZ-aware ("-05:00") strings
    const d = dayjs(v)
    return d.isValid() ? d.toDate() : null
  }
  if (typeof v.toDate === 'function') return v.toDate()
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
  return null
}

// ------------------------------
// Grouping: Today / Tomorrow / Other
// ------------------------------
export function toLocalDayGroup(iso) {
  const d = dayjs(toJsDate(iso)).tz(tz)
  const today = dayjs().tz(tz)
  if (d.isSame(today, 'day')) return 'Today'
  if (d.isSame(today.add(1, 'day'), 'day')) return 'Tomorrow'
  return d.format('dddd, MMM D')
}

// ------------------------------
// Display: Dual Format
// ------------------------------
// export function formatDualTime(iso) {
//   const d = toJsDate(iso)
//   if (!d) return ''
//   const utc = dayjs.utc(d)
//   const local = utc.tz(tz)
//   return `${local.format('ddd, MMM D • h:mm A')} (Your Time) • ${utc.format('HH:mm')} UTC`
// }
export function formatDualTime(iso) {
  const d = toJsDate(iso)
  if (!d) return ''
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const utcTime = dayjs.utc(d)
  const local = utcTime.clone().tz(zone)
  return `${local.format('ddd, MMM D • h:mm A')} (Your Time) • ${utcTime.format('HH:mm')} UTC`
}

export function formatRelative(iso) {
  const d = toJsDate(iso)
  if (!d) return ''
  return dayjs.utc(d).tz(tz).fromNow()
}
// Timezone-safe helpers for building and displaying reminder times.
// These functions avoid UTC/local mismatches by:
// - Interpreting wall-clock inputs in the user's timezone
// - Converting to UTC ISO once for storage/scheduling
// - Converting stored UTC -> local for display

// Note: This file intentionally does not import dayjs again to avoid duplicate
// plugin registrations. If dayjs with timezone plugin is already available in
// your app bundle, these helpers will use it when present and fall back to
// native Date for safety.

/** Return the current user's IANA timezone (e.g., "America/Chicago"). */
export function getUserTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * Convert a local wall-clock date + time to a UTC ISO string.
 * Accepts strings like date="2025-10-11", time="11:00".
 */
export function toUtcIso(dateStr, timeStr, tz) {
  const zone = tz || getUserTz()
  const [y, m, d] = String(dateStr || '').split('-').map((n) => parseInt(n, 10))
  const [hh, mm] = String(timeStr || '00:00').split(':').map((n) => parseInt(n, 10))
  if (!y || !m || !d) return new Date().toISOString()

  // Prefer dayjs.tz when available; otherwise use native Date as local wall clock
  try {
    if (typeof dayjs !== 'undefined' && dayjs?.tz) {
      const yStr = String(y).padStart(4, '0')
      const mStr = String(m).padStart(2, '0')
      const dStr = String(d).padStart(2, '0')
      const hhStr = String(hh || 0).padStart(2, '0')
      const mmStr = String(mm || 0).padStart(2, '0')
      return dayjs.tz(`${yStr}-${mStr}-${dStr} ${hhStr}:${mmStr}`, zone, true).utc().toISOString()
    }
  } catch {}

  // Fallback: construct as local wall clock and return ISO (UTC)
  const local = new Date(y, (m - 1), d, (hh || 0), (mm || 0), 0, 0)
  return local.toISOString()
}

/** Normalize any ISO-like input to a UTC ISO string. */
export function ensureUtcIso(isoLike, tz) {
  try {
    if (!isoLike) return null
    const s = String(isoLike)
    // If already contains a zone (Z or ±HH:mm), convert once to UTC
    if (/[zZ]|[+-]\d\d:??\d\d$/.test(s)) {
      if (typeof dayjs !== 'undefined') return dayjs(s).utc().toISOString()
      return new Date(s).toISOString()
    }
    const zone = tz || getUserTz()
    if (typeof dayjs !== 'undefined' && dayjs?.tz) {
      return dayjs.tz(s, zone, true).utc().toISOString()
    }
    // best-effort fallback
    return new Date(s).toISOString()
  } catch {
    try { return new Date(isoLike).toISOString() } catch { return null }
  }
}

/**
 * Interpret an AI ISO string as a LOCAL wall-clock (ignore its trailing Z/offset)
 * and return a dayjs object in local tz when possible, otherwise null.
 */
export function aiIsoToLocalWall(aiIso, tz) {
  try {
    const zone = tz || getUserTz()
    const s = String(aiIso || '')
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/)
    if (m && typeof dayjs !== 'undefined' && dayjs?.tz) {
      const date = m[1]; const hh = m[2]; const mm = m[3]
      return dayjs.tz(`${date} ${hh}:${mm}`, zone, true)
    }
    if (typeof dayjs !== 'undefined') return dayjs.utc(s).tz(zone)
    return null
  } catch { return null }
}

/** Convenience wrapper for directly converting a single user-input string to UTC ISO.
 * Accepts either an ISO-like value or a "YYYY-MM-DD HH:mm" wall-clock string. */
export function convertToScheduledTime(userInputTime, tz) {
  const zone = tz || getUserTz()
  const s = String(userInputTime || '')
  // Try date + time first
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/)
  if (m) return toUtcIso(m[1], `${m[2]}:${m[3]}`, zone)
  return ensureUtcIso(s, zone)
}
