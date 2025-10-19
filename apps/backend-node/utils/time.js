import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export function toYMD(date, tz) {
  try {
    const z = tz || (dayjs.tz && dayjs.tz.guess && dayjs.tz.guess()) || 'UTC'
    return dayjs(date).tz(z).format('YYYY-MM-DD')
  } catch {
    try { return dayjs(date).format('YYYY-MM-DD') } catch { return null }
  }
}

export function nowUtcIso() {
  try { return dayjs().utc().toISOString() } catch { return new Date().toISOString() }
}

