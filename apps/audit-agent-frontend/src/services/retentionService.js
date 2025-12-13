import api from './api'

export async function fetchRetentionTriggers() {
  const res = await api.get('/admin/retention/triggers')
  return res?.data?.triggers || []
}

export async function updateRetentionTrigger(key, payload) {
  if (!key) throw new Error('Trigger key required')
  const res = await api.post(`/admin/retention/triggers/${key}`, payload)
  return res?.data?.trigger || null
}

export async function fetchRetentionTemplates() {
  const res = await api.get('/admin/retention/templates')
  return res?.data?.templates || []
}

export async function saveRetentionTemplate(key, payload) {
  if (!key) throw new Error('Template key required')
  const res = await api.post(`/admin/retention/templates/${key}`, payload)
  return res?.data?.template || null
}

export async function fetchRetentionStats() {
  const res = await api.get('/admin/retention/stats')
  return res?.data?.stats || {}
}

export async function runRetentionSweep(limit = 10) {
  const res = await api.post('/admin/retention/run', { limit })
  return res?.data?.result || res?.data || {}
}

export default {
  fetchRetentionTriggers,
  updateRetentionTrigger,
  fetchRetentionTemplates,
  saveRetentionTemplate,
  fetchRetentionStats,
  runRetentionSweep,
}
