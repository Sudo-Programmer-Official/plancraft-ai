// src/utils/dateParser.js
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'

dayjs.extend(utc)
dayjs.extend(timezone)

// Normalize any parsed datetime (usually UTC ISO) into
// local date + time strings based on user's timezone.
export function normalizeParsedDateTime(parsedDateTime, userTz) {
  try {
    const tz = userTz || getEffectiveUserTimezone()
    if (!parsedDateTime) {
      const now = dayjs().tz(tz)
      return { date: now.format('YYYY-MM-DD'), time: '' }
    }

    // If the input is UTC ISO, convert from UTC → tz
    const dt = dayjs.utc(parsedDateTime).tz(tz)
    const now = dayjs().tz(tz)
    const target = dt.isAfter(now) ? dt : now

    return {
      date: target.format('YYYY-MM-DD'),
      time: target.format('HH:mm'),
    }
  } catch {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return { date: `${y}-${m}-${d}`, time: '' }
  }
}
