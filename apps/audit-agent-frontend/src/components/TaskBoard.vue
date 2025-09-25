<template>
 <!-- Task Board -->
<section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
  <!-- Header with button -->
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-lg sm:text-xl font-semibold">📋 Today's Tasks</h2>
    <button
      @click="openPlanner"
      class="flex items-center gap-2 
             bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500
             hover:from-indigo-600 hover:via-purple-700 hover:to-pink-600
             text-white px-3 sm:px-4 py-1.5 sm:py-2 
             rounded-lg shadow-md text-sm sm:text-base font-medium 
             transition-all duration-200"
    >
      <span class="text-base sm:text-lg">➕</span>
      <span>Add Task</span>
    </button>
  </div>

  <!-- Draggable tasks -->
  <draggable
    v-model="tasks"
    item-key="id"
    class="space-y-4"
    handle=".drag-handle"
    @end="persistOrder"
  >
  <template #item="{ element: task }">
  <div
    class="bg-slate-900/40 p-4 rounded-xl shadow flex items-start gap-3 border border-slate-700/50"
  >
    <!-- Checkbox -->
    <input
      type="checkbox"
      :checked="task.completed"
      @change="() => toggleComplete(task)"
      class="mt-1 w-5 h-5 cursor-pointer accent-green-500"
    />

    <!-- Task body -->
    <div class="flex-1">
      <div class="flex justify-between items-center">
        <span
          class="text-base sm:text-lg font-medium"
          :class="{ 'line-through text-slate-500': task.completed }"
        >
          {{ task.title }}
        </span>
        <span class="text-xs text-slate-400">{{ task.date }}</span>
      </div>

      <p v-if="task.details" class="mt-2 text-sm text-slate-300">
        {{ task.details }}
      </p>

      <ul v-if="task.logs?.length" class="mt-2 space-y-1 text-xs text-slate-400">
        <li v-for="(log, idx) in task.logs" :key="idx">– {{ log }}</li>
      </ul>

      <div class="flex gap-2 mt-3">
        <button
          @click="openDialog(task)"
          class="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-white"
        >
          ✏️ Edit
        </button>
        <button
          @click="deleteTask(task)"
          class="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white"
        >
          🗑 Delete
        </button>
      </div>
    </div>

    <!-- Drag handle -->
    <span class="drag-handle cursor-grab text-slate-500 ml-2">☰</span>
  </div>
</template>
  </draggable>
</section>

<!-- Put the dialog **outside** the section -->
<TaskPlannerDialog
  v-if="showPlanner"
  :open="showPlanner"
  :date="today"
  :task="selectedTask"
  @saved="handleSave"
  @close="closePlanner"
/>
</template>

<script setup>
import draggable from 'vuedraggable'
import { ref, onMounted } from 'vue'
import { useTasks } from '@/composables/useTasks'
// import TaskDialog from '@/components/TaskDialog.vue'
import { addTaskToFirebase, updateTaskInFirebase } from '@/services/firebaseService'
import TaskPlannerDialog from './TaskPlannerDialog.vue'
import { toLocalDateKey } from '@/utils/dateHelper'


const { tasks, loadTasks, toggleComplete, deleteTask, persistOrder } = useTasks()

const showDialog = ref(false)
const selectedTask = ref(null)

// Planner dialog state
const showPlanner = ref(false)
const today = toLocalDateKey(new Date())  // e.g. "2025-09-21"
function openPlanner() {
  showPlanner.value = true
}
function closePlanner() {
  showPlanner.value = false
  selectedTask.value = null
}

// async function reload() {
//   await loadTasks()
//   closePlanner()
// }

async function handleSave(task) {
  if (task.id) {
    await updateTaskInFirebase(task)
  } else {
    await addTaskToFirebase(task)
  }
  await loadTasks()
  closePlanner()
}

// onMounted(loadTasks)

function openDialog(task = null) {
  selectedTask.value = task
  showDialog.value = true
  showPlanner.value = true
}

// function closeDialog() {
//   selectedTask.value = null
//   showDialog.value = false
// }

// async function reload() {
//   await loadTasks()
//   closeDialog()
// }

onMounted(loadTasks)
</script>

<style scoped>
.v-move,
.v-enter-active,
.v-leave-active {
  transition: all 180ms ease;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
