const PROVIDER_PATTERNS = [
  { provider: 'google_meet', regex: /https?:\/\/meet\.google\.com\/[^\s]+/i },
  { provider: 'google_meet', regex: /https?:\/\/g\.co\/meet\/?[^\s]*/i },
  { provider: 'zoom', regex: /https?:\/\/(?:[a-z0-9.-]*\.)?zoom\.(?:us|com)\/(?:j|my)\/[^\s]+/i },
  { provider: 'microsoft_teams', regex: /https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/i },
  { provider: 'webex', regex: /https?:\/\/(?:[a-z0-9.-]*\.)?webex\.com\/[^\s]+/i },
  { provider: 'gotomeeting', regex: /https?:\/\/meet\.goto\.(?:com|me)\/[^\s]+/i },
  { provider: 'whereby', regex: /https?:\/\/whereby\.com\/[^\s]+/i },
  { provider: 'bluejeans', regex: /https?:\/\/bluejeans\.com\/[^\s]+/i },
]

export function detectJoinProvider(url) {
  if (typeof url !== 'string' || !url) return null
  for (const pattern of PROVIDER_PATTERNS) {
    if (pattern.regex.test(url)) return pattern.provider
  }
  if (/meet\.google\.com\//i.test(url)) return 'google_meet'
  if (/zoom\.(?:us|com)\//i.test(url)) return 'zoom'
  if (/teams\.microsoft\.com/i.test(url)) return 'microsoft_teams'
  return null
}

export function extractJoinLink(event) {
  try {
    if (!event) return null
    // Google Meet
    if (event.hangoutLink) return { url: event.hangoutLink, provider: 'google_meet' }
    const entryPoints = event?.conferenceData?.entryPoints || []
    for (const ep of entryPoints) {
      const uri = ep?.uri || ep?.url
      if (!uri) continue
      if (/meet\.google\.com\//.test(uri)) return { url: uri, provider: 'google_meet' }
    }
    const fields = [event?.location, event?.description, event?.summary].filter(Boolean).join('\n')
    if (!fields) return null
    // Zoom
    const zoom = fields.match(/https?:\/\/(?:[a-z0-9.-]*\.)?zoom\.us\/(?:j|my)\/[^\s]+/i)
    if (zoom) return { url: zoom[0], provider: 'zoom' }
    // Teams
    const teams = fields.match(/https?:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s]+/i)
    if (teams) return { url: teams[0], provider: 'microsoft_teams' }
    // Generic first https link
    const allLinks = fields.match(/https?:\/\/\S+/g) || []
    const safeLinks = allLinks.filter((link) => !/[?=&/]?(cancel|resched|cancellation)/i.test(link))
    if (safeLinks.length) {
      const url = safeLinks[0]
      return { url, provider: detectJoinProvider(url) || 'link' }
    }
    if (allLinks.length) {
      const url = allLinks[0]
      return { url, provider: detectJoinProvider(url) || 'link' }
    }
    return null
  } catch {
    return null
  }
}
