// src/services/reminderService.js
import api from '@/services/api'

export async function getReminderStatus(userId, taskId) {
  try {
    const res = await api.get('/reminders', { params: { userId, taskId } })
    const items = res?.data?.items || []
    const hasActive = !!(res?.data?.hasActive ?? items.some(r => String(r?.status).toLowerCase() === 'scheduled' && !r?.sentAt))
    return { hasActive, items }
  } catch (e) {
    console.warn('getReminderStatus failed', e?.response?.data || e?.message)
    return { hasActive: false, items: [] }
  }
}

