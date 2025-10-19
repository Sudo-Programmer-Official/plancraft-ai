// Lightweight client helpers for Google Calendar integration
// These are no-ops unless backend feature flag ENABLE_GOOGLE_CALENDAR=1 is set.
import api from '@/services/api'

export async function getGoogleStatus(userId) {
  const { data } = await api.get('/google/status', { params: { userId } })
  return data?.integration || {}
}

export async function getGoogleCalendars(userId) {
  const { data } = await api.get('/google/calendars', { params: { userId } })
  return data?.calendars || []
}

export async function saveGoogleCalendarSelection(userId, selected, windowDays) {
  const { data } = await api.post('/google/calendars/select', { userId, selected, windowDays })
  return data?.ok === true
}

export async function triggerGoogleSyncNow(userId) {
  const { data } = await api.post('/google/sync/now', { userId })
  return data?.ok === true
}

export function getGoogleConnectUrl(userId) {
  const base = '/api/google/connect'
  const url = new URL(base, window.location.origin)
  url.searchParams.set('userId', userId)
  return url.toString()
}

// Preferred: ask backend for the consent URL via XHR (includes auth headers), then navigate.
export async function requestGoogleConnectUrl(userId) {
  const res = await api.get('/google/connect', {
    params: { userId },
    headers: { Accept: 'application/json' },
  })
  return res?.data?.url
}
