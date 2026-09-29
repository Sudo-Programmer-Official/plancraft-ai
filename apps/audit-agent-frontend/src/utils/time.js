import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'

dayjs.extend(utc)
dayjs.extend(timezone)

// Get user's local IANA timezone
export const getUserTimezone = () => {
  return getEffectiveUserTimezone()
}

// Convert a local date (YYYY-MM-DD) and HH:mm to a UTC ISO string
export const toUtcIso = (dateStr, timeStr = '00:00', tz = getUserTimezone()) => {
  try {
    const safeDate = String(dateStr || '').trim()
    const safeTime = String(timeStr || '00:00').trim()
    const local = dayjs.tz(`${safeDate}T${safeTime}`, tz)
    return local.utc().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// Convert a stored UTC ISO → local HH:mm
export const toLocalHHMM = (utcIso, tz = getUserTimezone()) => {
  try { return dayjs.utc(utcIso).tz(tz).format('HH:mm') } catch { return '' }
}

// Robust conversion of various Firestore/Date shapes → JS Date
export const toJsDate = (value) => {
  try {
    if (!value) return null
    if (typeof value === 'string') return new Date(value)
    if (value instanceof Date) return value
    if (typeof value.toDate === 'function') return value.toDate()
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000)
    if (typeof value._seconds === 'number') return new Date(value._seconds * 1000)
  } catch {}
  return null
}
