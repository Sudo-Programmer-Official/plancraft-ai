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

// Prevent spamming multiple auth-expired dialogs at once
let authDialogOpen = false

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
          try {
            signOut(auth).finally(() => {
              window.location.reload()
            })
          } catch {
            window.location.reload()
          }
        },
      },
    )
  } catch {
    // If UI libs not ready, fallback to hard reload
    try { signOut(auth) } catch {
      // ignore
    }
    window.location.reload()
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
  const user = auth.currentUser;
  if (!user) return [];

  const today = toLocalDateKey(new Date()); // YYYY-MM-DD local
  const wsId = currentWorkspaceId()
  if (!wsId) return []

  const scopedTasks = resolveTasksRef()
  const q = query(
    scopedTasks,
    where("workspaceId", "==", wsId),
    where("date", "==", today),
    orderBy("order", "asc")
  );

  let snapshot = await safeAction(getDocs(q));
  if (!snapshot.size) {
    // Legacy personal tasks without workspaceId
    const legacy = query(
      scopedTasks,
      where('workspaceId', '==', null),
      where('userId', '==', user.uid),
      where('date', '==', today),
      orderBy('order', 'asc'),
    )
    snapshot = await safeAction(getDocs(legacy))
  }
  return snapshot.docs.map(mapTaskDoc);
}

/**
 * 🗓 Fetch tasks for a specific date (YYYY-MM-DD)
 */
export async function fetchTasksByDate(dateStr) {
  const user = auth.currentUser;
  if (!user) return [];
  const wsId = currentWorkspaceId()
  if (!wsId) return []
  const scopedTasks = resolveTasksRef()
  const qy = query(
    scopedTasks,
    where('workspaceId', '==', wsId),
    where('date', '==', dateStr),
    orderBy('order', 'asc'),
  )
  let snap = await safeAction(getDocs(qy))
  if (!snap.size) {
    const legacy = query(
      scopedTasks,
      where('workspaceId', '==', null),
      where('userId', '==', user.uid),
      where('date', '==', dateStr),
      orderBy('order', 'asc'),
    )
    snap = await safeAction(getDocs(legacy))
  }
  return snap.docs.map(mapTaskDoc)
}

/**
 * 📅 Fetch tasks between two dates inclusive (YYYY-MM-DD)
 */
export async function fetchTasksBetween(startYMD, endYMD) {
  const user = auth.currentUser;
  if (!user) return [];
  const wsId = currentWorkspaceId()
  if (!wsId) return []
  const scopedTasks = resolveTasksRef()
  const qy = query(
    scopedTasks,
    where('workspaceId', '==', wsId),
    where('date', '>=', startYMD),
    where('date', '<=', endYMD),
    orderBy('date', 'asc'),
    orderBy('order', 'asc'),
  )
  let snap = await safeAction(getDocs(qy))
  if (!snap.size) {
    const legacy = query(
      scopedTasks,
      where('workspaceId', '==', null),
      where('userId', '==', user.uid),
      where('date', '>=', startYMD),
      where('date', '<=', endYMD),
      orderBy('date', 'asc'),
      orderBy('order', 'asc'),
    )
    snap = await safeAction(getDocs(legacy))
  }
  return snap.docs.map(mapTaskDoc)
}

/**
 * 📚 Fetch every task for the active workspace (single source of truth)
 */
export async function fetchAllTasksForWorkspace() {
  const user = auth.currentUser
  if (!user) return []
  const wsId = currentWorkspaceId()
  if (!wsId) return []
  const scopedTasks = resolveTasksRef()
  const primaryQuery = query(scopedTasks, where('workspaceId', '==', wsId))
  const orphanQuery = query(scopedTasks, where('workspaceId', '==', null), where('userId', '==', user.uid))

  const [primarySnap, orphanSnap] = await Promise.all([
    safeAction(getDocs(primaryQuery)),
    safeAction(getDocs(orphanQuery)),
  ])
  const combined = [...(primarySnap?.docs || []), ...(orphanSnap?.docs || [])]

  // De-duplicate by id in case of overlap
  const byId = new Map()
  combined.forEach((doc) => byId.set(doc.id, doc))
  return Array.from(byId.values()).map(mapTaskDoc)
}

/**
 * ⏩ Find unfinished tasks scheduled before a given date (YYYY-MM-DD)
 */
export async function fetchUnfinishedTasksBefore(ymd) {
  const user = auth.currentUser
  if (!user) return []
  const wsId = currentWorkspaceId()
  if (!wsId) return []
  const scopedTasks = resolveTasksRef()
  const target = typeof ymd === 'string' && /\d{4}-\d{2}-\d{2}/.test(ymd)
    ? ymd
    : toLocalDateKey(new Date(ymd || Date.now()))

  async function runQuery(includeCompletedFilter = true, useLegacy = false) {
    const clauses = [where('workspaceId', '==', useLegacy ? null : wsId)]
    if (useLegacy) clauses.push(where('userId', '==', user.uid))
    clauses.push(where('date', '<', target))
    if (includeCompletedFilter) clauses.push(where('completed', '==', false))
    const qy = query(scopedTasks, ...clauses, orderBy('date', 'asc'))
    return safeAction(getDocs(qy))
  }

  let snap = null
  try {
    snap = await runQuery(true, false)
  } catch {
    try {
      snap = await runQuery(false, false)
    } catch (err) {
      console.warn('[fetchUnfinishedTasksBefore] primary query failed, falling back', err?.message || err)
    }
  }

  if (!snap || !snap.size) {
    try {
      snap = await runQuery(true, true)
    } catch {
      snap = await runQuery(false, true)
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
    const res = await api.post('/tasks/announce', {
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
    return res?.data || null
  } catch (err) {
    console.warn('[TaskSync] notify failed', err?.response?.data || err?.message || err)
    return null
  }
}

export async function addTaskToFirebase(task) {
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
    userId: user.uid,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (typeof task?.link === 'string') payload.link = task.link.trim()
  if ('reminderTime' in task) payload.reminderTime = task.reminderTime ?? null
  if ('timezone' in task && task.timezone) payload.timezone = task.timezone
  if ('scheduledTime' in task) payload.scheduledTime = task.scheduledTime ?? null
  if ('time' in task) payload.time = task.time ?? null
  if ('source' in task) payload.source = task.source || 'manual'
  if ('duration' in task) payload.duration = task.duration
  if ('metadata' in task) payload.metadata = task.metadata

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

  const scopedTasks = resolveTasksRef()
  payload.workspaceId = wsId
  const docRef = await safeAction(addDoc(scopedTasks, payload));

  const notifyMeta = await syncTaskNotification(user.uid, docRef.id, payload)

  // Return task with Firestore's doc ID
  return { id: docRef.id, ...payload, __notifyMeta: notifyMeta };
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
  const { id, createdAt, workspaceId, ...updates } = task
  const justCompleted = updates.completed === true

  // Avoid mutating workspace ownership; imported meeting tasks may not have workspaceId set.
  const normalizedWsId = typeof workspaceId === 'string' && workspaceId.trim() ? workspaceId.trim() : null
  if (normalizedWsId) updates.workspaceId = normalizedWsId
  else delete updates.workspaceId
  if ('date' in updates) updates.date = normalizeTaskDate(updates.date)

  const ref = taskDocRef(id)
  await safeAction(updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  }))
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
  const normalizedDate =
    typeof targetDate === 'string' && /\d{4}-\d{2}-\d{2}/.test(targetDate)
      ? targetDate
      : toLocalDateKey(new Date(targetDate || Date.now()))

  const list = (Array.isArray(taskPayloads) ? taskPayloads : [])
    .map((item) => (typeof item === 'string' ? { id: item } : item))
    .filter((t) => t?.id)
  if (!list.length) return []

  const batch = writeBatch(db)
  list.forEach((task) => {
    const ref = taskDocRef(task.id)
    const updates = {
      date: normalizedDate,
      updatedAt: serverTimestamp(),
      workspaceId: wsId,
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

  await safeAction(addDoc(journalRef, {
    ...entry,
    userId: user.uid,
    createdAt: serverTimestamp(),
  }));

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

async function fetchLegacyLinks(userId) {
  const qy = query(collection(db, 'links'), where('userId', '==', userId))
  const snap = await safeAction(getDocs(qy))
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

function sortLinks(list = []) {
  return [...list].sort((a, b) => {
    if (a.starred !== b.starred) return Number(b.starred) - Number(a.starred)
    if (a.order !== b.order) return (b.order || 0) - (a.order || 0)
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
}

export async function addLink({ title, url, category = 'Personal', icon = '🔗', starred = false, description = '' }) {
  const user = auth.currentUser
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'Not signed in' })
    throw new Error('Not signed in')
  }
  const payload = {
    userId: user.uid,
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
  const ref = await safeAction(addDoc(linksCollectionForUser(user.uid), payload))
  return { id: ref.id, ...payload }
}

export async function getLinks() {
  const user = auth.currentUser
  if (!user) return []
  const col = linksCollectionForUser(user.uid)
  const snap = await safeAction(getDocs(col))
  let list = snap.docs.map(mapLinkDoc)
  if (!list.length && currentWorkspaceId()) {
    const migrated = await migrateLegacyLinks(user.uid)
    if (migrated.length) list = migrated
  }
  return sortLinks(list)
}

export function watchLinks(cb) {
  const user = auth.currentUser
  if (!user) return () => {}
  try {
    const unsub = onSnapshot(
      linksCollectionForUser(user.uid),
      (snap) => {
        const list = snap.docs.map(mapLinkDoc)
        cb(sortLinks(list))
      },
      (err) => handleAuthError(err),
    )
    return unsub
  } catch (err) {
    console.warn('watchLinks failed', err)
    return () => {}
  }
}

export async function updateLink(id, patch) {
  const user = auth.currentUser
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'Not signed in' })
    throw new Error('Not signed in')
  }
  const normalized = { ...patch }
  if ('title' in normalized && normalized.title == null) delete normalized.title
  await safeAction(updateDoc(linkDocRef(user.uid, id), normalized))
  // Update legacy doc if it exists to keep parity
  try {
    await updateDoc(doc(db, 'links', id), normalized)
  } catch {}
}

export async function touchLink(id) {
  try {
    await updateLink(id, { lastUsedAt: Date.now() })
  } catch {}
}

export async function reorderLinks(linkIdsInOrder = []) {
  const user = auth.currentUser
  if (!user || !linkIdsInOrder.length) return
  const col = linksCollectionForUser(user.uid)
  const now = Date.now()
  await Promise.all(
    linkIdsInOrder.map((linkId, idx) =>
      safeAction(updateDoc(doc(col, linkId), { order: now - idx })),
    ),
  )
}

export async function deleteLink(id) {
  const user = auth.currentUser
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'Not signed in' })
    throw new Error('Not signed in')
  }
  await safeAction(deleteDoc(linkDocRef(user.uid, id)))
  try {
    await deleteDoc(doc(db, 'links', id))
  } catch {}
}

export async function getLinkCategories() {
  const user = auth.currentUser
  if (!user) return defaultLinkCategories
  const col = linkCategoriesCollection(user.uid)
  const snap = await safeAction(getDocs(col))
  let categories = snap.docs.map(mapCategoryDoc)
  if (!categories.length) {
    categories = await seedDefaultCategories(user.uid)
  } else {
    categories = categories.sort((a, b) => (a.order || 0) - (b.order || 0))
  }
  return categories
}

export function watchLinkCategories(cb) {
  const user = auth.currentUser
  if (!user) return () => {}
  try {
    const unsub = onSnapshot(
      linkCategoriesCollection(user.uid),
      (snap) => {
        const cats = snap.docs.map(mapCategoryDoc).sort((a, b) => (a.order || 0) - (b.order || 0))
        cb(cats)
      },
      (err) => handleAuthError(err),
    )
    return unsub
  } catch (err) {
    console.warn('watchLinkCategories failed', err)
    return () => {}
  }
}

export async function addLinkCategory({ name, icon = '🏷️', color = 'slate' }) {
  const user = auth.currentUser
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'Not signed in' })
    throw new Error('Not signed in')
  }
  const payload = {
    name: name?.trim() || 'New Category',
    icon: icon || '🏷️',
    color: color || 'slate',
    order: Date.now(),
    createdAt: Date.now(),
    workspaceId: currentWorkspaceId() || null,
    userId: user.uid,
  }
  const ref = await safeAction(addDoc(linkCategoriesCollection(user.uid), payload))
  return { id: ref.id, ...payload }
}

export async function updateLinkCategory(id, patch) {
  const user = auth.currentUser
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'Not signed in' })
    throw new Error('Not signed in')
  }
  await safeAction(updateDoc(linkCategoryDocRef(user.uid, id), patch))
}

export async function deleteLinkCategory(id) {
  const user = auth.currentUser
  if (!user) {
    handleAuthError({ code: 'unauthenticated', message: 'Not signed in' })
    throw new Error('Not signed in')
  }
  await safeAction(deleteDoc(linkCategoryDocRef(user.uid, id)))
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
