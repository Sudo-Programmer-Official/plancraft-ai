import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

// Format any date using the user's timezone. Fallback to Intl if tzdb missing
export function formatLocalTime(date, tz = 'America/Chicago', fmt = 'hh:mm A') {
  try {
    if (!date) return ''
    return dayjs(date).tz(tz).format(fmt)
  } catch {
    try {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: tz
      }).format(new Date(date))
    } catch {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }
}
