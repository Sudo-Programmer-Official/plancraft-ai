import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

function sanitizeText(text = '', limit = 260) {
  if (!text) return ''
  const stripped = String(text)
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!stripped) return ''
  return stripped.length > limit ? `${stripped.slice(0, limit)}…` : stripped
}

function formatLocalLabel(event = {}, fallback) {
  if (event.localLabel) return event.localLabel
  const tz = event.timezone || fallback?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const startIso = fallback?.start || event.startTime
  if (!startIso) return null
  const start = dayjs.utc(startIso).tz(tz)
  if (!start.isValid()) return null
  const endIso = fallback?.end || event.endTime
  const end = endIso ? dayjs.utc(endIso).tz(tz) : null
  if (end?.isValid()) {
    const sameDay = start.isSame(end, 'day')
    if (sameDay) return `${start.format('ddd, MMM D • h:mm A')} – ${end.format('h:mm A')} ${start.format('z')}`
    return `${start.format('ddd, MMM D • h:mm A')} → ${end.format('ddd, MMM D • h:mm A')} ${start.format('z')}`
  }
  return `${start.format('ddd, MMM D • h:mm A')} ${start.format('z')}`
}

export function describeTaskDetails(task = {}) {
  if (!task) return ''
  if (task.source === 'google_calendar') {
    const event = task?.metadata?.externalEvent || {}
    const parts = []
    const when = formatLocalLabel(event, { start: task.start, end: task.end, timezone: task.timezone })
    if (when) parts.push(`When: ${when}`)
    if (event.location) parts.push(`Where: ${event.location}`)
    const attendees = Array.isArray(event.attendees)
      ? event.attendees.map((a) => a.email || a.displayName).filter(Boolean)
      : []
    if (attendees.length) {
      const preview = attendees.slice(0, 3).join(', ')
      parts.push(`Attendees: ${preview}${attendees.length > 3 ? '…' : ''}`)
    }
    const desc = sanitizeText(task.details || event.description)
    if (desc) parts.push(desc)
    return parts.join('\n')
  }
  return sanitizeText(task.details || '') || ''
}
