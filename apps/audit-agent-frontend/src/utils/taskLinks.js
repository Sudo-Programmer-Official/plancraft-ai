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

export function resolveTaskMeetingLink(task) {
  if (!task) return null
  const joinUrl =
    coerceUrl(task?.join?.url) ||
    coerceUrl(task?.join) ||
    coerceUrl(task?.meetingLink) ||
    null
  const metadata = task?.metadata?.externalEvent || task?.metadata?.external || {}
  const metadataJoin =
    coerceUrl(metadata?.joinUrl) ||
    coerceUrl(metadata?.meetingLink) ||
    null
  const metadataCalendar =
    coerceUrl(metadata?.eventUrl) ||
    coerceUrl(metadata?.htmlLink) ||
    coerceUrl(metadata?.calendarLink) ||
    null
  const fallbackLink = coerceUrl(task?.link) || coerceUrl(task?.htmlLink) || metadataCalendar

  const url = joinUrl || metadataJoin || fallbackLink
  if (!url) return null

  const rawProvider = task?.join?.provider || metadata?.provider || ''
  const normalized = rawProvider.toLowerCase().replace(/[\s_-]+/g, '')
  const providerLabel = PROVIDER_LABELS[normalized] || (rawProvider ? rawProvider.replace(/[_-]/g, ' ') : '')

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

  const label = labelFromCtx || (meetingUrl ? 'Join meeting' : 'Open link')
  return { url, label }
}
