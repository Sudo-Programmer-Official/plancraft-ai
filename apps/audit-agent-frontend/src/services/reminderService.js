import api from '@/services/api'
import { updateTaskInFirebase } from '@/services/firebaseService'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { toLocalHHMM } from '@/utils/time'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export async function getReminderStatus(userId, taskId) {
  try {
    const res = await api.get('/reminders', { params: { userId, taskId } })
    const items = res?.data?.items || []
    const hasActive = !!(
      res?.data?.hasActive ??
      items.some((r) => String(r?.status).toLowerCase() === 'scheduled' && !r?.sentAt)
    )
    return { hasActive, items }
  } catch (e) {
    console.warn('getReminderStatus failed', e?.response?.data || e?.message)
    return { hasActive: false, items: [] }
  }
}

// Re-schedule a reminder `minutes` from now, keeping its original channels.
export async function snoozeReminder({ userId, taskId, reminderId, text, minutes = 10 }) {
  if (!userId || !text) return { ok: false, error: 'Missing required fields' }
  let channels = ['pwa']
  if (taskId) {
    const { items } = await getReminderStatus(userId, taskId)
    const original = items.find((r) => String(r?.id || r?._id || '') === String(reminderId || '')) || items[0]
    if (Array.isArray(original?.channels) && original.channels.length) channels = original.channels
  }
  try {
    const res = await api.post('/reminders/text', {
      userId,
      taskId: taskId || null,
      text,
      scheduledTime: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
      channels,
      timezone: getEffectiveUserTimezone(),
    })
    return res?.data || { ok: true }
  } catch (err) {
    console.warn('[Reminder] snooze failed', err?.response?.data || err?.message || err)
    return { ok: false, error: err?.message || 'failed' }
  }
}

// Optional fallback parser (NOT used anymore unless needed)
function toIso(val) {
  try {
    if (!val) return null

    // ✅ Already ISO with timezone → return as-is
    if (typeof val === 'string' && (val.endsWith('Z') || val.includes('+'))) return val

    const tz = getEffectiveUserTimezone()
    const local = dayjs.tz(val, tz)
    return local.isValid() ? local.toISOString() : null
  } catch (e) {
    console.warn('[toIso] Conversion failed:', e.message)
    return new Date().toISOString()
  }
}

// ✅ Schedule a reminder for a task
export async function scheduleReminder(userId, taskId, text, scheduledTime, prefs = {}) {
  try {
    if (!userId || !taskId || !text || !scheduledTime) {
      return { ok: false, error: 'Missing required fields' }
    }

    const tz = getEffectiveUserTimezone()
  const p = prefs || {}
  const channels = [
    p.whatsapp && 'whatsapp',
    (p.pwa || p.push) && 'pwa',
    p.email && 'email',
    p.sms && 'sms',
    p.voice_call && 'voice_call',
  ].filter(Boolean)

    // ✅ We assume scheduledTime is already UTC ISO (correct!)
    const payload = {
      userId,
      taskId,
      text,
      scheduledTime,
      channels,
      timezone: tz,
    }

    const res = await api.post('/reminders/text', payload)
    console.log('[Reminder] scheduled', payload)

    // ✅ Mirror reminderTime (HH:mm local) back to task for UI
    try {
      const localHHMM = toLocalHHMM(scheduledTime, tz)
      await updateTaskInFirebase({ id: taskId, reminderTime: localHHMM })
    } catch (e) {
      console.warn('[Reminder] Failed to mirror reminderTime to task', e?.message || e)
    }

    return res?.data || { ok: true }
  } catch (err) {
    console.error('[Reminder] schedule failed:', err?.message || err)
    return { ok: false, error: err?.message || 'failed' }
  }
}
