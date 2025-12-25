// Lightweight client helpers for Google Calendar integration
// These are no-ops unless backend feature flag ENABLE_GOOGLE_CALENDAR=1 is set.
import api from '@/services/api'
import { auth } from '@/firebase/init'

export async function getGoogleStatus(userId) {
  const { data } = await api.get('/google/status', { params: { userId } })
  return data?.integration || {}
}

export async function getGoogleCalendars(userId, accountId = null) {
  const { data } = await api.get('/google/calendars', { params: { userId, accountId } })
  return data?.calendars || data || []
}

export async function saveGoogleCalendarSelection(userId, selected, windowDays, accountId = null) {
  const { data } = await api.post('/google/calendars/select', { userId, selected, windowDays, accountId })
  return data?.ok === true
}

export async function triggerGoogleSyncNow(userId, accountId = null) {
  const { data } = await api.post('/google/sync/now', { userId, accountId })
  return data || {}
}

export function getGoogleConnectUrl(userId) {
  const base = '/api/google/connect'
  const url = new URL(base, window.location.origin)
  url.searchParams.set('userId', userId)
  return url.toString()
}

// Preferred: ask backend for the consent URL via XHR (includes auth headers), then navigate.
export async function requestGoogleConnectUrl(userId) {
  // Proactively refresh Firebase ID token to avoid backend 401 on stale tokens
  try {
    const user = auth?.currentUser
    if (user && user.getIdToken) await user.getIdToken(true)
  } catch {}
  const res = await api.get('/google/connect', {
    params: { userId },
    headers: { Accept: 'application/json' },
  })
  return res?.data?.url
}

export async function disconnectGoogleIntegration(userId, accountId = null) {
  const { data } = await api.delete('/google/calendars/disconnect', { data: { userId, accountId } })
  return data?.ok === true
}

export async function createGoogleCalendarEvent(userId, event, accountId = null, calendarId = null) {
  const { data } = await api.post('/integrations/google-calendar/events/create', { userId, accountId, calendarId, event })
  return data?.event || data
}

// Discord helpers
export async function getDiscordStatus(userId) {
  const { data } = await api.get('/integrations/discord/status', { params: { userId } })
  return data?.integration || {}
}

export async function requestDiscordConnectUrl(userId) {
  try {
    const user = auth?.currentUser
    if (user && user.getIdToken) await user.getIdToken(true)
  } catch {}
  const res = await api.post('/integrations/discord/connect', { userId }, { headers: { Accept: 'application/json' } })
  return res?.data?.url
}

export async function saveDiscordConfig(userId, payload) {
  const { data } = await api.post('/integrations/discord/config', { userId, ...payload })
  return data?.integration || {}
}

export async function triggerDiscordTest(userId, message, channelId = null, isDM = true) {
  const { data } = await api.post('/integrations/discord/test', { userId, message, channelId, isDM })
  return data || {}
}

export async function disconnectDiscord(userId) {
  const { data } = await api.post('/integrations/discord/disconnect', { userId })
  return data?.ok === true
}

// Outlook Calendar helpers
export async function getOutlookStatus(userId) {
  const { data } = await api.get('/integrations/outlook/status', { params: { userId } })
  return data?.integration || {}
}

export async function requestOutlookConnectUrl(userId) {
  try {
    const user = auth?.currentUser
    if (user && user.getIdToken) await user.getIdToken(true)
  } catch {}
  const res = await api.post(
    '/integrations/outlook/connect',
    { userId },
    { headers: { Accept: 'application/json' } },
  )
  return res?.data?.url
}

export async function triggerOutlookSyncNow(userId, accountId = null) {
  const { data } = await api.post('/integrations/outlook/sync', { userId, accountId })
  return data || {}
}

export async function disconnectOutlookIntegration(userId, accountId = null) {
  const { data } = await api.post('/integrations/outlook/disconnect', { userId, accountId })
  return data?.ok === true
}
