import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

try {
  const tz = dayjs.tz.guess()
  dayjs.tz.setDefault(tz)
  console.log(`[TimeInit] Default timezone set to ${tz}`)
} catch (e) {
  console.warn('[TimeInit] Failed to set default timezone:', e.message)
}

export { dayjs }