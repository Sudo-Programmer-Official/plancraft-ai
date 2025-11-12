import api from '@/services/api'

export async function submitFeedback(payload = {}) {
  const response = await api.post('/feedback', payload)
  return response?.data?.feedback || null
}
