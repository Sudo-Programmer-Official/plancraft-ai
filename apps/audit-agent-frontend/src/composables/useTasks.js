// import { ref, onMounted } from "vue";
// import { fetchTasks, addTaskToFirebase, updateTaskInFirebase } from "@/services/firebaseService";

// export function useTasks() {
//   const tasks = ref([]);

//   async function loadTasks() {
//     tasks.value = await fetchTasks();
//   }

//   async function addTask() {
//     const newTask = {
//       title: "New Task",
//       details: "",
//       completed: false,
//       reflection: "",
//       date: new Date().toLocaleDateString(),
//       timestamp: Date.now(),
//     };
//     const savedTask = await addTaskToFirebase(newTask);
//     tasks.value.unshift(savedTask);
//   }

//   async function toggleComplete(task) {
//     task.completed = !task.completed;
//     await updateTaskInFirebase(task);
//   }

//   onMounted(loadTasks);

//   return { tasks, addTask, toggleComplete, loadTasks };
// }

// import { ref } from "vue"
// import { addTaskToFirebase, updateTaskInFirebase } from "@/services/firebaseService"

// const tasks = ref([])

// export function useTasks() {
//   async function addTask() {
//     const newTask = {
//       id: Date.now().toString(),
//       title: "New Task",
//       details: "",
//       completed: false,
//       logs: [],
//       date: new Date().toLocaleDateString(),
//     }
//     tasks.value.push(newTask)
//     await addTaskToFirebase(newTask)
//   }

//   async function toggleComplete(task) {
//     task.completed = !task.completed
//     await updateTaskInFirebase(task)
//   }

//   function addLog(task) {
//     if (!task.newLog) return
//     task.logs.push(task.newLog)
//     task.newLog = ""
//     updateTaskInFirebase(task)
//   }

//   async function persistOrder() {
//     for (const task of tasks.value) {
//       await updateTaskInFirebase(task)
//     }
//   }
//   async function updateTaskOrder() {
//   tasks.value.forEach(async (task, index) => {
//     await updateTaskInFirebase({ ...task, order: index })
//   })
// }

//   return { tasks, addTask, toggleComplete, addLog, persistOrder, updateTaskOrder }
// }


// src/composables/useTasks.js
import { ref, onMounted } from "vue"
import {
  fetchTasksForToday,
  addTaskToFirebase,
  updateTaskInFirebase,
  deleteTaskFromFirebase,
} from "@/services/firebaseService"

const tasks = ref([])

export function useTasks() {
  /**
   * 🔄 Load tasks from Firestore for today (and current user)
   */
  async function loadTasks() {
    tasks.value = await fetchTasksForToday()
  }

  /**
   * ➕ Add new task
   */
  async function addTask() {
    const newTask = {
      id: Date.now().toString(),
      title: "New Task",
      details: "",
      completed: false,
      logs: [],
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      createdAt: Date.now(),
    }

    // Save to Firestore → get back with real ID
    const saved = await addTaskToFirebase(newTask)
    tasks.value.unshift(saved)
  }

  /**
   * ✅ Toggle completion
   */
async function toggleComplete(task) {
  try {
    task.completed = !task.completed
    await updateTaskInFirebase(task) // your service already handles this
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
   * 💾 Update task order (alias, more explicit)
   */
  async function updateTaskOrder() {
    for (const [index, task] of tasks.value.entries()) {
      await updateTaskInFirebase({ ...task, order: index })
    }
  }

  /**
   * 🗑 Delete task
   */
  async function deleteTask(task) {
    await deleteTaskFromFirebase(task.id)
    tasks.value = tasks.value.filter((t) => t.id !== task.id)
  }

  // 🚀 Load tasks automatically when mounted
  onMounted(loadTasks)

  return {
    tasks,
    loadTasks,
    addTask,
    toggleComplete,
    addLog,
    persistOrder,
    updateTaskOrder,
    deleteTask,
  }
}