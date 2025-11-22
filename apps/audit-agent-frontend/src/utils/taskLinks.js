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

  const candidates = []
  const pushCandidate = (raw, source, label) => {
    const url = coerceUrl(raw)
    if (!url) return
    candidates.push({ url, source, label })
  }

  // Explicit meeting/join links first
  pushCandidate(ctx.meetingLink, 'ctx.meetingLink')
  pushCandidate(reminder.meetingLink, 'reminder.meetingLink')
  pushCandidate(ctx.joinUrl, 'ctx.joinUrl')
  pushCandidate(reminder.joinUrl, 'reminder.joinUrl')
  pushCandidate(ctx.meeting?.joinUrl, 'ctx.meeting.joinUrl')
  pushCandidate(reminder.meeting?.joinUrl, 'reminder.meeting.joinUrl')
  pushCandidate(ctx.meeting?.join?.url, 'ctx.meeting.join.url')
  pushCandidate(reminder.meeting?.join?.url, 'reminder.meeting.join.url')

  // Generic link fields
  pushCandidate(reminder.link, 'reminder.link')
  pushCandidate(ctx.link, 'ctx.link')

  // Calendar/event fallbacks
  pushCandidate(ctx.eventLink, 'ctx.eventLink')
  pushCandidate(ctx.calendarLink, 'ctx.calendarLink')
  pushCandidate(ctx.htmlLink, 'ctx.htmlLink')
  pushCandidate(reminder.eventLink, 'reminder.eventLink')
  pushCandidate(reminder.calendarLink, 'reminder.calendarLink')
  pushCandidate(reminder.htmlLink, 'reminder.htmlLink')
  pushCandidate(reminder.meeting?.htmlLink, 'reminder.meeting.htmlLink')

  if (!candidates.length) return null

  const providerFromUrl = (rawUrl) => {
    try {
      const { hostname, pathname } = new URL(rawUrl)
      const host = hostname.toLowerCase()
      const path = (pathname || '').toLowerCase()
      if (host.includes('meet.google.com')) return 'Google Meet'
      if (host.includes('zoom.us') || host.includes('zoom.com')) return 'Zoom'
      if (host.includes('teams.microsoft')) return 'Microsoft Teams'
      if (host.includes('webex')) return 'Webex'
      if (host.includes('whereby')) return 'Whereby'
      if (host.includes('around.co')) return 'Around'
      if (host.includes('ringcentral')) return 'RingCentral'
      if (host.includes('chime.aws')) return 'Amazon Chime'
      if (host.includes('calendly')) {
        if (path.includes('cancel') || path.includes('cancellation') || path.includes('resched')) return 'Calendly-cancel'
        return 'Calendly'
      }
      return ''
    } catch {
      return ''
    }
  }

  const scoreCandidate = (c) => {
    const provider = providerFromUrl(c.url)
    if (provider === 'Calendly-cancel') return -5
    if (provider === 'Calendly') return -2
    if (provider === 'Google Meet') return 5
    if (provider === 'Zoom') return 5
    if (provider === 'Microsoft Teams') return 4
    if (provider) return 3
    return 1
  }

  const best = candidates
    .map((c, idx) => ({ ...c, score: scoreCandidate(c), idx }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)[0]

  if (!best) return null
  const providerLabel = providerFromUrl(best.url) || ''

  const labelFromCtx =
    (typeof ctx.meetingLabel === 'string' && ctx.meetingLabel) ||
    (typeof ctx.meetingLink === 'object' && typeof ctx.meetingLink?.label === 'string' && ctx.meetingLink.label) ||
    (typeof reminder.meetingLink === 'object' &&
      typeof reminder.meetingLink?.label === 'string' &&
      reminder.meetingLink.label) ||
    (typeof ctx.link === 'object' && typeof ctx.link?.label === 'string' && ctx.link.label) ||
    (typeof reminder.link === 'object' && typeof reminder.link?.label === 'string' && reminder.link.label) ||
    null

  const label =
    labelFromCtx ||
    (providerLabel && providerLabel !== 'Calendly' && providerLabel !== 'Calendly-cancel'
      ? `Join ${providerLabel}`
      : 'Join meeting')

  return { url: best.url, label }
}
