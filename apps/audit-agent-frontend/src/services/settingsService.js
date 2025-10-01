// src/services/settingsService.js
import api from '@/services/api'

export async function updatePreferences(userId, preferences) {
  const res = await api.post('/settings/updatePreferences', { userId, preferences })
  return res.data
}

export async function getPreferences(userId) {
  const res = await api.get('/settings/preferences', { params: { userId } })
  return res.data?.preferences || {}
}

