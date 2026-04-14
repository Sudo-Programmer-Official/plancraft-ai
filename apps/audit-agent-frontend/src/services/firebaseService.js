import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc,
  onSnapshot,
  limit,
  writeBatch,
} from "firebase/firestore";
import { signOut } from 'firebase/auth'
import { ElMessageBox } from 'element-plus'
import { toLocalDateKey } from "@/utils/dateHelper";
import api from '@/services/api'
import { db, auth } from '@/firebase/init'
import { updateStreakOnEntry } from '@/services/streakService'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { clearStoredAuthArtifacts, readNativeIosAuthSnapshot } from '@/utils/authStorage'
import { isIosPackagedApp } from '@/utils/nativeAuthSupport'
import {
  computeNextRecurringDate,
  computeReminderScheduleIso,
  normalizeReminderOffsetDays,
  normalizeTaskRepeat,
} from '@/utils/taskRecurrence'

const tasksRef = collection(db, "tasks");
const journalRef = collection(db, "journalEntries");

function currentWorkspaceId() {
  try {
    const store = useWorkspaceStore()
    return store?.activeWorkspaceId || localStorage.getItem('activeWorkspaceId') || null
  } catch {
    try {
      return localStorage.getItem('activeWorkspaceId')
    } catch {
      return null
    }
  }
}

function currentSessionContext() {
  try {
    const firebaseUser = auth?.currentUser || null
    if (firebaseUser?.uid) {
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        firebaseUser,
      }
    }
  } catch {}

  try {
    const nativeSnapshot = readNativeIosAuthSnapshot()
    if (nativeSnapshot?.localId) {
      return {
        uid: String(nativeSnapshot.localId),
        email: nativeSnapshot.email || null,
        firebaseUser: null,
      }
    }
  } catch {}

  try {
    const raw = localStorage.getItem('user')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.uid) {
        return {
          uid: String(parsed.uid),
          email: parsed.email || null,
          firebaseUser: null,
        }
      }
    }
  } catch {}

  return {
    uid: null,
    email: null,
    firebaseUser: null,
  }
}

function withTimeout(promise, ms = 6000, label = 'request') {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

function resolveTasksRef() {
  // Shared task collection keyed by workspaceId
  return tasksRef
}

function normalizeTaskDate(value) {
  try {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (/\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed
    }
    if (value?.toDate) return toLocalDateKey(value.toDate())
    if (value instanceof Date || typeof value === 'number') {
      const d = new Date(value)
      if (!Number.isNaN(d.getTime())) return toLocalDateKey(d)
    }
  } catch {
    /* fall back below */
  }
  return toLocalDateKey(new Date())
}

function cloneTaskMetadata(metadata = {}, additions = {}) {
  const base = metadata && typeof metadata === 'object' ? { ...metadata } : {}
  const extra = additions && typeof additions === 'object' ? additions : {}
  return { ...base, ...extra }
}

function normalizeReminderConfig(value, fallbackOffsetDays = null) {
  if (!value || typeof value !== 'object') {
    const fallback = normalizeReminderOffsetDays(fallbackOffsetDays, { fallback: null })
    if (fallback && fallback > 0) {
      return { offsetDays: fallback, includeOnDue: true }
    }
    return null
  }

  const includeOnDue = value.includeOnDue !== false
  const offsetDays = normalizeReminderOffsetDays(value.offsetDays, { fallback: fallbackOffsetDays })
  const next = { includeOnDue }
  if (offsetDays && offsetDays > 0) next.offsetDays = offsetDays
  return next
}

export async function ensureRecurringNextTask(task) {
  const repeat = normalizeTaskRepeat(task?.repeat)
  if (!repeat || !task?.completed) return null

  const sourceDate = normalizeTaskDate(task?.date || task?.dueDate || task?.plannedDate)
  const nextDate = computeNextRecurringDate(sourceDate, repeat)
  if (!nextDate) return null

  const repeatMeta = task?.repeatMeta && typeof task.repeatMeta === 'object' ? task.repeatMeta : {}
  if (repeatMeta?.lastSpawnedDate === nextDate) return null

  const timezoneHint =
    (typeof task?.timezone === 'string' && task.timezone.trim()) ||
    (typeof task?.metadata?.timezone === 'string' && task.metadata.timezone.trim()) ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC'
  const reminderOffsetDays = normalizeReminderOffsetDays(task?.reminderOffsetDays, { fallback: 0 }) || 0
  const reminderTime = typeof task?.reminderTime === 'string' && task.reminderTime.trim()
    ? task.reminderTime.trim()
    : null
  const scheduledTime = reminderTime
    ? computeReminderScheduleIso({
        date: nextDate,
        reminderTime,
        timezone: timezoneHint,
        reminderOffsetDays,
      })
    : null

  const nextTask = {
    title: task?.title || 'Recurring task',
    details: task?.details || '',
    category: task?.category || 'Uncategorized',
    date: nextDate,
    completed: false,
    attachments: Array.isArray(task?.attachments) ? task.attachments : [],
    link: task?.link || null,
    priority: task?.priority ?? null,
    duration: Number.isFinite(task?.duration) ? task.duration : null,
    estimate_minutes: Number.isFinite(task?.estimate_minutes) ? task.estimate_minutes : null,
    scheduledTime,
    reminderTime,
    reminderChannels: Array.isArray(task?.reminderChannels) ? task.reminderChannels : null,
    channels: Array.isArray(task?.channels)
      ? task.channels
      : Array.isArray(task?.reminderChannels)
        ? task.reminderChannels
        : null,
    timezone: timezoneHint,
    source: task?.source || 'recurring',
    timeHint: task?.timeHint || null,
    relation: task?.timeRelation || task?.relation || null,
    gapMinutes: Number.isFinite(task?.gapMinutes) ? task.gapMinutes : null,
    confidence: Number.isFinite(task?.timeConfidence) ? task.timeConfidence : Number.isFinite(task?.confidence) ? task.confidence : null,
    meta: task?.timeMeta && typeof task.timeMeta === 'object' ? task.timeMeta : null,
    repeat,
    reminderOffsetDays: reminderOffsetDays || 0,
    reminder: normalizeReminderConfig(task?.reminder, reminderOffsetDays || 0),
    metadata: cloneTaskMetadata(task?.metadata, {
      recurringOriginTaskId: task?.id || null,
      recurringGeneratedAt: new Date().toISOString(),
      recurringPreviousDate: sourceDate,
    }),
    order: Number.isFinite(task?.order) ? task.order : 0,
  }

  const saved = await addTaskToFirebase(nextTask)
  const nextRepeatMeta = {
    ...repeatMeta,
    lastSpawnedDate: nextDate,
    lastSpawnedTaskId: saved?.id || null,
    advancedAt: new Date().toISOString(),
  }
  await updateTaskInFirebase({ id: task.id, repeatMeta: nextRepeatMeta })
  task.repeatMeta = nextRepeatMeta
  return saved
}

function taskDocRef(taskId) {
  return doc(db, 'tasks', taskId)
}

function mapTaskDoc(docSnap) {
  const data = docSnap.data()
  const storedWorkspaceId = data.workspaceId || null
  return {
    id: docSnap.id,
    ...data,
    workspaceId: storedWorkspaceId,
    orphanedWorkspace: !storedWorkspaceId,
    date: typeof data.date === 'string' ? data.date : toLocalDateKey(data.date),
  }
}

const INTERNAL_ASSERTION_PATTERN = /INTERNAL ASSERTION FAILED/i
let attemptedFirestoreRecovery = false

function looksLikeFirestoreInternalError(error) {
  if (!error) return false
  const code = error?.code
  const message = String(error?.message || '')
  return code === 'internal' || INTERNAL_ASSERTION_PATTERN.test(message)
}

function deleteIndexedDb(name) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name)
      req.onsuccess = req.onerror = req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function recoverFromFirestoreInternalError(error) {
  if (attemptedFirestoreRecovery) return
  if (typeof indexedDB === 'undefined') return
  attemptedFirestoreRecovery = true

  const candidates = new Set(['firebase-firestore-database', 'firestore/[DEFAULT]'])
  const projectId = db?.app?.options?.projectId || null
  if (projectId) {
    candidates.add(`firebase-firestore-database-${projectId}`)
    candidates.add(`firestore/${projectId}`)
  }

  if (indexedDB.databases) {
    try {
      const dbs = await indexedDB.databases()
      dbs.forEach((info) => {
        if (info?.name && info.name.toLowerCase().includes('firestore')) candidates.add(info.name)
      })
    } catch {
      /* noop */
    }
  }

  await Promise.all(Array.from(candidates).map((name) => deleteIndexedDb(name)))
  console.warn('[firestore] Cleared local cache after internal error; reload if issues persist.', {
    code: error?.code,
  })
}

async function createTaskViaApi(userId, workspaceId, payload) {
  const request = api.post(
    '/tasks/create',
    {
      userId,
      workspaceId,
      ...payload,
      options: {
        silent: true,
        skipReminder: true,
        origin: 'ios_client',
      },
    },
    {
      headers: {
        'x-workspace-id': workspaceId,
      },
    },
  )

  const res = await withTimeout(request, 10000, 'task create api')
  const task = res?.data?.task
  if (!task?.id) {
    throw new Error('Task create API did not return a task id')
  }
  return task
}

function dispatchTaskRefresh(detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent('tasks:refresh-request', { detail }))
  } catch {
    /* noop */
  }
}

function shouldUseTaskReadApi() {
  return isIosPackagedApp()
}

function shouldFallbackTaskReadToApi(error) {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()
  return (
    shouldUseTaskReadApi() ||
    looksLikeFirestoreInternalError(error) ||
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    message.includes('timed out') ||
    message.includes('timeout')
  )
}

function normalizeApiTaskRecord(task = {}) {
  const storedWorkspaceId =
    typeof task?.workspaceId === 'string' && task.workspaceId.trim() ? task.workspaceId.trim() : null
  return {
    ...task,
    workspaceId: storedWorkspaceId,
    orphanedWorkspace: !storedWorkspaceId,
    date: normalizeTaskDate(task?.date || task?.dueDate),
  }
}

async function fetchTasksViaApi({ date = null, startDate = null, endDate = null } = {}) {
  const session = currentSessionContext()
  if (!session?.uid) return []
  const wsId = currentWorkspaceId()
  if (!wsId) return []

  console.info('[TaskRead] using backend task list', {
    workspaceId: wsId,
    date: date || null,
    startDate: startDate || null,
    endDate: endDate || null,
    nativeIos: shouldUseTaskReadApi(),
  })

  const params = {
    userId: session.uid,
    workspaceId: wsId,
  }
  if (date) params.date = date
  if (startDate) params.startDate = startDate
  if (endDate) params.endDate = endDate

  const request = api.get('/tasks', {
    params,
    headers: {
      'x-workspace-id': wsId,
    },
  })
  const res = await withTimeout(request, 10000, 'task list api')
  const items = Array.isArray(res?.data?.items) ? res.data.items : []
  console.info('[TaskRead] backend task list resolved', {
    workspaceId: wsId,
    count: items.length,
    date: date || null,
    startDate: startDate || null,
    endDate: endDate || null,
  })
  return items.map((task) => normalizeApiTaskRecord(task))
}

async function fetchTasksWithApiFallback(firestoreLoader, filters = {}, label = 'tasks') {
  if (shouldUseTaskReadApi()) {
    try {
      return await fetchTasksViaApi(filters)
    } catch (error) {
      console.warn(`[TaskRead] ${label} api read failed; retrying firestore`, error?.message || error)
    }
  }
  try {
    return await firestoreLoader()
  } catch (error) {
    if (!shouldFallbackTaskReadToApi(error)) throw error
    console.warn(`[TaskRead] ${label} falling back to backend api`, error?.message || error)
    return fetchTasksViaApi(filters)
  }
}

// Prevent spamming multiple auth-expired dialogs at once
let authDialogOpen = false

function clearSessionAndRouteToLogin() {
  clearStoredAuthArtifacts()
  try {
    import('@/stores/authStore').then((mod) => {
      try {
        mod.useAuthStore().resetAuth()
      } catch {}
    }).catch(() => {})
  } catch {}

  Promise.resolve(signOut(auth)).catch(() => {}).finally(() => {
    try {
      window.location.replace('/login?expired=1')
    } catch {
      window.location.href = '/login?expired=1'
    }
  })
}

/**
 * Global auth-expiry handler for Firestore/auth errors.
 * Shows a blocking alert prompting user to reload and sign in again.
 */
export function handleAuthError(error) {
  const code = error?.code
  const message = String(error?.message || '')
  const looksInternal = looksLikeFirestoreInternalError(error)
  if (looksInternal) {
    recoverFromFirestoreInternalError(error).catch(() => {})
  }
  const hasUser = !!auth?.currentUser
  const tokenExpired =
    code === 'auth/id-token-expired' ||
    code === 'auth/user-token-expired' ||
    /id token/i.test(message) ||
    /token (expired|revoked)/i.test(message)
  const unauthenticated =
    code === 'unauthenticated' ||
    code === 'auth/user-disabled' ||
    /unauthenticated/i.test(message)

  const permissionDenied = code === 'permission-denied' || /permission/i.test(message)
  const permissionButSignedIn =
    permissionDenied &&
    hasUser &&
    !tokenExpired &&
    !unauthenticated &&
    !/token|auth/i.test(message)

  // If we have a signed-in user and hit a permission error (e.g., legacy collections),
  // do not force a logout; surface as a warning only.
  if (permissionButSignedIn) {
    console.warn('[Auth] Permission error while signed in; skipping session-expired modal.', {
      code,
      message,
    })
    return
  }

  const shouldPrompt = !hasUser || tokenExpired || unauthenticated || permissionDenied
  if (!shouldPrompt) return
  if (authDialogOpen) return
  authDialogOpen = true

  try {
    ElMessageBox.alert(
      'Your session has expired. Please log in again to continue.',
      'Session Expired',
      {
        confirmButtonText: 'Reload & Login',
        type: 'warning',
        callback: () => {
          clearSessionAndRouteToLogin()
        },
      },
    )
  } catch {
    // If UI libs not ready, fallback to hard reload
    clearSessionAndRouteToLogin()
  }
}

/**
 * Wrap a Firestore action and surface auth errors globally.
 */
async function safeAction(promise) {
  try {
    return await promise
  } catch (err) {
    handleAuthError(err)
    throw err
  }
}

/**
 * 🗓 Fetch only today’s tasks for logged-in user
 */
export async function fetchTasks() {
  return fetchTasksForToday();
}
export async function fetchTasksForToday() {
  const session = currentSessionContext()
  if (!session?.uid) return []

  const today = toLocalDateKey(new Date()); // YYYY-MM-DD local
  const wsId = currentWorkspaceId()
  if (!wsId) return []

  return fetchTasksWithApiFallback(async () => {
    const scopedTasks = resolveTasksRef()
    const q = query(
      scopedTasks,
      where("workspaceId", "==", wsId),
      where("date", "==", today),
      orderBy("order", "asc")
    );

    const snapshot = await safeAction(withTimeout(getDocs(q), 8000, 'task read today'))
    return snapshot.docs.map(mapTaskDoc)
  }, { date: today }, 'today')
}

/**
 * 🗓 Fetch tasks for a specific date (YYYY-MM-DD)
 */
export async function fetchTasksByDate(dateStr) {
  const session = currentSessionContext()
  if (!session?.uid) return []
  const wsId = currentWorkspaceId()
  if (!wsId) return []
  return fetchTasksWithApiFallback(async () => {
    const scopedTasks = resolveTasksRef()
    const qy = query(
      scopedTasks,
      where('workspaceId', '==', wsId),
      where('date', '==', dateStr),
      orderBy('order', 'asc'),
    )
    const snap = await safeAction(withTimeout(getDocs(qy), 8000, 'task read date'))
    return snap.docs.map(mapTaskDoc)
  }, { date: dateStr }, 'date')
}

/**
 * 📅 Fetch tasks between two dates inclusive (YYYY-MM-DD)
 */
export async function fetchTasksBetween(startYMD, endYMD) {
  const session = currentSessionContext()
  if (!session?.uid) return []
  const wsId = currentWorkspaceId()
  if (!wsId) return []
  return fetchTasksWithApiFallback(async () => {
    const scopedTasks = resolveTasksRef()
    const qy = query(
      scopedTasks,
      where('workspaceId', '==', wsId),
      where('date', '>=', startYMD),
      where('date', '<=', endYMD),
      orderBy('date', 'asc'),
      orderBy('order', 'asc'),
    )
    const snap = await safeAction(withTimeout(getDocs(qy), 8000, 'task read range'))
    return snap.docs.map(mapTaskDoc)
  }, { startDate: startYMD, endDate: endYMD }, 'range')
}

/**
 * 📚 Fetch every task for the active workspace (single source of truth)
 */
export async function fetchAllTasksForWorkspace() {
  const session = currentSessionContext()
  if (!session?.uid) return []
  const wsId = currentWorkspaceId()
  if (!wsId) return []
  return fetchTasksWithApiFallback(async () => {
    const scopedTasks = resolveTasksRef()
    const primaryQuery = query(scopedTasks, where('workspaceId', '==', wsId))
    const primarySnap = await safeAction(withTimeout(getDocs(primaryQuery), 8000, 'task read workspace'))
    return primarySnap.docs.map(mapTaskDoc)
  }, {}, 'workspace')
}

/**
 * ⏩ Find unfinished tasks scheduled before a given date (YYYY-MM-DD)
 */
export async function fetchUnfinishedTasksBefore(ymd) {
  const session = currentSessionContext()
  if (!session?.uid) return []
  const wsId = currentWorkspaceId()
  if (!wsId) return []
  const scopedTasks = resolveTasksRef()
  const target = typeof ymd === 'string' && /\d{4}-\d{2}-\d{2}/.test(ymd)
    ? ymd
    : toLocalDateKey(new Date(ymd || Date.now()))

  async function runQuery(includeCompletedFilter = true) {
    const clauses = [where('workspaceId', '==', wsId)]
    clauses.push(where('date', '<', target))
    if (includeCompletedFilter) clauses.push(where('completed', '==', false))
    const qy = query(scopedTasks, ...clauses, orderBy('date', 'asc'))
    return safeAction(withTimeout(getDocs(qy), 8000, 'task read unfinished'))
  }

  let snap = null
  try {
    snap = await runQuery(true)
  } catch {
    try {
      snap = await runQuery(false)
    } catch (err) {
      console.warn('[fetchUnfinishedTasksBefore] workspace query failed', err?.message || err)
    }
  }

  const tasks = snap?.docs?.map(mapTaskDoc) || []
  return tasks.filter((t) => t.completed === false)
}

/**
 * ➕ Add a new task
 */
/**
 * ✅ Add a new task to Firestore
 */

async function syncTaskNotification(userId, taskId, payload) {
  try {
    const clientNow = new Date().toISOString()
    const request = api.post('/tasks/announce', {
      userId,
      task: {
        id: taskId,
        title: payload.title,
        details: payload.details,
        workspaceId: payload.workspaceId || currentWorkspaceId() || null,
        date: payload.date,
        reminderTime: payload.reminderTime ?? null,
        scheduledTime: payload.scheduledTime ?? null,
        reminderChannels: payload.reminderChannels ?? null,
        channels: payload.channels ?? null,
        timezone: payload.timezone ?? null,
      },
      schedule: payload.reminderTime != null || payload.scheduledTime != null,
      clientNow,
    })
    const res = await withTimeout(request, 6000, 'task notification sync')
    return res?.data || null
  } catch (err) {
    console.warn('[TaskSync] notify failed', err?.response?.data || err?.message || err)
    return null
  }
}

export async function addTaskToFirebase(task, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'User not logged in' })
    throw new Error("User not logged in");
  }
  const wsId = currentWorkspaceId()
  if (!wsId) throw new Error('No active workspace selected')

  // Prepare safe payload
  const payload = {
    title: task?.title || "New Task",
    details: task?.details || "",
    completed: task?.completed ?? false,
    category: typeof task?.category === 'string' && task.category.trim()
      ? task.category.trim()
      : 'Uncategorized',
    logs: Array.isArray(task?.logs) ? task.logs : [],
    attachments: Array.isArray(task?.attachments) ? task.attachments : [],
    date: normalizeTaskDate(task?.date || task?.dueDate), // YYYY-MM-DD
    order: task?.order ?? 0,
  }

  if (typeof task?.link === 'string') payload.link = task.link.trim()
  if ('reminderTime' in task) payload.reminderTime = task.reminderTime ?? null
  if ('timezone' in task && task.timezone) payload.timezone = task.timezone
  if ('scheduledTime' in task) payload.scheduledTime = task.scheduledTime ?? null
  if ('time' in task) payload.time = task.time ?? null
  if ('source' in task) payload.source = task.source || 'manual'
  if ('duration' in task) payload.duration = task.duration
  if ('metadata' in task) payload.metadata = task.metadata
  const repeatRule = normalizeTaskRepeat(task?.repeat)
  if ('repeat' in task && repeatRule) payload.repeat = repeatRule
  if ('repeatMeta' in task) {
    payload.repeatMeta = task?.repeatMeta && typeof task.repeatMeta === 'object' ? task.repeatMeta : null
  }
  if ('reminderOffsetDays' in task) {
    payload.reminderOffsetDays = normalizeReminderOffsetDays(task?.reminderOffsetDays, { fallback: 0 })
  }
  if ('reminder' in task) {
    payload.reminder = normalizeReminderConfig(task?.reminder, task?.reminderOffsetDays)
  }

  if ('estimate_minutes' in task) {
    const est = Number(task.estimate_minutes)
    payload.estimate_minutes = Number.isFinite(est) && est > 0 ? est : null
  }

  if ('channels' in task) payload.channels = Array.isArray(task.channels) ? task.channels : null
  if ('reminderChannels' in task) {
    payload.reminderChannels = Array.isArray(task.reminderChannels) ? task.reminderChannels : null
  }
  if ('timeHint' in task) payload.timeHint = task.timeHint || null
  if ('relation' in task) payload.timeRelation = task.relation || null
  if ('gapMinutes' in task) {
    const gap = Number(task.gapMinutes)
    payload.gapMinutes = Number.isFinite(gap) && gap >= 0 ? gap : null
  }
  if ('confidence' in task) {
    const conf = Number(task.confidence)
    payload.timeConfidence = Number.isFinite(conf) ? conf : null
  }
  if ('meta' in task) payload.timeMeta = task.meta || null

  payload.workspaceId = wsId
  let savedTask
  if (isIosPackagedApp()) {
    console.info('[TaskCreate] using backend create route on native iOS', {
      workspaceId: wsId,
      title: payload.title,
      date: payload.date,
    })
    const apiTask = await createTaskViaApi(user.uid, wsId, payload)
    savedTask = {
      ...payload,
      ...apiTask,
      id: apiTask.id,
      workspaceId: apiTask.workspaceId || wsId,
      userId: apiTask.userId || user.uid,
      createdBy: apiTask.createdBy || user.uid,
    }
  } else {
    const scopedTasks = resolveTasksRef()
    const firestorePayload = {
      ...payload,
      userId: user.uid,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    const docRef = await safeAction(withTimeout(addDoc(scopedTasks, firestorePayload), 10000, 'task create'))
    savedTask = { id: docRef.id, ...firestorePayload }
  }
  const shouldAwaitNotificationSync = options?.awaitNotificationSync !== false

  let notifyMeta = null
  if (shouldAwaitNotificationSync) {
    notifyMeta = await syncTaskNotification(user.uid, savedTask.id, savedTask)
  } else {
    Promise.resolve(syncTaskNotification(user.uid, savedTask.id, savedTask)).catch(() => {})
  }

  dispatchTaskRefresh({ reason: 'task-created', taskId: savedTask.id, workspaceId: wsId, task: savedTask })

  // Return task with Firestore's doc ID
  return { ...savedTask, __notifyMeta: notifyMeta };
}

/**
 * ✅ Update an existing task in Firestore
 */
// export async function updateTaskInFirebase(task) {
//   if (!task.id) throw new Error("Task missing Firestore ID");

//   const { id, createdAt, ...updates } = task; 
//   // strip `createdAt` because serverTimestamp() is managed by Firestore

//   const docRef = doc(db, "tasks", id);

//   await updateDoc(docRef, {
//     ...updates,
//     updatedAt: serverTimestamp(), // track last update
//   });
// }
export async function updateTaskInFirebase(task) {
  if (!task.id) throw new Error("Task missing Firestore ID")
  const user = auth.currentUser
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'User not logged in' })
    throw new Error('User not logged in')
  }
  const normalizedWsId = typeof task?.workspaceId === 'string' && task.workspaceId.trim() ? task.workspaceId.trim() : null
  const activeWorkspaceId = currentWorkspaceId()
  if (normalizedWsId && activeWorkspaceId && normalizedWsId !== activeWorkspaceId) {
    throw new Error('Task belongs to a different workspace')
  }

  const {
    id,
    createdAt,
    workspaceId: _workspaceId,
    createdBy: _createdBy,
    orphanedWorkspace: _orphanedWorkspace,
    legacyWorkspace: _legacyWorkspace,
    ...updates
  } = task
  const justCompleted = updates.completed === true

  // Firestore rules keep workspaceId immutable. Client updates must not send it.
  delete updates.workspaceId
  delete updates.createdBy
  if ('date' in updates) updates.date = normalizeTaskDate(updates.date)

  const ref = taskDocRef(id)
  await safeAction(updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  }))
  dispatchTaskRefresh({
    reason: 'task-updated',
    taskId: id,
    workspaceId: normalizedWsId || activeWorkspaceId,
    task: {
      id,
      workspaceId: normalizedWsId || activeWorkspaceId || null,
      ...updates,
    },
  })
  if (justCompleted) {
    try {
      console.log('[HabitTracker] frontend completion hook', { taskId: id })
      await api.post('/habits/log-completion', {
        userId: user.uid,
        taskId: id,
        completedAt: new Date().toISOString(),
        timezone: updates.timezone || task.timezone || task.metadata?.timezone || null,
        source: 'frontend_ui',
      })
    } catch (err) {
      console.warn('[HabitTracker] frontend completion hook failed', err?.response?.data || err?.message || err)
    }
  }
}

/**
 * 🗑 Delete a task
 */
export async function deleteTaskFromFirebase(taskId) {
  if (!taskId) throw new Error("Task ID required");
  const user = auth.currentUser
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'User not logged in' })
    throw new Error('User not logged in')
  }
  const ref = taskDocRef(taskId)
  await safeAction(deleteDoc(ref))
  dispatchTaskRefresh({ reason: 'task-deleted', taskId, workspaceId: currentWorkspaceId() })
}

/**
 * ↪️ Move a set of tasks to a new date (batch)
 */
export async function moveTasksToDate(taskPayloads = [], targetDate, extra = {}) {
  const user = auth.currentUser
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'User not logged in' })
    throw new Error('User not logged in')
  }
  const wsId = currentWorkspaceId()
  if (!wsId) throw new Error('No active workspace selected')
  let currentRole = null
  try {
    const store = useWorkspaceStore?.()
    currentRole = store?.activeWorkspaceRole || store?.workspaces?.find?.((w) => w.id === wsId)?.role || null
  } catch {
    currentRole = null
  }
  const normalizedDate =
    typeof targetDate === 'string' && /\d{4}-\d{2}-\d{2}/.test(targetDate)
      ? targetDate
      : toLocalDateKey(new Date(targetDate || Date.now()))

  const incoming = (Array.isArray(taskPayloads) ? taskPayloads : [])
    .map((item) => (typeof item === 'string' ? { id: item } : item))
    .filter((t) => t?.id)
  if (!incoming.length) return []

  const list = incoming.filter((t) => !t.workspaceId || t.workspaceId === wsId)
  const skipped = incoming.filter((t) => t.workspaceId && t.workspaceId !== wsId).map((t) => t.id)
  if (!list.length) {
    throw new Error('No tasks in the active workspace to move')
  }

  try {
    console.log('[moveTasksToDate] write payload', {
      count: list.length,
      ids: list.map((t) => t.id),
      targetDate: normalizedDate,
      workspaceId: wsId,
      createdBy: list[0]?.createdBy,
      uid: user.uid,
      role: currentRole,
      extra,
      skippedCrossWorkspace: skipped,
    })
  } catch {
    /* noop */
  }

  const batch = writeBatch(db)
  list.forEach((task) => {
    const ref = taskDocRef(task.id)
    const updates = {
      date: normalizedDate,
      updatedAt: serverTimestamp(),
    }
    if (extra.status) updates.status = extra.status
    if ('completed' in extra) updates.completed = !!extra.completed
    else if (task.completed !== undefined) updates.completed = !!task.completed
    if (updates.status === 'pending') updates.completed = false
    if ('rolledOver' in extra) updates.rolledOver = !!extra.rolledOver
    if ('rolledOverAt' in extra) updates.rolledOverAt = extra.rolledOverAt
    if ('previousDate' in extra || 'previousDate' in task) {
      updates.previousDate = task.previousDate || extra.previousDate || null
    }
    batch.update(ref, updates)
  })

  await safeAction(batch.commit())
  dispatchTaskRefresh({ reason: 'tasks-moved', taskIds: list.map((t) => t.id), workspaceId: wsId })
  return list.map((t) => ({ ...t, date: normalizedDate }))
}

/**
 * 💾 Save journal entry
 */
export async function saveEntryToFirebase(entry) {
  const user = auth.currentUser;
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'User not logged in' })
    throw new Error("User not logged in");
  }

  const payload = {
    ...entry,
    userId: user.uid,
    createdAt: serverTimestamp(),
  }

  const ref = await safeAction(addDoc(journalRef, payload));

  // Update streak based on this entry; fire-and-forget but surface confetti via event
  try {
    const res = await updateStreakOnEntry(user.uid, entry?.date || new Date())
    if (res?.streakIncreased) {
      try {
        window.dispatchEvent(new CustomEvent('streak-increased', { detail: { count: res.newCount } }))
      } catch {}
    }
  } catch (e) {
    // Non-fatal; do not block journal save
    console.warn('Streak update failed:', e?.message || e)
  }

  return {
    id: ref.id,
    ...entry,
    userId: user.uid,
  }
}

/**
 * 📖 Fetch journal entries
 */
export async function fetchEntries() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");

  const q = query(
    journalRef,
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const snapshot = await safeAction(getDocs(q));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** 🔗 Link Management (workspace-scoped) */

const defaultLinkCategories = [
  { id: 'personal', name: 'Personal', icon: '🏠', color: 'indigo' },
  { id: 'work', name: 'Work', icon: '💼', color: 'emerald' },
  { id: 'learning', name: 'Learning', icon: '📚', color: 'sky' },
  { id: 'tools', name: 'Tools', icon: '🧰', color: 'amber' },
  { id: 'finance', name: 'Finance', icon: '💳', color: 'pink' },
]

const linkMigrationQueue = new Map()
const linkCategorySeedQueue = new Map()

function coerceTimestamp(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value?.seconds) return value.seconds * 1000 + Math.floor(value.nanoseconds / 1e6)
  if (value instanceof Date) return value.getTime()
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function linksCollectionForUser(userId) {
  const wsId = currentWorkspaceId()
  if (userId && wsId) return collection(db, 'users', userId, 'workspaces', wsId, 'links')
  return collection(db, 'links')
}

function linkDocRef(userId, linkId) {
  const wsId = currentWorkspaceId()
  if (userId && wsId) return doc(db, 'users', userId, 'workspaces', wsId, 'links', linkId)
  return doc(db, 'links', linkId)
}

function linkCategoriesCollection(userId) {
  const wsId = currentWorkspaceId()
  if (userId && wsId) return collection(db, 'users', userId, 'workspaces', wsId, 'linksCategories')
  return collection(db, 'linksCategories')
}

function linkCategoryDocRef(userId, categoryId) {
  const wsId = currentWorkspaceId()
  if (userId && wsId) return doc(db, 'users', userId, 'workspaces', wsId, 'linksCategories', categoryId)
  return doc(db, 'linksCategories', categoryId)
}

function mapLinkDoc(docSnap) {
  const data = docSnap.data() || {}
  return {
    id: docSnap.id,
    title: data.title || '',
    url: data.url || '',
    category: data.category || data.tags?.[0] || 'Personal',
    icon: data.icon || '🔗',
    starred: data.starred ?? data.pinned ?? false,
    description: data.description || '',
    order: typeof data.order === 'number' ? data.order : coerceTimestamp(data.createdAt) || Date.now(),
    createdAt: coerceTimestamp(data.createdAt) || Date.now(),
    lastUsedAt: coerceTimestamp(data.lastUsedAt),
    workspaceId: data.workspaceId || currentWorkspaceId() || null,
    userId: data.userId || auth.currentUser?.uid || null,
  }
}

function mapCategoryDoc(docSnap) {
  const data = docSnap.data() || {}
  return {
    id: docSnap.id,
    name: data.name || data.title || 'Untitled',
    icon: data.icon || '🏷️',
    color: data.color || 'slate',
    slug: data.slug || null,
    order: typeof data.order === 'number' ? data.order : coerceTimestamp(data.createdAt) || Date.now(),
    createdAt: coerceTimestamp(data.createdAt) || Date.now(),
  }
}

async function seedDefaultCategories(userId) {
  const wsId = currentWorkspaceId()
  const col = linkCategoriesCollection(userId)
  const seeded = []
  await Promise.all(
    defaultLinkCategories.map(async (cat, idx) => {
      const payload = {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        order: idx,
        createdAt: Date.now(),
        userId,
        workspaceId: wsId || null,
        slug: cat.id,
      }
      const ref = await safeAction(addDoc(col, payload))
      seeded.push({ ...payload, id: ref.id })
    }),
  )
  return seeded
}

export function getDefaultLinkCategories() {
  return defaultLinkCategories.map((category) => ({ ...category }))
}

function queueLinkCategorySeed(userId) {
  const wsId = currentWorkspaceId() || 'personal'
  const key = `${userId}:${wsId}`
  if (linkCategorySeedQueue.has(key)) return linkCategorySeedQueue.get(key)
  const task = seedDefaultCategories(userId)
    .catch(() => [])
    .finally(() => {
      linkCategorySeedQueue.delete(key)
    })
  linkCategorySeedQueue.set(key, task)
  return task
}

async function fetchLegacyLinks(userId) {
  const qy = query(collection(db, 'links'), where('userId', '==', userId))
  const snap = await safeAction(withTimeout(getDocs(qy), 4000, 'links legacy'))
  return snap.docs.map(mapLinkDoc)
}

async function migrateLegacyLinks(userId) {
  const wsId = currentWorkspaceId()
  if (!userId || !wsId) return []
  const legacy = await fetchLegacyLinks(userId)
  if (!legacy.length) return []
  const col = linksCollectionForUser(userId)
  const migrated = []
  await Promise.all(
    legacy.map(async (link, idx) => {
      const payload = {
        title: link.title,
        url: link.url,
        category: link.category || 'Personal',
        icon: link.icon || '🔗',
        starred: !!link.starred,
        description: link.description || '',
        order: link.order ?? Date.now() + idx,
        lastUsedAt: link.lastUsedAt || 0,
        createdAt: link.createdAt || Date.now(),
        userId,
        workspaceId: wsId,
      }
      const ref = await safeAction(addDoc(col, payload))
      migrated.push({ ...payload, id: ref.id })
    }),
  )
  return migrated
}

function queueLegacyLinkMigration(userId) {
  const wsId = currentWorkspaceId() || 'personal'
  const key = `${userId}:${wsId}`
  if (linkMigrationQueue.has(key)) return linkMigrationQueue.get(key)
  const task = migrateLegacyLinks(userId)
    .catch(() => [])
    .finally(() => {
      linkMigrationQueue.delete(key)
    })
  linkMigrationQueue.set(key, task)
  return task
}

function sortLinks(list = []) {
  return [...list].sort((a, b) => {
    if (a.starred !== b.starred) return Number(b.starred) - Number(a.starred)
    if (a.order !== b.order) return (b.order || 0) - (a.order || 0)
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
}

function mergeCategories(primary = [], fallback = []) {
  const byKey = new Map()
  ;[...fallback, ...primary].forEach((category) => {
    const key = String(category?.name || category?.id || '').trim().toLowerCase()
    if (!key) return
    byKey.set(key, category)
  })
  return Array.from(byKey.values()).sort((a, b) => (a.order || 0) - (b.order || 0))
}

function requireLinkSession() {
  const session = currentSessionContext()
  if (!session?.uid) {
    handleAuthError({ code: 'unauthenticated', message: 'Not signed in' })
    throw new Error('Not signed in')
  }
  return session
}

export async function addLink({ title, url, category = 'Personal', icon = '🔗', starred = false, description = '' }) {
  const session = requireLinkSession()
  const payload = {
    userId: session.uid,
    workspaceId: currentWorkspaceId() || null,
    title: title?.trim() || url || 'New Link',
    url: url?.trim(),
    category: category || 'Personal',
    icon: icon || '🔗',
    starred: !!starred,
    description: description?.trim() || '',
    order: Date.now(),
    createdAt: Date.now(),
    lastUsedAt: 0,
  }
  try {
    const ref = await safeAction(addDoc(linksCollectionForUser(session.uid), payload))
    return { id: ref.id, ...payload }
  } catch (err) {
    if (currentWorkspaceId()) {
      const ref = await safeAction(addDoc(collection(db, 'links'), payload))
      return { id: ref.id, ...payload }
    }
    throw err
  }
}

export async function getLinks() {
  const session = currentSessionContext()
  if (!session?.uid) return []
  try {
    const col = linksCollectionForUser(session.uid)
    const snap = await safeAction(withTimeout(getDocs(col), 4000, 'links read'))
    let list = snap.docs.map(mapLinkDoc)
    if (!list.length && currentWorkspaceId()) {
      list = await fetchLegacyLinks(session.uid)
      if (list.length) {
        queueLegacyLinkMigration(session.uid)
      }
    }
    return sortLinks(list)
  } catch (err) {
    if (currentWorkspaceId() || isIosPackagedApp()) {
      try {
        return sortLinks(await fetchLegacyLinks(session.uid))
      } catch {
        return []
      }
    }
    throw err
  }
}

export function watchLinks(cb) {
  const session = currentSessionContext()
  if (!session?.uid) return () => {}
  try {
    let hydratedLegacy = false
    let released = false
    const unsub = onSnapshot(
      linksCollectionForUser(session.uid),
      async (snap) => {
        let list = snap.docs.map(mapLinkDoc)
        if (!list.length && currentWorkspaceId() && !hydratedLegacy) {
          hydratedLegacy = true
          cb([])
          try {
            const legacy = await fetchLegacyLinks(session.uid)
            if (!released && legacy.length) {
              cb(sortLinks(legacy))
              queueLegacyLinkMigration(session.uid)
              return
            }
          } catch (err) {
            console.warn('watchLinks legacy hydration failed', err?.message || err)
          }
        }
        cb(sortLinks(list))
      },
      async (err) => {
        handleAuthError(err)
        if (currentWorkspaceId() || isIosPackagedApp()) {
          try {
            const legacy = await fetchLegacyLinks(session.uid)
            cb(sortLinks(legacy))
            return
          } catch {
            cb([])
            return
          }
        }
      },
    )
    return () => {
      released = true
      unsub()
    }
  } catch (err) {
    console.warn('watchLinks failed', err)
    return () => {}
  }
}

export async function updateLink(id, patch) {
  const session = requireLinkSession()
  const normalized = { ...patch }
  if ('title' in normalized && normalized.title == null) delete normalized.title
  try {
    await safeAction(updateDoc(linkDocRef(session.uid, id), normalized))
  } catch (err) {
    try {
      await safeAction(updateDoc(doc(db, 'links', id), normalized))
      return
    } catch {
      throw err
    }
  }
  try { await updateDoc(doc(db, 'links', id), normalized) } catch {}
}

export async function touchLink(id) {
  try {
    await updateLink(id, { lastUsedAt: Date.now() })
  } catch {}
}

export async function reorderLinks(linkIdsInOrder = []) {
  const session = currentSessionContext()
  if (!session?.uid || !linkIdsInOrder.length) return
  const col = linksCollectionForUser(session.uid)
  const now = Date.now()
  await Promise.all(
    linkIdsInOrder.map((linkId, idx) =>
      safeAction(updateDoc(doc(col, linkId), { order: now - idx })),
    ),
  )
}

export async function deleteLink(id) {
  const session = requireLinkSession()
  try {
    await safeAction(deleteDoc(linkDocRef(session.uid, id)))
  } catch (err) {
    try {
      await safeAction(deleteDoc(doc(db, 'links', id)))
      return
    } catch {
      throw err
    }
  }
  try { await deleteDoc(doc(db, 'links', id)) } catch {}
}

async function fetchLegacyLinkCategories(userId) {
  const qy = query(collection(db, 'linksCategories'), where('userId', '==', userId))
  const snap = await safeAction(withTimeout(getDocs(qy), 4000, 'link categories legacy'))
  return snap.docs.map(mapCategoryDoc).sort((a, b) => (a.order || 0) - (b.order || 0))
}

export async function getLinkCategories() {
  const session = currentSessionContext()
  if (!session?.uid) return getDefaultLinkCategories()
  try {
    const col = linkCategoriesCollection(session.uid)
    const snap = await safeAction(withTimeout(getDocs(col), 4000, 'link categories read'))
    let categories = snap.docs.map(mapCategoryDoc)
    if (!categories.length) {
      if (currentWorkspaceId()) {
        const legacy = await fetchLegacyLinkCategories(session.uid)
        if (legacy.length) return legacy
      }
      queueLinkCategorySeed(session.uid)
      categories = getDefaultLinkCategories()
    } else {
      categories = categories.sort((a, b) => (a.order || 0) - (b.order || 0))
      if (currentWorkspaceId()) {
        const legacy = await fetchLegacyLinkCategories(session.uid)
        categories = mergeCategories(categories, legacy)
      }
    }
    return categories
  } catch (err) {
    if (currentWorkspaceId() || isIosPackagedApp()) {
      try {
        const legacy = await fetchLegacyLinkCategories(session.uid)
        if (legacy.length) return legacy
      } catch {
        /* noop */
      }
      return getDefaultLinkCategories()
    }
    throw err
  }
}

export function watchLinkCategories(cb) {
  const session = currentSessionContext()
  if (!session?.uid) return () => {}
  try {
    let hydratedLegacy = false
    const unsub = onSnapshot(
      linkCategoriesCollection(session.uid),
      async (snap) => {
        let cats = snap.docs.map(mapCategoryDoc).sort((a, b) => (a.order || 0) - (b.order || 0))
        if (!cats.length && currentWorkspaceId() && !hydratedLegacy) {
          hydratedLegacy = true
          try {
            const legacy = await fetchLegacyLinkCategories(session.uid)
            if (legacy.length) {
              cb(legacy)
              return
            }
          } catch (err) {
            console.warn('watchLinkCategories legacy hydration failed', err?.message || err)
          }
          queueLinkCategorySeed(session.uid)
          cb(getDefaultLinkCategories())
          return
        } else if (!cats.length) {
          queueLinkCategorySeed(session.uid)
          cb(getDefaultLinkCategories())
          return
        } else if (cats.length && currentWorkspaceId()) {
          try {
            const legacy = await fetchLegacyLinkCategories(session.uid)
            cats = mergeCategories(cats, legacy)
          } catch {}
        }
        cb(cats)
      },
      async (err) => {
        handleAuthError(err)
        if (currentWorkspaceId() || isIosPackagedApp()) {
          try {
            const legacy = await fetchLegacyLinkCategories(session.uid)
            if (legacy.length) {
              cb(legacy)
              return
            }
          } catch {
            /* noop */
          }
          cb(getDefaultLinkCategories())
        }
      },
    )
    return unsub
  } catch (err) {
    console.warn('watchLinkCategories failed', err)
    return () => {}
  }
}

export async function addLinkCategory({ name, icon = '🏷️', color = 'slate' }) {
  const session = requireLinkSession()
  const payload = {
    name: name?.trim() || 'New Category',
    icon: icon || '🏷️',
    color: color || 'slate',
    order: Date.now(),
    createdAt: Date.now(),
    workspaceId: currentWorkspaceId() || null,
    userId: session.uid,
  }
  const ref = await safeAction(addDoc(linkCategoriesCollection(session.uid), payload))
  return { id: ref.id, ...payload }
}

export async function updateLinkCategory(id, patch) {
  const session = requireLinkSession()
  try {
    await safeAction(updateDoc(linkCategoryDocRef(session.uid, id), patch))
  } catch (err) {
    try {
      await safeAction(updateDoc(doc(db, 'linksCategories', id), patch))
      return
    } catch {
      throw err
    }
  }
}

export async function deleteLinkCategory(id) {
  const session = requireLinkSession()
  try {
    await safeAction(deleteDoc(linkCategoryDocRef(session.uid, id)))
  } catch (err) {
    try {
      await safeAction(deleteDoc(doc(db, 'linksCategories', id)))
      return
    } catch {
      throw err
    }
  }
}

// export async function savePreferences(userId, prefs) {
//   await safeAction(setDoc(doc(db, "preferences", userId), prefs, { merge: true }))
// }

// export async function getPreferences(userId) {
//   const snap = await safeAction(getDoc(doc(db, "preferences", userId)))
//   return snap.exists() ? snap.data() : null
// }
export async function savePreferences(userId, prefs) {
  const ref = doc(db, "preferences", userId)
  await setDoc(ref, prefs, { merge: true })
}

export async function getPreferences(userId) {
  const ref = doc(db, "preferences", userId)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

// =============== Notifications (public announcements) ===============
const notificationsRef = collection(db, 'notifications')

export async function createNotification({ title, message, date }) {
  const payload = {
    title: String(title || '').slice(0, 200),
    message: String(message || '').slice(0, 2000),
    date: date || serverTimestamp(),
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(notificationsRef, payload)
  return { id: ref.id, ...payload }
}

export async function fetchNotificationsPublic(max = 50) {
  const qy = query(notificationsRef, orderBy('date', 'desc'), limit(max))
  const snap = await getDocs(qy)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export function watchNotificationsPublic(cb, max = 50) {
  const qy = query(notificationsRef, orderBy('date', 'desc'), limit(max))
  const unsub = onSnapshot(qy, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    cb(list)
  })
  return unsub
}
