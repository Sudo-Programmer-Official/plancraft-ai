function coerceUrl(candidate) {
  if (!candidate) return null
  if (typeof candidate === 'string') return candidate
  if (typeof candidate === 'object') {
    if (typeof candidate.url === 'string') return candidate.url
    if (typeof candidate.href === 'string') return candidate.href
    if (typeof candidate.link === 'string') return candidate.link
    if (typeof candidate.value === 'string') return candidate.value
    if (typeof candidate.uri === 'string') return candidate.uri
  }
  return null
}

const PROVIDER_LABELS = {
  google_calendar: 'Google Meet',
  googlemeet: 'Google Meet',
  zoom: 'Zoom',
  zoom_meeting: 'Zoom',
  teams: 'Microsoft Teams',
  microsoft_teams: 'Microsoft Teams',
  calendar: 'Calendar',
}

const CALENDAR_PROVIDER_CODES = new Set(['googlecalendar', 'outlookcalendar', 'calendar'])

export function providerLabelFromValue(rawProvider, { allowCalendarProviders = false } = {}) {
  if (!rawProvider) return ''
  const normalizedToken = String(rawProvider || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
  if (!allowCalendarProviders && CALENDAR_PROVIDER_CODES.has(normalizedToken)) return ''
  if (PROVIDER_LABELS[normalizedToken]) return PROVIDER_LABELS[normalizedToken]
  return String(rawProvider).replace(/[_-]/g, ' ').trim()
}

export function resolveTaskMeetingLink(task) {
  if (!task) return null
  const joinUrl =
    coerceUrl(task?.join?.url) ||
    coerceUrl(task?.join) ||
    coerceUrl(task?.meetingLink) ||
    null
  const metadata = task?.metadata || {}
  const externalMeta = metadata?.externalEvent || metadata?.external || {}
  const metadataJoin =
    coerceUrl(externalMeta?.joinUrl) ||
    coerceUrl(externalMeta?.meetingLink) ||
    null
  const metadataCalendar =
    coerceUrl(externalMeta?.eventUrl) ||
    coerceUrl(externalMeta?.htmlLink) ||
    coerceUrl(externalMeta?.calendarLink) ||
    null
  const fallbackLink = coerceUrl(task?.link) || coerceUrl(task?.htmlLink) || metadataCalendar

  const url = joinUrl || metadataJoin || fallbackLink
  if (!url) return null

  const rawProvider =
    task?.join?.provider ||
    metadata?.joinProvider ||
    externalMeta?.joinProvider ||
    metadata?.provider ||
    externalMeta?.provider ||
    ''
  const providerLabel = providerLabelFromValue(rawProvider)

  let labelBase = 'Open link'
  if (joinUrl || metadataJoin) {
    labelBase = providerLabel ? `Join ${providerLabel}` : 'Join meeting'
  } else if (metadataCalendar) {
    labelBase = 'Open calendar event'
  }

  return {
    url,
    label: labelBase,
  }
}

export function resolveReminderLink(reminder) {
  if (!reminder || typeof reminder !== 'object') return null
  const ctxRaw = reminder.context
  const ctx = ctxRaw && typeof ctxRaw === 'object' ? ctxRaw : {}

  const meetingUrl =
    coerceUrl(ctx.meetingLink) ||
    coerceUrl(reminder.meetingLink) ||
    coerceUrl(ctx.joinUrl) ||
    coerceUrl(reminder.joinUrl) ||
    coerceUrl(ctx.meeting?.joinUrl) ||
    coerceUrl(reminder.meeting?.joinUrl) ||
    coerceUrl(reminder.link) ||
    coerceUrl(ctx.link) ||
    null

  const fallbackUrl =
    coerceUrl(ctx.eventLink) ||
    coerceUrl(ctx.calendarLink) ||
    coerceUrl(ctx.htmlLink) ||
    coerceUrl(reminder.eventLink) ||
    coerceUrl(reminder.calendarLink) ||
    coerceUrl(reminder.htmlLink) ||
    coerceUrl(reminder.meeting?.htmlLink) ||
    null

  const extractedUrl = meetingUrl || fallbackUrl
  const url =
    typeof extractedUrl === 'string'
      ? extractedUrl
      : extractedUrl && typeof extractedUrl.toString === 'function'
        ? extractedUrl.toString()
        : null
  if (!url) return null

  const labelFromCtx =
    (typeof ctx.meetingLabel === 'string' && ctx.meetingLabel) ||
    (typeof ctx.meetingLink === 'object' && typeof ctx.meetingLink?.label === 'string' && ctx.meetingLink.label) ||
    (typeof reminder.meetingLink === 'object' &&
      typeof reminder.meetingLink?.label === 'string' &&
      reminder.meetingLink.label) ||
    (typeof ctx.link === 'object' && typeof ctx.link?.label === 'string' && ctx.link.label) ||
    (typeof reminder.link === 'object' && typeof reminder.link?.label === 'string' && reminder.link.label) ||
    null

  const rawProvider =
    ctx.meetingProvider ||
    ctx.meeting?.provider ||
    reminder.meeting?.provider ||
    ctx.provider ||
    reminder.provider ||
    ''
  const providerLabel = providerLabelFromValue(rawProvider)
  const label =
    labelFromCtx || (meetingUrl ? (providerLabel ? `Join ${providerLabel}` : 'Join meeting') : 'Open link')
  return { url, label }
}
