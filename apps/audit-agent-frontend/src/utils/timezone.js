// src/utils/timezone.js
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export function toUTC(localTime, tz) {
  if (!localTime) return null
  const zone = tz || (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  try {
    // If already ISO with timezone, dayjs will respect it
    const d = dayjs(localTime)
    if (d.isValid() && /Z|[+-]\d{2}:?\d{2}$/.test(String(localTime))) {
      return d.toDate().toISOString()
    }
  } catch {}
  try {
    const d = dayjs.tz(String(localTime), zone)
    if (d.isValid()) return d.utc().toISOString()
  } catch {}
  try {
    const d = new Date(localTime)
    if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString()
  } catch {}
  return null
}

export function toLocal(utcTime, tz) {
  if (!utcTime) return ''
  const zone = tz || (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  try {
    return dayjs.utc(utcTime).tz(zone).format('YYYY-MM-DD hh:mm A')
  } catch {}
  try {
    return new Date(utcTime).toLocaleString('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: zone,
    })
  } catch {
    return String(utcTime)
  }
}

