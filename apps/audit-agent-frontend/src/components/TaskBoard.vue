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
      class="space-y-3"
      handle=".drag-handle"
      @end="persistOrder"
    >
      <template #item="{ element: task }">
        <div
          class="bg-slate-900/40 p-4 rounded-xl shadow border border-slate-700/50 transition-all"
        >
          <div class="flex items-start gap-3">
            <!-- Checkbox -->
            <input
              type="checkbox"
              :checked="task.completed"
              @change="() => toggleComplete(task)"
              class="mt-1 w-5 h-5 cursor-pointer accent-green-500"
            />

            <!-- Main body -->
            <div class="flex-1">
              <div class="flex justify-between items-center">
                <span
                  class="text-base sm:text-lg font-medium"
                  :class="{ 'line-through text-slate-500': task.completed }"
                >
                  {{ task.title }}
                </span>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-400">{{ task.date }}</span>
                  <!-- Expand toggle -->
                  <!-- <button
                    @click="toggleExpand(task.id)"
                    class="text-slate-400 hover:text-slate-200"
                  >
                    {{ expanded.has(task.id) ? "▾" : "▸" }}
                  </button> -->
                </div>
              </div>

              <!-- Expanded details -->
             <!-- Expanded details -->
<transition name="fade">
  <div v-if="expanded.has(task.id)" class="mt-3 space-y-3">
    <p v-if="task.details" class="text-sm text-slate-300">
      {{ task.details }}
    </p>

    <!-- Optional Link -->
    <p v-if="task.link" class="text-sm">
      <a
        :href="task.link"
        target="_blank"
        rel="noopener noreferrer"
        class="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
      >
        🔗 Open Link
      </a>
    </p>

    <ul v-if="task.logs?.length" class="space-y-1 text-xs text-slate-400">
      <li v-for="(log, idx) in task.logs" :key="idx">– {{ log }}</li>
    </ul>

    <div class="flex gap-2">
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
</transition>
            </div>

           <!-- Drag handle with expand toggle -->
<button
  @click.stop="toggleExpand(task.id)"
  class="drag-handle cursor-grab text-slate-500 ml-2 hover:text-slate-300"
  title="Expand/Collapse"
>
  {{ expanded.has(task.id) ? "▾" : "☰" }}
</button>
          </div>
        </div>
      </template>
    </draggable>
  </section>

  <!-- Task dialog -->
  <TaskPlannerDialog
    v-if="showPlanner"
    :open="showPlanner"
    :edit-mode="!!selectedTask"
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
import { addTaskToFirebase, updateTaskInFirebase } from '@/services/firebaseService'
import TaskPlannerDialog from './TaskPlannerDialog.vue'
import { toLocalDateKey } from '@/utils/dateHelper'

const { tasks, loadTasks, toggleComplete, deleteTask, persistOrder } = useTasks()

const selectedTask = ref(null)
const showPlanner = ref(false)
const today = toLocalDateKey(new Date())

// Track expanded task IDs
const expanded = ref(new Set())

function toggleExpand(id) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
}

function openPlanner() {
  showPlanner.value = true
}
function closePlanner() {
  showPlanner.value = false
  selectedTask.value = null
}

async function handleSave(payload) {
  if (Array.isArray(payload)) {
    await loadTasks()
    return closePlanner()
  }
  if (payload.id) {
    await updateTaskInFirebase(payload)
  } else {
    await addTaskToFirebase(payload)
  }
  await loadTasks()
  closePlanner()
}

function openDialog(task = null) {
  selectedTask.value = task
  showPlanner.value = true
}

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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>