import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

// Build an ISO string in UTC from local date (YYYY-MM-DD) and time (HH:mm) parts
// If time part is missing, it will default to 00:00 (start of day) 

function buildLocalIso(ymd, hhmm) {
  try {
    const [y, m, d] = String(ymd || '').split('-').map(n => parseInt(n, 10))
    const [hh, mm] = String(hhmm || '00:00').split(':').map(n => parseInt(n, 10))
    if (!y || !m || !d) throw new Error('invalid date parts')

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const yStr = String(y).padStart(4, '0')
    const mStr = String(m).padStart(2, '0')
    const dStr = String(d).padStart(2, '0')
    const hhStr = String(hh || 0).padStart(2, '0')
    const mmStr = String(mm || 0).padStart(2, '0')
    const local = dayjs.tz(`${yStr}-${mStr}-${dStr} ${hhStr}:${mmStr}`, tz, true)
    return local.utc().toISOString()
  } catch (err) {
    console.warn('buildLocalIso failed:', err)
    return new Date().toISOString()
  }
}
export { buildLocalIso }