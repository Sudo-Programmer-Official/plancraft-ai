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

// Schedule a reminder for a task using user preferences to pick channels
export async function scheduleReminder(userId, taskId, text, reminderTime, prefs = {}) {
  try {
    if (!userId || !taskId || !text) {
      return { ok: false, error: 'missing required fields' }
    }

    if (!reminderTime) return { ok: false, error: 'no reminder time set' }

    const p = prefs || {}
    const channels = [
      p.whatsapp && 'whatsapp',
      (p.pwa || p.push) && 'pwa',
      p.email && 'email',
    ].filter(Boolean)

    const toIso = (val) => {
      try {
        const d = new Date(val)
        if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString()
      } catch {}
      return typeof val === 'string' ? val : new Date().toISOString()
    }

    const payload = {
      userId,
      taskId,
      text,
      scheduledTime: toIso(reminderTime),
      channels,
    }

    const res = await api.post('/reminders/text', payload)
    console.log('[Reminder] scheduled', payload)
    return res?.data || { ok: true }
  } catch (err) {
    console.error('[Reminder] schedule failed:', err?.message || err)
    return { ok: false, error: err?.message || 'failed' }
  }
}
