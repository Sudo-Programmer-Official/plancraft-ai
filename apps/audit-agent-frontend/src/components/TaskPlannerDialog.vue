<template>
  <el-dialog
    v-model="internalOpen"
    :title="props.task ? `✏️ Edit Task` : `📅 Plan for ${formattedDate}`"
    :width="dialogWidth"
    class="task-planner-dialog"
    destroy-on-close
    :style="{
      background: 'linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95)',
      color: '#e2e8f0',
      borderRadius: '0.5rem',
      boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
      border: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)'
    }"
    @close="closeDialog"
  >
    <!-- Date Picker -->
    <div class="mb-5">
      <label class="block text-sm text-slate-300 mb-1">Select Date</label>
      <el-date-picker
        v-model="selectedDate"
        type="date"
        placeholder="Pick a day"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        class="w-full"
      />
    </div>

    <!-- Input -->
    <el-input
      v-model="input"
      type="textarea"
      :rows="4"
      placeholder="Speak or type your task..."
      resize="none"
      class="mb-5"
    />

    <!-- Voice + Generate (only for new tasks) -->
    <div v-if="!props.task" class="flex gap-4 mb-6">
      <div class="flex flex-col items-center">
        <VoiceRecorder @transcribed="handleTranscript" class="w-full" />
      </div>
      <div class="flex flex-col items-center">
        <el-button
          type="success"
          @click="generateTasks"
          :loading="loading"
          :disabled="!input.trim()"
          class="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium shadow-md
            bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
            hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
            transition-all duration-300"
        >
          <template v-if="transcribing">⌛ Transcribing…</template>
          <template v-else>{{ loading ? '⏳ Generating...' : '➕ Generate Tasks' }}</template>
        </el-button>
      </div>
    </div>

    <!-- Footer -->
    <template v-if="props.editMode" #footer>
      <el-button @click="closeDialog" plain>Cancel</el-button>
      <el-button type="primary" @click="save"  class="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium shadow-md
         bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
         hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
         transition-all duration-300
         [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]" >
        {{ props.task ? "Update Task" : "Save Task" }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { ElNotification } from 'element-plus'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { generateTasksFromText } from '@/services/aiService'
import { addTaskToFirebase } from '@/services/firebaseService'
import { useTasks } from '@/composables/useTasks'
import { toLocalDateKey, parseLocalDateKey } from '@/utils/dateHelper'

const props = defineProps({
  open: Boolean,
  date: { type: [String, Date], default: () => toLocalDateKey(new Date()) },
  task: Object, // if provided, we’re in edit mode
  editMode: { type: Boolean, default: false } // show save/cancel buttons
})
const emit = defineEmits(['close', 'saved'])

const { tasks, loadTasks } = useTasks()

const internalOpen = ref(props.open)
const input = ref('')
const selectedDate = ref(
  typeof props.date === 'string' ? props.date : toLocalDateKey(props.date)
)
const loading = ref(false)
const transcribing = ref(false)

// Responsive width
const screenWidth = ref(window.innerWidth)
onMounted(() => window.addEventListener("resize", () => screenWidth.value = window.innerWidth))
onBeforeUnmount(() => window.removeEventListener("resize", () => {}))

const dialogWidth = computed(() => screenWidth.value < 640 ? "90%" : "520px")

// Watchers
watch(() => props.task, (task) => {
  if (task) {
    input.value = task.title || ""
    selectedDate.value = task.date
  } else {
    input.value = ""
    selectedDate.value = props.date || ""
  }
}, { immediate: true })
watch(() => props.open, (val) => internalOpen.value = val)
watch(internalOpen, (val) => { if (!val) emit('close') })

// const formattedDate = computed(() => {
//   const dateObj = parseLocalDateKey(selectedDate.value)
//   return dateObj.toLocaleDateString(undefined, {
//     weekday: 'short',
//     month: 'short',
//     day: 'numeric',
//   })
// })
const formattedDate = computed(() => {
  // Ensure we always have a string date key
  const dateKey = typeof selectedDate.value === "string"
    ? selectedDate.value
    : toLocalDateKey(selectedDate.value)

  const dateObj = parseLocalDateKey(dateKey)
  return dateObj.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
})

// Handlers
function handleTranscript(text) {
  input.value = text
  transcribing.value = true
  setTimeout(() => transcribing.value = false, 2000)
}

// async function generateTasks() {
//   if (!input.value.trim()) return
//   loading.value = true
//   try {
//     const items = await generateTasksFromText(input.value)
//     for (const [i, t] of items.entries()) {
//       const newTask = {
//         title: t,
//         details: '',
//         completed: false,
//         date: toLocalDateKey(parseLocalDateKey(selectedDate.value)),
//         order: tasks.value.length + i,
//         logs: [],
//       }
//       const saved = await addTaskToFirebase(newTask)
//       tasks.value.push(saved)
//     }
//     ElNotification({
//       title: 'Success',
//       message: `${items.length} task${items.length > 1 ? 's' : ''} generated`,
//       type: 'success',
//       duration: 2500,
//     })
//     emit('saved')
//     closeDialog()
//   } catch (err) {
//     console.error(err)
//     ElNotification({
//       title: 'Error',
//       message: 'Task generation failed. Please try again.',
//       type: 'error',
//       duration: 3000,
//     })
//   } finally {
//     loading.value = false
//     input.value = ''
//     await loadTasks()
//   }
// }
async function generateTasks() {
  if (!input.value.trim()) return
  loading.value = true
  try {
    const items = await generateTasksFromText(input.value)

    for (const [i, t] of items.entries()) {
      const newTask = {
        title: t,
        details: '',
        completed: false,
        date: toLocalDateKey(parseLocalDateKey(selectedDate.value)),
        order: tasks.value.length + i,
        logs: []
      }
      await addTaskToFirebase(newTask) // 🔹 don’t push here
    }

    ElNotification({
      title: 'Success',
      message: `${items.length} task${items.length > 1 ? 's' : ''} generated`,
      type: 'success',
      duration: 2500,
    })

    emit('saved', items)   // parent will reload tasks
    closeDialog()
  } catch (err) {
    console.error(err)
    ElNotification({
      title: 'Error',
      message: 'Task generation failed. Please try again.',
      type: 'error',
      duration: 3000,
    })
  } finally {
    loading.value = false
    input.value = ''
  }
}

function save() {
  if (props.task) {
    // Update
    emit("saved", { ...props.task, title: input.value, date: selectedDate.value })
    ElNotification({
      title: 'Success',
      message: 'Task updated successfully',
      type: 'success',
      duration: 2000,
    })
  } else {
    // Create
    emit("saved", { title: input.value, date: selectedDate.value })
    ElNotification({
      title: 'Success',
      message: 'Task saved successfully',
      type: 'success',
      duration: 2000,
    })
  }
  closeDialog()
}

function closeDialog() {
  internalOpen.value = false
  emit('close')
}
</script>

<style scoped>
/* Dialog title readable on dark gradient */
:deep(.el-dialog__header .el-dialog__title) {
  color: #ffffff !important;
}

/* Dark-theme friendly date input */
:deep(.el-date-editor .el-input__wrapper) {
  background-color: transparent !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: none !important;
}

:deep(.el-input__inner) {
  color: #ffffff !important;
}

:deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.5) !important;
}
</style>

<style lang="scss">
/* Dialog background */
.task-planner-dialog .el-dialog {
  background: linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95);
  color: #e2e8f0;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);

  
}



/* Title */
.task-planner-dialog .el-dialog__header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  font-weight: 600;
  .el-dialog__title {
    color: #f1f5f9 !important;
  }
}

/* Inputs */
.task-planner-dialog .el-input__inner,
.task-planner-dialog .el-textarea__inner {
  background-color: rgba(255, 255, 255, 0.1);  /* semi-transparent */
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.task-planner-dialog .el-input__inner::placeholder,
.task-planner-dialog .el-textarea__inner::placeholder {
  color: #cbd5e1;  /* light slate */
}

/* Voice + Generate buttons aligned */
.task-planner-dialog .el-button {
  font-weight: 500;
  border-radius: 0.5rem;
}
.task-planner-dialog .el-button--success {
  background: #22c55e; /* green-500 */
  border: none;
}
.task-planner-dialog .el-button--success:hover {
  background: #16a34a; /* green-600 */
}
.task-planner-dialog .el-button--default {
  background: transparent;
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Footer */
.task-planner-dialog .el-dialog__footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
}
/* TaskPlannerDialog.vue or global theme file */

/* Date picker dropdown (popper) */
.task-planner-dialog .el-picker-panel {
  background: linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95) !important;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem !important;
  color: #f1f5f9 !important; /* slate-100 */
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
}

/* Calendar header (year/month nav) */
.task-planner-dialog .el-date-picker__header,
.task-planner-dialog .el-picker-panel__icon-btn {
  color: #f8fafc !important;
}

/* Weekday labels */
.task-planner-dialog .el-date-table th {
  color: #cbd5e1 !important; /* slate-300 */
}

/* Days */
.task-planner-dialog .el-date-table td {
  color: #e2e8f0 !important; /* slate-200 */
  border-radius: 0.5rem;
  transition: background 0.2s ease;
}

/* Hovered day */
.task-planner-dialog .el-date-table td:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}

/* Selected day */
// .task-planner-dialog .el-date-table td.current {
//   background: #6366f1 !important; /* indigo-500 */
//   color: white !important;
// }

/* Today’s day */
// .task-planner-dialog .el-date-table td.today {
//   border: 1px solid #38bdf8 !important; /* cyan-400 */
// }
/* === Date Picker Popup (Global Override) === */
.el-picker-panel {
  background: linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95) !important;
  border-radius: 0.75rem !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  color: #f1f5f9 !important; /* slate-100 */
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6) !important;
}

/* Header (year/month nav + arrows) */
.el-picker-panel__icon-btn,
.el-date-picker__header,
.el-date-picker__header-label {
  color: #f8fafc !important;
}

/* Weekday labels */
.el-date-table th {
  color: #cbd5e1 !important; /* slate-300 */
}

/* Normal days */
.el-date-table td {
  color: #e2e8f0 !important; /* slate-200 */
  border-radius: 0.5rem !important;
  transition: background 0.2s ease;
}

/* Hover effect */
.el-date-table td:hover {
  background: rgba(255, 255, 255, 0.15) !important;
}

/* Selected day */
.el-date-table td.current {
  background: #6366f1 !important; /* indigo-500 */
  color: white !important;
}

/* Today highlight */
// .el-date-table td.today {
//   border: 1px solid #38bdf8 !important; /* cyan-400 */
// }
</style>