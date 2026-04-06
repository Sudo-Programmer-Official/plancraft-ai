import { registerPlugin } from '@capacitor/core'
import { watch } from 'vue'
import { fetchAllTasksForWorkspace } from '@/services/firebaseService'
import { getPreferences } from '@/services/settingsService'
import { resolveReminderIso } from '@/utils/timeHelper'
import { isNativePackagedApp } from '@/utils/nativeAuthSupport'

const LocalReminder = registerPlugin('LocalReminder')

const MANAGED_PREFIX = 'task-reminder:'
const MAX_NATIVE_REMINDERS = 64
const MAX_SCHEDULE_DAYS = 365

let nativeReminderSyncInitialized = false
let queuedSyncContext = null
let queuedSyncPromise = null
let queuedSyncResolve = null
let queuedSyncReject = null
let queuedSyncTimer = null

function resolveActiveWorkspaceId(explicitWorkspaceId = null) {
  const normalized = String(explicitWorkspaceId || '').trim()
  if (normalized) return normalized

  try {
    return localStorage.getItem('activeWorkspaceId') || null
  } catch {
    return null
  }
}

function buildPermissionShape(result = {}, fallback = 'prompt') {
  const raw =
    String(
      result?.display ||
      result?.notifications ||
      result?.receive ||
      result?.status ||
      fallback
    )
      .trim()
      .toLowerCase() || fallback

  return {
    raw,
    granted: raw === 'granted' || raw === 'authorized' || raw === 'provisional' || raw === 'ephemeral',
    canPrompt: raw === 'prompt' || raw === 'prompt-with-rationale',
  }
}

function normalizeChannels(task) {
  if (Array.isArray(task?.reminderChannels)) {
    return task.reminderChannels.map((channel) => String(channel || '').toLowerCase())
  }
  if (Array.isArray(task?.channels)) {
    return task.channels.map((channel) => String(channel || '').toLowerCase())
  }
  return []
}

function truncateNotificationBody(value, limit = 180) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (trimmed.length <= limit) return trimmed
  return `${trimmed.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function buildReminderBody(task) {
  const details = truncateNotificationBody(task?.details)
  if (details) return details

  const when = [task?.date, task?.reminderTime].filter(Boolean).join(' ')
  if (when) return `Due ${when}`
  return 'A scheduled task is due now.'
}

function taskAllowsNativeReminder(task) {
  const channels = normalizeChannels(task)
  return !channels.length || channels.includes('pwa')
}

function buildManagedReminder(task) {
  if (!task?.id || task?.completed || !taskAllowsNativeReminder(task)) return null

  const scheduledAt = resolveReminderIso(task)
  if (!scheduledAt) return null

  const scheduledMs = Date.parse(scheduledAt)
  if (!Number.isFinite(scheduledMs)) return null

  const now = Date.now()
  if (scheduledMs <= now + 5000) return null
  if (scheduledMs > now + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000) return null

  return {
    id: `${MANAGED_PREFIX}${task.id}`,
    taskId: String(task.id),
    workspaceId: task?.workspaceId || null,
    title: truncateNotificationBody(task?.title || 'Task reminder', 80),
    body: buildReminderBody(task),
    scheduledAt,
  }
}

function parsePreferenceChannels(notifications = {}) {
  if (Array.isArray(notifications?.channels)) {
    return new Set(
      notifications.channels
        .map((channel) => String(channel || '').trim().toLowerCase())
        .filter(Boolean)
    )
  }

  return new Set(
    [
      notifications?.email && 'email',
      (notifications?.push || notifications?.pwa) && 'pwa',
      notifications?.whatsapp && 'whatsapp',
      notifications?.sms && 'sms',
      notifications?.voice_call && 'voice_call',
    ].filter(Boolean)
  )
}

async function getNativeReminderPreferences(userId) {
  if (!userId) return { notifications: {}, channels: new Set(), enabled: false }

  try {
    const preferences = await getPreferences(userId)
    const notifications = preferences?.notifications || {}
    const channels = parsePreferenceChannels(notifications)
    return {
      notifications,
      channels,
      enabled: channels.has('pwa'),
    }
  } catch (error) {
    console.warn('[NativeReminder] Failed to load preferences', error?.message || error)
    return { notifications: {}, channels: new Set(), enabled: false }
  }
}

function buildReminderPayloads(tasks = []) {
  const reminders = (Array.isArray(tasks) ? tasks : [])
    .map((task) => buildManagedReminder(task))
    .filter(Boolean)
    .sort((left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt))
    .slice(0, MAX_NATIVE_REMINDERS)

  return Array.from(new Map(reminders.map((reminder) => [reminder.id, reminder])).values())
}

async function clearManagedNativeReminders(reason = 'clear') {
  if (!isNativePackagedApp()) {
    return { ok: false, reason: 'unsupported' }
  }

  try {
    const result = await LocalReminder.sync({ reminders: [] })
    console.info('[NativeReminder] cleared managed reminders', { reason, result })
    return { ok: true, result }
  } catch (error) {
    console.warn('[NativeReminder] clear failed', error?.message || error)
    return { ok: false, error }
  }
}

export function isNativeLocalReminderSupported() {
  return isNativePackagedApp()
}

export async function getNativeReminderPermissionStatus() {
  if (!isNativeLocalReminderSupported()) {
    return buildPermissionShape({}, 'unsupported')
  }

  try {
    return buildPermissionShape(await LocalReminder.checkPermissions())
  } catch (error) {
    console.warn('[NativeReminder] checkPermissions failed', error?.message || error)
    return buildPermissionShape({}, 'prompt')
  }
}

export async function requestNativeReminderPermissions() {
  if (!isNativeLocalReminderSupported()) {
    return buildPermissionShape({}, 'unsupported')
  }

  try {
    return buildPermissionShape(await LocalReminder.requestPermissions())
  } catch (error) {
    console.warn('[NativeReminder] requestPermissions failed', error?.message || error)
    return buildPermissionShape({}, 'denied')
  }
}

export async function listPendingNativeTaskReminders() {
  if (!isNativeLocalReminderSupported()) return []

  try {
    const result = await LocalReminder.listPending()
    return Array.isArray(result?.notifications) ? result.notifications : []
  } catch (error) {
    console.warn('[NativeReminder] listPending failed', error?.message || error)
    return []
  }
}

export async function syncNativeReminderQueueNow({
  userId = null,
  workspaceId = null,
  tasks = null,
  reason = 'manual',
} = {}) {
  if (!isNativeLocalReminderSupported()) {
    return { ok: false, reason: 'unsupported' }
  }

  const resolvedWorkspaceId = resolveActiveWorkspaceId(workspaceId)
  if (!userId || !resolvedWorkspaceId) {
    return clearManagedNativeReminders(`${reason}:missing-context`)
  }

  const prefs = await getNativeReminderPreferences(userId)
  if (!prefs.enabled) {
    return clearManagedNativeReminders(`${reason}:disabled`)
  }

  const permission = await getNativeReminderPermissionStatus()
  if (!permission.granted) {
    console.info('[NativeReminder] skipped sync because permission is not granted', {
      reason,
      permission: permission.raw,
    })
    return clearManagedNativeReminders(`${reason}:permission-${permission.raw}`)
  }

  const sourceTasks = Array.isArray(tasks) ? tasks : await fetchAllTasksForWorkspace()
  const reminders = buildReminderPayloads(sourceTasks)

  try {
    const result = await LocalReminder.sync({ reminders })
    const pending = await listPendingNativeTaskReminders()
    console.info('[NativeReminder] sync complete', {
      reason,
      workspaceId: resolvedWorkspaceId,
      scheduled: reminders.length,
      pending: pending.length,
    })
    return { ok: true, result, reminders, pending }
  } catch (error) {
    console.warn('[NativeReminder] sync failed', error?.message || error)
    return { ok: false, error }
  }
}

export function queueNativeReminderSync(context = {}) {
  if (!isNativeLocalReminderSupported()) {
    return Promise.resolve({ ok: false, reason: 'unsupported' })
  }

  queuedSyncContext = {
    ...(queuedSyncContext || {}),
    ...context,
  }

  if (!queuedSyncPromise) {
    queuedSyncPromise = new Promise((resolve, reject) => {
      queuedSyncResolve = resolve
      queuedSyncReject = reject
    })
  }

  if (queuedSyncTimer) {
    clearTimeout(queuedSyncTimer)
  }

  const delayMs = Math.max(100, Number(context?.delayMs) || 450)
  queuedSyncTimer = window.setTimeout(async () => {
    const runContext = queuedSyncContext || {}
    const resolvePromise = queuedSyncResolve
    const rejectPromise = queuedSyncReject

    queuedSyncContext = null
    queuedSyncPromise = null
    queuedSyncResolve = null
    queuedSyncReject = null
    queuedSyncTimer = null

    try {
      const result = await syncNativeReminderQueueNow(runContext)
      resolvePromise?.(result)
    } catch (error) {
      rejectPromise?.(error)
    }
  }, delayMs)

  return queuedSyncPromise
}

export function initNativeReminderSync({ authStore, workspaceStore } = {}) {
  if (nativeReminderSyncInitialized || !isNativeLocalReminderSupported()) return
  nativeReminderSyncInitialized = true

  const queueCurrentSync = (reason) =>
    queueNativeReminderSync({
      userId: authStore?.user?.uid || null,
      workspaceId: workspaceStore?.activeWorkspaceId || null,
      reason,
    }).catch(() => {})

  watch(
    () => [authStore?.user?.uid || null, workspaceStore?.activeWorkspaceId || null],
    ([userId, workspaceId], [prevUserId, prevWorkspaceId]) => {
      if (!userId || !workspaceId) {
        queueCurrentSync('auth-or-workspace-cleared')
        return
      }

      if (userId !== prevUserId || workspaceId !== prevWorkspaceId) {
        queueCurrentSync('auth-or-workspace-changed')
        return
      }

      queueCurrentSync('auth-or-workspace-ready')
    },
    { immediate: true }
  )

  try {
    window.addEventListener('tasks:refresh-request', () => {
      queueCurrentSync('tasks-refresh-request')
    })
  } catch {}

  import('@capacitor/app')
    .then(({ App }) => App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        queueCurrentSync('app-resume')
      }
    }))
    .catch((error) => {
      console.warn('[NativeReminder] app state listener unavailable', error?.message || error)
    })
}
