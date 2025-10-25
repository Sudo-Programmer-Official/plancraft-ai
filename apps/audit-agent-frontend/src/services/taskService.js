import { toLocalDateKey } from '@/utils/dateHelper'
import { addTaskToFirebase } from '@/services/firebaseService'
import { scheduleReminder } from '@/services/reminderService'
import { getPreferences as getUserPreferences } from '@/services/settingsService'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { hasNotificationSetup } from '@/utils/notificationCheck'
import { trackEvent } from '@/services/analytics'
import { useTasks } from '@/composables/useTasks'

const preferenceCache = new Map()

function buildLocalIso(ymd, hhmm) {
  try {
    const [year, month, day] = String(ymd || '').split('-').map((part) => parseInt(part, 10))
    const [hours, minutes] = String(hhmm || '00:00').split(':').map((part) => parseInt(part, 10))
    if (!year || !month || !day) throw new Error('Invalid date components')
    const localDate = new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0)
    return localDate.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

async function loadPreferences(uid) {
  if (!uid) return { notifications: {} }
  const cached = preferenceCache.get(uid)
  if (cached) return cached
  try {
    const prefs = (await getUserPreferences(uid)) || { notifications: {} }
    preferenceCache.set(uid, prefs)
    return prefs
  } catch (err) {
    console.warn('[taskService] failed to load user preferences', err)
    return { notifications: {} }
  }
}

function resolveReminderIso(dateYMD, reminderTime) {
  if (!reminderTime) return null
  if (typeof reminderTime === 'string' && reminderTime.includes('T')) return reminderTime
  return buildLocalIso(dateYMD, reminderTime)
}

function deriveChannels(prefs = {}) {
  if (!prefs) return []
  const chans = [
    prefs?.whatsapp && 'whatsapp',
    (prefs?.pwa || prefs?.push) && 'pwa',
    prefs?.email && 'email',
    prefs?.sms && 'sms',
    prefs?.voice_call && 'voice_call',
  ].filter(Boolean)
  return chans
}

export async function createTaskFromVoice({
  title,
  details = '',
  date = new Date(),
  reminderTime = null,
  order = 0,
  source = 'voice',
}) {
  const authStore = useAuthStore()
  const uid = authStore?.user?.uid
  if (!uid) throw new Error('User not logged in')

  const normalizedDate = typeof date === 'string' ? date : toLocalDateKey(date)
  const payload = {
    title: title?.trim() || 'Voice Task',
    details: details || '',
    completed: false,
    logs: [],
    date: normalizedDate,
    order,
    reminderTime: reminderTime || null,
    source,
  }

  const saved = await addTaskToFirebase(payload)

  let reminderInfo = null
  if (reminderTime) {
    const iso = resolveReminderIso(normalizedDate, reminderTime)
    const prefs = await loadPreferences(uid)
    const notifications = prefs?.notifications || prefs || {}
    const missingSetup = !hasNotificationSetup(notifications)
    const channels = deriveChannels(notifications)
    const timezone = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      } catch {
        return 'UTC'
      }
    })()

    let warning = null
    let fallback = false

    try {
      const resp = await api.post('/reminders/text', {
        userId: uid,
        taskId: saved.id,
        text: payload.title,
        scheduledTime: iso,
        channels: channels.length ? channels : undefined,
        timezone,
      })
      warning = resp?.headers?.['x-plan-warning'] || resp?.headers?.['X-Plan-Warning'] || null
      try {
        window.dispatchEvent(new CustomEvent('usage-refresh'))
      } catch {}
    } catch (err) {
      fallback = true
      await scheduleReminder(uid, saved.id, payload.title, iso, notifications)
      if (err?.response?.status === 403) {
        warning =
          err?.response?.data?.error ||
          'Daily reminder limit reached. Upgrade to Pro to continue scheduling reminders.'
      }
      try {
        window.dispatchEvent(new CustomEvent('usage-refresh'))
      } catch {}
    }

    reminderInfo = {
      scheduled: true,
      warning,
      fallback,
      missingSetup,
      iso,
    }
  }

  try {
    const taskStore = useTasks()
    if (taskStore?.tasks) {
      const current = taskStore.tasks.value || []
      taskStore.tasks.value = [saved, ...current.filter((task) => task.id !== saved.id)]
    }
  } catch (err) {
    console.warn('[taskService] failed to update task store', err)
  }

  try {
    trackEvent('Task Created', { source })
  } catch (err) {
    console.warn('[taskService] analytics failed', err)
  }

  try {
    window.dispatchEvent(new CustomEvent('task:created', { detail: { task: saved, source } }))
  } catch {}

  return {
    task: saved,
    reminder: reminderInfo,
  }
}

export default {
  createTaskFromVoice,
}
