<template>
  <section class="max-w-4xl mx-auto mb-12">
    <h2 class="text-2xl font-semibold mb-4">📋 Today's Tasks</h2>

    <!-- Draggable task list -->
    <draggable
      v-model="tasks"
      item-key="id"
      class="space-y-3"
      handle=".drag-handle"
      @end="persistOrder"
    >
      <template #item="{ element: task }">
        <div
          class="bg-slate-800/60 p-4 rounded-xl shadow flex items-start gap-3"
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
            <!-- Title + date -->
            <div class="flex justify-between items-center">
              <span
                class="text-lg font-medium select-none"
                :class="{ 'line-through text-slate-500': task.completed }"
              >
                {{ task.title }}
              </span>
              <span class="text-xs text-slate-400">{{ task.date }}</span>
            </div>

            <!-- Details -->
            <p v-if="task.details" class="mt-2 text-sm text-slate-300">
              {{ task.details }}
            </p>

            <!-- Logs -->
            <ul
              v-if="task.logs?.length"
              class="mt-2 space-y-1 text-xs text-slate-400"
            >
              <li v-for="(log, idx) in task.logs" :key="idx">– {{ log }}</li>
            </ul>

            <!-- Actions -->
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
          <span class="drag-handle cursor-grab ml-2 text-slate-500">☰</span>
        </div>
      </template>
    </draggable>

    <!-- Add Task Button -->
    <div class="flex justify-end mt-6">
      <button
        @click="openDialog()"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow"
      >
        ➕ Add Task
      </button>
    </div>

    <!-- Modal -->
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