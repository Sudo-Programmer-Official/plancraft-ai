import dayjs from './dayjs.js'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export function formatLocalTime(date, tz) {
  try {
    const zone = tz || (dayjs.tz && dayjs.tz.guess && dayjs.tz.guess()) || 'UTC'
    // Include both date and time for clarity in templates
    return dayjs(date).tz(zone).format('ddd, MMM D • hh:mm A')
  } catch {
    try {
      return new Date(date).toLocaleString([], {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return '' }
  }
}
