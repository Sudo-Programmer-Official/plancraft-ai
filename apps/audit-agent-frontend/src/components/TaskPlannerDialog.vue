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
    <template #footer>
      <el-button @click="closeDialog" plain>Cancel</el-button>
      <el-button type="primary" @click="save">
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
  task: Object // if provided, we’re in edit mode
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