// src/composables/useTasks.js
import { ref } from 'vue'
import { trackEvent } from '@/services/analytics'
import { useAuthStore } from '@/stores/authStore'
import { toLocalDateKey } from '@/utils/dateHelper'
import {
  fetchTasksForToday,
  fetchTasksByDate,
  fetchTasksBetween,
  addTaskToFirebase,
  updateTaskInFirebase,
  deleteTaskFromFirebase,
} from '@/services/firebaseService'
import { resolveCategory } from '@/constants/taskCategories'

// 🔗 Shared singleton state
const tasks = ref([])
let initialized = false
let refreshListenerAttached = false

export function useTasks() {
  const authStore = useAuthStore()
  /**
   * 🔄 Load tasks from Firestore for today (and current user)
   */
  function uniqueById(list) {
    return Array.from(new Map((Array.isArray(list) ? list : []).map(t => [t.id, t])).values())
  }

  function normalizeList(raw) {
    const base = Array.isArray(raw) ? raw : []
    return base.map((task) => ({
      ...task,
      category: resolveCategory(task?.category),
    }))
  }

  async function loadTasks() {
    const raw = await fetchTasksForToday()

    // Ensure newest first + incomplete before complete
    tasks.value = normalizeList(uniqueById(raw)).sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed - b.completed // incomplete first
      }
      return (b.createdAt || 0) - (a.createdAt || 0) // newest first
    })
    try { if (import.meta.env.DEV) console.log('[useTasks] loadTasks ids:', tasks.value.map(t => t.id)) } catch {}

    initialized = true
  }

  /**
   * Load tasks for a specific date (YYYY-MM-DD)
   */
  async function loadTasksForDate(dateStr) {
    const raw = await fetchTasksByDate(dateStr)

    tasks.value = normalizeList(uniqueById(raw)).sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed - b.completed
      }
      return (b.createdAt || 0) - (a.createdAt || 0)
    })
    try { if (import.meta.env.DEV) console.log('[useTasks] loadTasksForDate ids:', tasks.value.map(t => t.id)) } catch {}

    initialized = true
  }

  /**
   * Load tasks for a date range inclusive (YYYY-MM-DD)
   */
  async function loadTasksForRange(startYMD, endYMD) {
    tasks.value = normalizeList(uniqueById(await fetchTasksBetween(startYMD, endYMD)))

    // add sorting if needed
    tasks.value.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed - b.completed // incomplete first
      }
      return (b.createdAt || 0) - (a.createdAt || 0) // newest first
    })
    try { if (import.meta.env.DEV) console.log('[useTasks] loadTasksForRange ids:', tasks.value.map(t => t.id)) } catch {}

    initialized = true
  }

  /**
   * ➕ Add new task
   */
  async function addTask(newTask = null) {
      if (!newTask) throw new Error("Task data is required")
    const baseTask = {
      // id: Date.now().toString(),
      title: 'New Task',
      details: '',
      completed: false,
      logs: [],
      date: toLocalDateKey(new Date()), // YYYY-MM-DD local
      createdAt: Date.now(),
    }

    const task = { ...baseTask, ...(newTask || {}) }

    const saved = await addTaskToFirebase(task)
    // Replace by id if exists; then put newest first
    const normalized = { ...saved, category: resolveCategory(saved?.category) }
    tasks.value = [normalized, ...tasks.value.filter(t => t.id !== normalized.id)]
    try { if (import.meta.env.DEV) console.log('[useTasks] addTask ids:', tasks.value.map(t => t.id)) } catch {}
    try {
      trackEvent('Task Created', {
        source: newTask?.source || 'journal',
        guest: !!authStore?.isGuest,
      })
    } catch (e) {
      console.warn('analytics: Task Created track failed', e)
    }
  }

  /**
   * ✅ Toggle completion
   */
  async function toggleComplete(task) {
    try {
      task.completed = !task.completed
      await updateTaskInFirebase(task)
      if (task.completed) {
        try {
          trackEvent('Task Completed', { taskId: task.id })
        } catch (e) {
          console.warn('analytics: Task Completed track failed', e)
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
  }

  /**
   * 💾 Persist order (after drag-and-drop)
   */
  async function persistOrder() {
    for (const [index, task] of tasks.value.entries()) {
      task.order = index
      await updateTaskInFirebase(task)
    }
  }

  /**
   * 🗑 Delete task
   */
  async function deleteTask(task) {
    await deleteTaskFromFirebase(task.id)
    tasks.value = tasks.value.filter((t) => t.id !== task.id)
  }

  // 🔹 Only load once when app starts
  if (!initialized) loadTasks()
  if (!refreshListenerAttached) {
    try {
      window.addEventListener('tasks:refresh-request', () => {
        loadTasks().catch((err) => console.warn('[useTasks] refresh failed', err?.message || err))
      })
      refreshListenerAttached = true
    } catch (err) {
      console.warn('[useTasks] failed to attach refresh listener', err?.message || err)
    }
  }

  return {
    tasks,
    loadTasks,
    loadTasksForDate,
    loadTasksForRange,
    addTask,
    toggleComplete,
    addLog,
    persistOrder,
    deleteTask,
  }
}
