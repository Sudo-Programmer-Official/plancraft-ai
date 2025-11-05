import api from '@/services/api'

export async function sendPlannerQuery(query, { userId, include } = {}) {
  const payload = {
    query,
    userId,
  }
  if (Array.isArray(include) && include.length) {
    payload.include = include
  }
  const { data } = await api.post('/planner/query', payload)
  return data || {}
}
