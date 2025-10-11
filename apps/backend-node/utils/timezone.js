// import dayjs from 'dayjs'
// import utc from 'dayjs/plugin/utc.js'
// import timezone from 'dayjs/plugin/timezone.js'

// dayjs.extend(utc)
// dayjs.extend(timezone)

// export function formatLocalTime(date, tz) {
//   try {
//     const zone = tz || (dayjs.tz && dayjs.tz.guess && dayjs.tz.guess()) || 'UTC'
//     // Do NOT call dayjs.utc(date) here; that would double shift values
//     return dayjs(date).tz(zone).format('hh:mm A')
//   } catch {
//     try { return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
//   }
// }

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Format a date/time string into human-friendly local time.
 * - `date`: Date | string | number
 * - `tz`: IANA timezone (e.g. "America/Chicago")
 */
export function formatLocalTime(date, tz) {
  try {
    const zone = tz || process.env.DEFAULT_TZ || dayjs.tz.guess() || 'UTC'
    return dayjs(date).tz(zone).format('h:mm A')
  } catch (e) {
    console.warn('[formatLocalTime] failed:', e.message)
    try {
      return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return ''
    }
  }
}
