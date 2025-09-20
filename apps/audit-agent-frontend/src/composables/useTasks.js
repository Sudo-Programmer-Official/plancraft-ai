// src/composables/useTasks.js
import { ref } from "vue"
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
  /**
   * 🔄 Load tasks from Firestore for today (and current user)
   */
  async function loadTasks() {
    tasks.value = await fetchTasksForToday()
    initialized = true
  }

  /**
   * Load tasks for a specific date (YYYY-MM-DD)
   */
  async function loadTasksForDate(dateStr) {
    tasks.value = await fetchTasksByDate(dateStr)
    initialized = true
  }

  /**
   * Load tasks for a date range inclusive (YYYY-MM-DD)
   */
  async function loadTasksForRange(startYMD, endYMD) {
    tasks.value = await fetchTasksBetween(startYMD, endYMD)
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

    const saved = await addTaskToFirebase(task)
    tasks.value.unshift(saved)
  }

  /**
   * ✅ Toggle completion
   */
  async function toggleComplete(task) {
    try {
      task.completed = !task.completed
      await updateTaskInFirebase(task)
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
