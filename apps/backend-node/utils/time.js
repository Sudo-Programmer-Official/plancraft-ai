import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export function normalizeDate(input) {
  if (!input) return null
  const coerce = (value) => {
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  try {
    if (input instanceof Date) {
      return coerce(input)
    }
    if (typeof input.toDate === 'function') {
      return normalizeDate(input.toDate())
    }
    if (typeof input === 'number') {
      const ms = input > 1e12 ? input : input * 1000
      return coerce(ms)
    }
    if (typeof input === 'string') {
      const trimmed = input.trim()
      if (!trimmed) return null
      const numeric = Number(trimmed)
      if (!Number.isNaN(numeric)) {
        return normalizeDate(numeric)
      }
      const parsed = dayjs(trimmed)
      return parsed.isValid() ? parsed.toDate() : null
    }
    if (typeof input === 'object') {
      const seconds = input.seconds ?? input._seconds
      const nanos = input.nanoseconds ?? input._nanoseconds ?? 0
      if (typeof seconds === 'number') {
        const ms = seconds * 1000 + Math.floor(nanos / 1e6)
        return coerce(ms)
      }
    }
    return coerce(input)
  } catch {
    return null
  }
}

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
