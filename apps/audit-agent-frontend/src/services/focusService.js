import api from '@/services/api'

export async function saveFocusSession(session) {
  try {
    const { data } = await api.post('/focus/sessions', session)
    return data?.session || null
  } catch (err) {
    console.warn('[FocusService] save session failed', err?.response?.data || err?.message || err)
    return null
  }
}
