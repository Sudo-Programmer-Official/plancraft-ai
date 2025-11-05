// src/services/settingsService.js
import api from '@/services/api'

export async function updateIntegrations(userId, integrations) {
  const res = await api.post('/settings/updateIntegrations', { userId, integrations })
  return res?.data || { success: true }
}

export async function getIntegrations(userId) {
  const res = await api.get('/settings/integrations', { params: { userId } })
  return res?.data?.integrations || {}
}

// Back-compat helpers for views that expect preferences APIs here
export async function getPreferences(userId) {
  const res = await api.get('/settings/preferences', { params: { userId } })
  return res?.data?.preferences || {}
}

export async function updatePreferences(userId, preferences) {
  const res = await api.post('/settings/updatePreferences', { userId, preferences })
  return res?.data || { success: true }
}

export async function getReminderPreferences(userId) {
  if (!userId) return {}
  const res = await api.get(`/settings/${userId}/reminder-preferences`)
  return res?.data || {}
}
