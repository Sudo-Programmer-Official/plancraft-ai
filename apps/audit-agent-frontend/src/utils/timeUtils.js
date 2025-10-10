// src/utils/timeUtils.js
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

export function toJsDate(v) {
  if (!v) return null
  if (v instanceof Date) return v
  if (typeof v === 'string') return new Date(v)
  if (typeof v.toDate === 'function') return v.toDate()
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
  return null
}

export function toLocalDayGroup(iso) {
  // Use tz or fallback to UTC if not available
  const d = dayjs.utc(toJsDate(iso)).tz(tz || 'UTC')
  const today = dayjs().tz(tz || 'UTC')
  if (d.isSame(today, 'day')) return 'Today'
  if (d.isSame(today.add(1, 'day'), 'day')) return 'Tomorrow'
  return d.format('dddd, MMM D')
}

export function formatDualTime(iso) {
  const d = toJsDate(iso)
  if (!d) return ''
  // Use tz or fallback to UTC if not available
  const local = dayjs.utc(d).tz(tz || 'UTC')
  const utcTime = dayjs.utc(d)
  return `${local.format('ddd, MMM D • h:mm A')} (Your Time) • ${utcTime.format('HH:mm')} UTC`
}

export function formatRelative(iso) {
  const d = toJsDate(iso)
  if (!d) return ''
  return dayjs.utc(d).tz(tz || 'UTC').fromNow()
}