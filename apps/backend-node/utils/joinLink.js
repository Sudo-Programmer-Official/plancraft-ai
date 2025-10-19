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
    const any = fields.match(/https?:\/\/\S+/)
    if (any) return { url: any[0], provider: 'link' }
    return null
  } catch {
    return null
  }
}

