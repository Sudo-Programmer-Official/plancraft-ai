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
