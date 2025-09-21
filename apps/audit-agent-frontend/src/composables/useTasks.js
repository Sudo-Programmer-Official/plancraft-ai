// src/composables/useTasks.js
import { ref } from "vue"
import { useAuthStore } from "@/stores/authStore"
import {
  fetchTasksForToday,
  fetchTasksByDate,
  fetchTasksBetween,
  addTaskToFirebase,
  updateTaskInFirebase,
  deleteTaskFromFirebase,
} from "@/services/firebaseService"

// 🔗 Shared singleton state
const tasks = ref([])
let initialized = false

export function useTasks() {
  const authStore = useAuthStore()

  /**
   * 🔄 Load tasks (today / from cache)
   */
  async function loadTasks() {
    if (authStore.isLoggedIn) {
      tasks.value = await fetchTasksForToday()
    } else {
      const cached = localStorage.getItem("guestTasks")
      tasks.value = cached ? JSON.parse(cached) : []
    }
    initialized = true
  }

  /**
   * Load tasks for a specific date (YYYY-MM-DD)
   */
  async function loadTasksForDate(dateStr) {
    if (authStore.isLoggedIn) {
      tasks.value = await fetchTasksByDate(dateStr)
    } else {
      const cached = localStorage.getItem("guestTasks")
      tasks.value = cached ? JSON.parse(cached) : []
    }
    initialized = true
  }

  /**
   * Load tasks for a date range inclusive (YYYY-MM-DD)
   */
  async function loadTasksForRange(startYMD, endYMD) {
    if (authStore.isLoggedIn) {
      tasks.value = await fetchTasksBetween(startYMD, endYMD)
    } else {
      const cached = localStorage.getItem("guestTasks")
      tasks.value = cached ? JSON.parse(cached) : []
    }
    initialized = true
  }

  /**
   * ➕ Add new task
   */
  async function addTask(newTask = null) {
    const baseTask = {
      id: Date.now().toString(),
      title: "New Task",
      details: "",
      completed: false,
      logs: [],
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      createdAt: Date.now(),
    }

    const task = { ...baseTask, ...(newTask || {}) }

    if (authStore.isLoggedIn) {
      const saved = await addTaskToFirebase(task)
      tasks.value.unshift(saved)
    } else {
      tasks.value.unshift(task)
      localStorage.setItem("guestTasks", JSON.stringify(tasks.value))
    }
  }

  /**
   * ✅ Toggle completion
   */
  async function toggleComplete(task) {
    try {
      task.completed = !task.completed
      if (authStore.isLoggedIn) {
        await updateTaskInFirebase(task)
      } else {
        localStorage.setItem("guestTasks", JSON.stringify(tasks.value))
      }
    } catch (err) {
      console.error("Failed to toggle complete:", err)
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
    task.newLog = ""

    if (authStore.isLoggedIn) {
      await updateTaskInFirebase(task)
    } else {
      localStorage.setItem("guestTasks", JSON.stringify(tasks.value))
    }
  }

  /**
   * 💾 Persist order (after drag-and-drop)
   */
  async function persistOrder() {
    for (const [index, task] of tasks.value.entries()) {
      task.order = index
      if (authStore.isLoggedIn) {
        await updateTaskInFirebase(task)
      }
    }
    if (!authStore.isLoggedIn) {
      localStorage.setItem("guestTasks", JSON.stringify(tasks.value))
    }
  }

  /**
   * 🗑 Delete task
   */
  async function deleteTask(task) {
    if (authStore.isLoggedIn) {
      await deleteTaskFromFirebase(task.id)
    }
    tasks.value = tasks.value.filter((t) => t.id !== task.id)
    if (!authStore.isLoggedIn) {
      localStorage.setItem("guestTasks", JSON.stringify(tasks.value))
    }
  }

  // 🔹 Only load once when app starts
  if (!initialized) loadTasks()

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