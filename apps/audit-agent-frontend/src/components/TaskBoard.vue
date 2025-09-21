<template>
  <section class="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-md border border-white/10">
    <h2 class="text-lg sm:text-xl font-semibold mb-4">📋 Today's Tasks</h2>

    <draggable
      v-model="tasks"
      item-key="id"
      class="space-y-4"
      handle=".drag-handle"
      @end="persistOrder"
    >
      <template #item="{ element: task }">
        <div class="bg-slate-900/40 p-4 rounded-xl shadow flex items-start gap-3 border border-slate-700/50">
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

    <div class="flex justify-end mt-6">
      <button
        @click="openDialog()"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow"
      >
        ➕ Add Task
      </button>
    </div>

    <TaskDialog
      v-if="showDialog"
      :task="selectedTask"
      @saved="reload"
      @close="closeDialog"
    />
  </section>
</template>

<script setup>
import draggable from "vuedraggable"
import { ref, onMounted } from "vue"
import { useTasks } from "@/composables/useTasks"
import TaskDialog from "@/components/TaskDialog.vue"

const { tasks, loadTasks, toggleComplete, deleteTask, persistOrder } = useTasks()

const showDialog = ref(false)
const selectedTask = ref(null)

function openDialog(task = null) {
  selectedTask.value = task
  showDialog.value = true
}

function closeDialog() {
  selectedTask.value = null
  showDialog.value = false
}

async function reload() {
  await loadTasks()
  closeDialog()
}

onMounted(loadTasks)
</script>

<style scoped>
.v-move, .v-enter-active, .v-leave-active { transition: all 180ms ease; }
.v-enter-from, .v-leave-to { opacity: 0; transform: translateY(4px); }
</style>
