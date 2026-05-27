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

export async function getProfile(userId) {
  const res = await api.get('/settings/profile', { params: { userId } })
  return res?.data?.profile || {}
}

export async function updateProfile(userId, profile) {
  const res = await api.post('/settings/profile', { userId, profile })
  return res?.data?.profile || {}
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

export async function updateOnboardingStatus(userId, onboarding) {
  if (!userId) throw new Error('Missing userId')
  const res = await api.post('/settings/onboarding', { userId, onboarding })
  return res?.data?.onboarding || {}
}

export async function requestWelcomeIntroCall(userId, options = {}) {
  if (!userId) throw new Error('Missing userId')
  const res = await api.post('/settings/welcome-call', {
    userId,
    force: options?.force === true,
  })
  return res?.data || { success: false }
}

export async function sendTestMorningCall(userId, message) {
  if (!userId) throw new Error('Missing userId')
  const res = await api.post('/settings/test-morning-call', { userId, message })
  return res?.data || { success: true }
}
