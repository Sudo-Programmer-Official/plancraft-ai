import api from '@/services/api'

export async function fetchUpcomingMeetings(userId, options = {}) {
  if (!userId) return []
  const params = { userId }
  if (Number.isFinite(options.limit)) params.limit = options.limit
  if (Number.isFinite(options.hours)) params.hours = options.hours
  const { data } = await api.get('/calendar/upcoming', { params })
  return Array.isArray(data?.events) ? data.events : []
}
