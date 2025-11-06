import api from '@/services/api'

export async function fetchHabitSummary(userId) {
  try {
    const params = {}
    if (userId) params.userId = userId
    const { data } = await api.get('/habits/summary', { params })
    return {
      summary: data?.summary || null,
      windowDays: data?.windowDays || 7,
    }
  } catch (err) {
    console.warn('[HabitService] summary fetch failed', err?.response?.data || err?.message || err)
    return null
  }
}

export async function fetchCoachMessage(userId) {
  try {
    const params = {}
    if (userId) params.userId = userId
    const { data } = await api.get('/habits/coach', { params })
    return data?.message || null
  } catch (err) {
    console.warn('[HabitService] coach fetch failed', err?.response?.data || err?.message || err)
    return null
  }
}
