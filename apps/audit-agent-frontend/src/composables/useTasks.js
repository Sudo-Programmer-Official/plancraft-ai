// src/composables/useTasks.js
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { trackEvent } from '@/services/analytics'
import { useAuthStore } from '@/stores/authStore'
import { toLocalDateKey } from '@/utils/dateHelper'
import {
  addTaskToFirebase,
  deleteTaskFromFirebase,
  ensureRecurringNextTask,
  fetchAllTasksForWorkspace,
  fetchTasksBetween,
  fetchTasksByDate,
  fetchTasksForToday,
  fetchUnfinishedTasksBefore,
  moveTasksToDate,
  updateTaskInFirebase,
} from '@/services/firebaseService'
import { resolveCategory } from '@/constants/taskCategories'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAppReady } from '@/composables/useAppReady'

// 🔗 Shared singleton state
const tasks = ref([])
const allTasks = ref([])
const activeFilter = ref(makeDefaultFilter())
let initialized = false
let refreshListenerAttached = false
let workspaceWatchAttached = false
let authWatchAttached = false
let refreshPromise = null
const scopedLoadPromises = new Map()
let lastRolloverKey = null

function makeTodayKey() {
  return toLocalDateKey(new Date())
}

function makeDefaultFilter() {
  const today = makeTodayKey()
  return {
    dateFilter: 'today',
    startDate: today,
    endDate: today,
    status: 'all',
    category: 'All',
    search: '',
    sortBy: 'default',
    sortDir: 'desc',
  }
}

function normalizeWorkspaceId(value) {
  const next = String(value || '').trim()
  return next || null
}

export function useTasks() {
  const authStore = useAuthStore()
  const workspaceStore = useWorkspaceStore()
  const { isReady } = useAppReady()

  /**
   * 🔄 Helpers
   */
  function uniqueById(list) {
    return Array.from(new Map((Array.isArray(list) ? list : []).map((t) => [t.id, t])).values())
  }

  // Read-only resolver for a task's planned date; never mutates or persists.
  function getTaskPlannedDate(task) {
    if (!task) return null
    const candidates = [
      task.plannedDate,
      task.date,
      task.scheduledDate,
      task.scheduled_time,
      task.scheduledTime,
      task.dueDate,
      task?.metadata?.plannedDate,
    ]
    for (const value of candidates) {
      if (!value && value !== 0) continue
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (/\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed
        const isoDate = new Date(trimmed)
        if (!Number.isNaN(isoDate.getTime())) return toLocalDateKey(isoDate)
      } else if (value?.toDate) {
        try {
          return toLocalDateKey(value.toDate())
        } catch {}
      } else if (value instanceof Date || typeof value === 'number') {
        const d = new Date(value)
        if (!Number.isNaN(d.getTime())) return toLocalDateKey(d)
      }
    }
    if (task.createdAt) {
      try {
        const created = task.createdAt?.toDate ? task.createdAt.toDate() : new Date(task.createdAt)
        if (!Number.isNaN(created?.getTime?.())) return toLocalDateKey(created)
      } catch {}
    }
    return null
  }

  function coerceTs(value) {
    if (!value) return 0
    if (typeof value === 'number') return value
    if (value?.seconds) return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6)
    if (typeof value?.toMillis === 'function') return value.toMillis()
    if (value instanceof Date) return value.getTime()
    const num = Number(value)
    return Number.isFinite(num) ? num : 0
  }

  function normalizeTask(task) {
    if (!task) return null
    const normalizedDate = getTaskPlannedDate(task) || makeTodayKey()
    return {
      ...task,
      date: normalizedDate,
      category: resolveCategory(task?.category),
      status: task?.status || (task?.completed ? 'completed' : 'pending'),
      createdAt: coerceTs(task?.createdAt) || Date.now(),
    }
  }

  function normalizeList(raw) {
    const base = Array.isArray(raw) ? raw : []
    return base.map((task) => normalizeTask(task)).filter(Boolean)
  }

  function normalizeAndSort(raw) {
    return sortTasks(normalizeList(uniqueById(raw)).filter((task) => isCurrentWorkspaceTask(task)))
  }

  function isCurrentWorkspaceTask(taskOrWorkspaceId) {
    const activeWorkspaceId = normalizeWorkspaceId(workspaceStore?.activeWorkspaceId)
    if (!activeWorkspaceId) return true
    if (typeof taskOrWorkspaceId === 'string') {
      const workspaceId = normalizeWorkspaceId(taskOrWorkspaceId)
      return workspaceId === activeWorkspaceId
    }
    const workspaceId = normalizeWorkspaceId(taskOrWorkspaceId?.workspaceId)
    return workspaceId === activeWorkspaceId
  }

  function sortTasks(list, sortBy = 'default', sortDir = 'desc') {
    const arr = Array.isArray(list) ? [...list] : []
    const dir = sortDir === 'asc' ? 1 : -1
    const toTs = (ymd) => {
      if (!ymd) return 0
      const [y, m, d] = String(ymd).split('-').map((v) => parseInt(v, 10))
      if (!y || !m || !d) return 0
      return new Date(y, m - 1, d).getTime()
    }

    return arr.sort((a, b) => {
      if (sortBy === 'dueDate') {
        const diff = (toTs(getTaskPlannedDate(a)) - toTs(getTaskPlannedDate(b))) * dir
        if (diff !== 0) return diff
      } else if (sortBy === 'createdAt') {
        const diff = (coerceTs(a.createdAt) - coerceTs(b.createdAt)) * dir
        if (diff !== 0) return diff
      } else if (sortBy === 'priority') {
        const pa = Number.isFinite(a.priority) ? a.priority : -Infinity
        const pb = Number.isFinite(b.priority) ? b.priority : -Infinity
        if (pa !== pb) return (pa - pb) * dir
      }

      // Default/fallback: incomplete first, then newest first
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return coerceTs(b.createdAt) - coerceTs(a.createdAt)
    })
  }

  function applyFilters(base, filter = null) {
    const opts = { ...makeDefaultFilter(), ...(filter || {}) }
    let filtered = (Array.isArray(base) ? [...base] : []).filter((task) => isCurrentWorkspaceTask(task))

    if (opts.status === 'pending') {
      filtered = filtered.filter((t) => !t.completed && t.status !== 'completed')
    } else if (opts.status === 'completed') {
      filtered = filtered.filter((t) => t.completed || t.status === 'completed')
    }

    const today = makeTodayKey()
    if (opts.dateFilter === 'today') {
      filtered = filtered.filter((t) => (getTaskPlannedDate(t) || today) === today)
    } else if (opts.dateFilter === 'tomorrow') {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      const target = toLocalDateKey(d)
      filtered = filtered.filter((t) => (getTaskPlannedDate(t) || target) === target)
    } else if (opts.dateFilter === 'overdue') {
      filtered = filtered.filter((t) => {
        const planned = getTaskPlannedDate(t) || today
        return planned < today && !t.completed
      })
    } else if (opts.dateFilter === 'range' || opts.dateFilter === 'custom') {
      const start = opts.startDate || today
      const end = opts.endDate || start
      filtered = filtered.filter((t) => {
        const planned = getTaskPlannedDate(t) || today
        return planned >= start && planned <= end
      })
    }

    if (opts.category && opts.category !== 'All') {
      const target = resolveCategory(opts.category)
      filtered = filtered.filter((t) => resolveCategory(t.category) === target)
    }

    if (opts.search) {
      const needle = opts.search.toLowerCase()
      filtered = filtered.filter((t) => {
        const title = String(t.title || '').toLowerCase()
        const details = String(t.details || '').toLowerCase()
        return title.includes(needle) || details.includes(needle)
      })
    }

    return sortTasks(filtered, opts.sortBy, opts.sortDir)
  }

  function syncFiltered(nextFilter = null) {
    if (nextFilter) {
      activeFilter.value = { ...activeFilter.value, ...nextFilter }
    }
    tasks.value = applyFilters(allTasks.value, activeFilter.value)
  }

  function matchesScopedFilter(task, filter) {
    const opts = { ...makeDefaultFilter(), ...(filter || {}) }
    const planned = getTaskPlannedDate(task)
    if (!planned) return false

    if (opts.dateFilter === 'today' || opts.dateFilter === 'tomorrow') {
      return planned === (opts.startDate || makeTodayKey())
    }

    if (opts.dateFilter === 'range' || opts.dateFilter === 'custom') {
      const start = opts.startDate || makeTodayKey()
      const end = opts.endDate || start
      return planned >= start && planned <= end
    }

    if (opts.dateFilter === 'overdue') {
      const cutoff = opts.endDate || opts.startDate || makeTodayKey()
      return planned < cutoff && !task?.completed
    }

    return false
  }

  function replaceScopedTasksInCache(rawTasks, filter) {
    const nextScopedTasks = normalizeAndSort(rawTasks)
    const retained = allTasks.value.filter((task) => !matchesScopedFilter(task, filter))
    allTasks.value = sortTasks(uniqueById([...retained, ...nextScopedTasks]))
    return nextScopedTasks
  }

  async function refreshAllTasks(force = false) {
    if (refreshPromise) return refreshPromise
    refreshPromise = (async () => {
      // Prefer a single fetch of all tasks for the workspace; fall back to today if needed.
      // If both reads fail on mobile, keep the current in-memory task cache instead of
      // throwing an unhandled rejection after task creation/transcription already succeeded.
      const previousTasks = Array.isArray(allTasks.value) ? [...allTasks.value] : []
      let raw = null
      try {
        raw = await fetchAllTasksForWorkspace()
      } catch (workspaceErr) {
        console.warn('[useTasks] workspace refresh failed', workspaceErr?.message || workspaceErr)
        try {
          raw = await fetchTasksForToday()
        } catch (todayErr) {
          console.warn('[useTasks] today fallback failed', todayErr?.message || todayErr)
        }
      }

      if (Array.isArray(raw)) {
        allTasks.value = normalizeAndSort(raw)
      } else if (!previousTasks.length) {
        allTasks.value = []
      } else {
        allTasks.value = normalizeAndSort(previousTasks)
      }

      syncFiltered()
      initialized = true
      return allTasks.value
    })()
    try {
      return await refreshPromise
    } finally {
      refreshPromise = null
    }
  }

  /**
   * Load tasks for a view; filters are applied locally over the single source of truth.
   */
  async function loadTasks(filterOverrides = {}) {
    const today = makeTodayKey()
    const tomorrowDate = new Date()
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrow = toLocalDateKey(tomorrowDate)
    const requestedDateFilter = filterOverrides?.dateFilter || 'today'
    const baseFilter = {
      ...makeDefaultFilter(),
      ...filterOverrides,
      dateFilter: requestedDateFilter,
      startDate: filterOverrides?.startDate || (requestedDateFilter === 'tomorrow' ? tomorrow : today),
      endDate:
        filterOverrides?.endDate ||
        filterOverrides?.startDate ||
        (requestedDateFilter === 'tomorrow' ? tomorrow : today),
    }
    const loadKey = JSON.stringify({
      workspaceId: normalizeWorkspaceId(workspaceStore?.activeWorkspaceId),
      ...baseFilter,
    })
    if (scopedLoadPromises.has(loadKey)) return scopedLoadPromises.get(loadKey)

    const loadPromise = (async () => {
      let raw = null
      if (baseFilter.dateFilter === 'today') {
        raw = await fetchTasksForToday()
      } else if (baseFilter.dateFilter === 'tomorrow') {
        raw = await fetchTasksByDate(baseFilter.startDate)
      } else if (baseFilter.dateFilter === 'overdue') {
        raw = await fetchUnfinishedTasksBefore(baseFilter.endDate || baseFilter.startDate || today)
      } else if (baseFilter.dateFilter === 'range' || baseFilter.dateFilter === 'custom') {
        raw = await fetchTasksBetween(baseFilter.startDate, baseFilter.endDate)
      } else {
        await refreshAllTasks()
        syncFiltered(baseFilter)
        return tasks.value
      }

      const scopedTasks = replaceScopedTasksInCache(raw, baseFilter)
      activeFilter.value = { ...baseFilter }
      tasks.value = applyFilters(scopedTasks, baseFilter)
      initialized = true
      return tasks.value
    })()

    scopedLoadPromises.set(loadKey, loadPromise)
    try {
      return await loadPromise
    } finally {
      scopedLoadPromises.delete(loadKey)
    }
  }

  function mergeTasksLocally(taskEntries = []) {
    const normalized = normalizeList(taskEntries).filter((task) => task?.id && isCurrentWorkspaceTask(task))
    if (!normalized.length) return false
    const nextById = new Map(allTasks.value.map((task) => [task.id, task]))
    normalized.forEach((task) => {
      nextById.set(task.id, {
        ...(nextById.get(task.id) || {}),
        ...task,
      })
    })
    allTasks.value = sortTasks(Array.from(nextById.values()))
    syncFiltered()
    initialized = true
    return true
  }

  function removeTaskLocally(taskId, workspaceId = null) {
    if (!taskId || !isCurrentWorkspaceTask(workspaceId)) return false
    const nextAllTasks = allTasks.value.filter((task) => task.id !== taskId)
    if (nextAllTasks.length === allTasks.value.length) return false
    allTasks.value = nextAllTasks
    syncFiltered()
    return true
  }

  /**
   * Load tasks for a specific date (YYYY-MM-DD)
   */
  async function loadTasksForDate(dateStr) {
    const target = typeof dateStr === 'string' ? dateStr : makeTodayKey()
    return loadTasks({
      dateFilter: 'range',
      startDate: target,
      endDate: target,
    })
  }

  /**
   * Load tasks for a date range inclusive (YYYY-MM-DD)
   */
  async function loadTasksForRange(startYMD, endYMD) {
    const start = typeof startYMD === 'string' ? startYMD : makeTodayKey()
    const end = typeof endYMD === 'string' ? endYMD : start
    return loadTasks({
      dateFilter: 'range',
      startDate: start,
      endDate: end,
    })
  }

  /**
   * ➕ Add new task
   */
  async function addTask(newTask = null) {
    if (!newTask) throw new Error('Task data is required')
    const activeWorkspaceId = normalizeWorkspaceId(newTask?.workspaceId || workspaceStore?.activeWorkspaceId)
    const baseTask = {
      title: 'New Task',
      details: '',
      completed: false,
      logs: [],
      date: toLocalDateKey(new Date()), // YYYY-MM-DD local
      createdAt: Date.now(),
    }

    const task = {
      ...baseTask,
      ...(newTask || {}),
      ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}),
    }
    const normalizedTask = normalizeTask(task)
    const optimisticId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const optimisticTask = {
      ...normalizedTask,
      id: optimisticId,
      optimistic: true,
    }

    tasks.value = [optimisticTask, ...tasks.value]
    allTasks.value = sortTasks(uniqueById([optimisticTask, ...allTasks.value]))

    try {
      const saved = await addTaskToFirebase(task)
      const normalized = { ...saved, category: resolveCategory(saved?.category) }
      allTasks.value = sortTasks(
        uniqueById([normalized, ...allTasks.value.filter((t) => t.id !== optimisticId && t.id !== normalized.id)]),
      )
      syncFiltered()
      try {
        trackEvent('Task Created', {
          source: newTask?.source || 'manual',
          task_type: normalized?.category || 'Uncategorized',
          guest: !!authStore?.isGuest,
        })
      } catch (e) {
        console.warn('analytics: Task Created track failed', e)
      }
      return normalized
    } catch (err) {
      tasks.value = tasks.value.filter((t) => t.id !== optimisticId)
      allTasks.value = allTasks.value.filter((t) => t.id !== optimisticId)
      try {
        ElMessage.error('Could not create task. Please try again.')
      } catch {}
      throw err
    }
  }

  /**
   * ✅ Toggle completion
   */
  async function toggleComplete(task) {
    const wasCompleted = !!task?.completed
    try {
      task.completed = !task.completed
      await updateTaskInFirebase(task)
      allTasks.value = sortTasks(
        uniqueById(allTasks.value.map((t) => (t.id === task.id ? normalizeTask(task) : t))),
      )
      syncFiltered()
      if (!wasCompleted && task.completed) {
        try {
          const hour = new Date().getHours()
          const completion_time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
          trackEvent('Task Completed', { taskId: task.id, completion_time })
        } catch (e) {
          console.warn('analytics: Task Completed track failed', e)
        }
        try {
          await ensureRecurringNextTask(task)
        } catch (recurrenceError) {
          console.warn('Recurring task advance failed:', recurrenceError?.message || recurrenceError)
          try {
            ElMessage.warning('Task completed, but the next recurring task could not be created.')
          } catch {}
        }
      }
    } catch (err) {
      console.error('Failed to toggle complete:', err)
      task.completed = !task.completed // rollback on error
    }
  }

  /**
   * 📝 Add log (quick notes) for a task
   */
  async function addLog(task) {
    if (!task.newLog || !task.newLog.trim()) return
    task.logs = task.logs || []
    task.logs.push(task.newLog.trim())
    task.newLog = ''
    await updateTaskInFirebase(task)
    allTasks.value = sortTasks(
      uniqueById(allTasks.value.map((t) => (t.id === task.id ? normalizeTask(task) : t))),
    )
    syncFiltered()
  }

  /**
   * 💾 Persist order (after drag-and-drop)
   */
  async function persistOrder() {
    for (const [index, task] of tasks.value.entries()) {
      task.order = index
      await updateTaskInFirebase(task)
    }
    allTasks.value = sortTasks(uniqueById(allTasks.value.map((t) => normalizeTask(t))))
    syncFiltered()
  }

  /**
   * 🗑 Delete task
   */
  async function deleteTask(task) {
    await deleteTaskFromFirebase(task.id)
    tasks.value = tasks.value.filter((t) => t.id !== task.id)
    allTasks.value = allTasks.value.filter((t) => t.id !== task.id)
    syncFiltered()
  }

  /**
   * ↪️ Move tasks to a target date (used by auto-rollover + banner actions)
   */
  async function moveTasks(taskEntries = [], targetDate = makeTodayKey(), options = {}) {
    const entries = Array.isArray(taskEntries) ? taskEntries : []
    const normalized = entries
      .map((entry) => (typeof entry === 'string' ? { id: entry } : entry))
      .filter((entry) => entry?.id)
    if (!normalized.length) return []

    const normalizedDate = typeof targetDate === 'string' ? targetDate : toLocalDateKey(new Date(targetDate))
    const existingById = new Map(allTasks.value.map((t) => [t.id, t]))
    const payload = normalized.map((entry) => ({
      id: entry.id,
      workspaceId: entry.workspaceId || existingById.get(entry.id)?.workspaceId || null,
      previousDate:
        entry.previousDate || existingById.get(entry.id)?.previousDate || existingById.get(entry.id)?.date || entry.date || null,
      completed: options.completed ?? false,
    }))
    const ids = payload.map((p) => p.id)

    // Optimistic update
    allTasks.value = sortTasks(
      uniqueById(
        allTasks.value.map((t) =>
          ids.includes(t.id)
            ? normalizeTask({
                ...t,
                date: normalizedDate,
                status: options.status || 'pending',
                completed: options.completed ?? false,
                rolledOver: options.rolledOver ?? t.rolledOver,
                previousDate: payload.find((p) => p.id === t.id)?.previousDate || t.previousDate || null,
              })
            : t,
        ),
      ),
    )
    syncFiltered()

    try {
      await moveTasksToDate(payload, normalizedDate, {
        status: options.status || 'pending',
        rolledOver: options.rolledOver ?? false,
        rolledOverAt: options.rolledOver ? new Date() : undefined,
        completed: options.completed ?? false,
        previousDate: options.previousDate,
      })
      await refreshAllTasks()
    } catch (err) {
      console.warn('[useTasks] moveTasks failed', err?.message || err)
      await refreshAllTasks()
      throw err
    }
  }

  /**
   * ♻️ Auto-roll unfinished tasks forward once per day per user/workspace
   */
  async function ensureDailyRollover() {
    const userId = authStore?.user?.uid || null
    const wsId = workspaceStore?.activeWorkspaceId || localStorage.getItem('activeWorkspaceId') || null
    if (!userId || !wsId) return
    const today = makeTodayKey()
    const storageKey = `tasks:last-rollover:${userId}:${wsId}`
    const checkKey = `${storageKey}:${today}`
    if (lastRolloverKey === checkKey) return
    const lastSeen = (() => {
      try {
        return localStorage.getItem(storageKey)
      } catch {
        return null
      }
    })()
    if (lastSeen === today) {
      lastRolloverKey = checkKey
      return
    }

    try {
      const stale = await fetchUnfinishedTasksBefore(today)
      if (stale.length) {
        await moveTasks(stale, today, { rolledOver: true, status: 'pending', completed: false })
      }
      try {
        localStorage.setItem(storageKey, today)
      } catch {
        /* ignore */
      }
      lastRolloverKey = checkKey
    } catch (err) {
      console.warn('[useTasks] ensureDailyRollover failed', err?.message || err)
    }
  }

  // 🔹 Only load once when app starts, after auth + workspace are truly ready
  if (!initialized && isReady.value) {
    loadTasks().catch((err) =>
      console.warn('[useTasks] initial load failed', err?.message || err),
    )
  }
  if (!refreshListenerAttached) {
    try {
      window.addEventListener('tasks:refresh-request', (event) => {
        const detail = event?.detail || {}
        const incomingTasks = Array.isArray(detail?.tasks)
          ? detail.tasks
          : detail?.task
            ? [detail.task]
            : []

        if (detail?.reason === 'task-deleted' && detail?.taskId) {
          if (removeTaskLocally(detail.taskId, detail.workspaceId)) return
        }

        if (incomingTasks.length && mergeTasksLocally(incomingTasks)) return

        refreshAllTasks()
          .then(() => syncFiltered())
          .catch((err) => console.warn('[useTasks] refresh failed', err?.message || err))
      })
      refreshListenerAttached = true
    } catch (err) {
      console.warn('[useTasks] failed to attach refresh listener', err?.message || err)
    }
  }
  if (!workspaceWatchAttached) {
    try {
      watch(
        () => workspaceStore.activeWorkspaceId,
        async () => {
          if (!isReady.value) return
          allTasks.value = []
          tasks.value = []
          activeFilter.value = makeDefaultFilter()
          initialized = false
          await loadTasks().catch((err) =>
            console.warn('[useTasks] workspace switch load failed', err?.message || err),
          )
        },
      )
      workspaceWatchAttached = true
    } catch (err) {
      console.warn('[useTasks] failed to attach workspace watcher', err?.message || err)
    }
  }
  if (!authWatchAttached) {
    try {
      watch(
        () => isReady.value,
        async (ready) => {
          if (!ready) {
            if (authStore.user?.uid) return
            allTasks.value = []
            tasks.value = []
            initialized = false
            return
          }
          if (initialized) {
            syncFiltered()
            return
          }
          await loadTasks(activeFilter.value).catch((err) =>
            console.warn('[useTasks] auth refresh failed', err?.message || err),
          )
        },
        { immediate: true },
      )
      authWatchAttached = true
    } catch (err) {
      console.warn('[useTasks] failed to attach auth watcher', err?.message || err)
    }
  }

  return {
    tasks,
    allTasks,
    activeFilter,
    loadTasks,
    loadTasksForDate,
    loadTasksForRange,
    refreshAllTasks,
    addTask,
    toggleComplete,
    addLog,
    persistOrder,
    deleteTask,
    moveTasks,
    ensureDailyRollover,
    getTaskPlannedDate,
    mergeTasksLocally,
  }
}
