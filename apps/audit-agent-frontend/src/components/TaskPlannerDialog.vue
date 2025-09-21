<template>
  <el-dialog
    v-model="internalOpen"
    :title="`📅 Plan for ${formattedDate}`"
    width="500px"
    class="rounded-2xl"
    destroy-on-close
  >
    <!-- Date Picker -->
    <div class="mb-4">
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
      placeholder="Speak or type your plan..."
      resize="none"
      class="mb-4"
    />

    <!-- Voice + Generate -->
    <div class="flex gap-3 mb-6">
      <div class="flex-1 flex flex-col items-center">
        <VoiceRecorder @transcribed="handleTranscript" class="w-full" />
        <span class="text-xs text-slate-400 mt-1">Tap to start speaking</span>
      </div>

      <div class="flex-1 flex flex-col items-center">
        <el-button
          type="success"
          @click="generateTasks"
          :loading="loading"
          :disabled="!input.trim()"
          class="w-full h-11"
        >
          {{ loading ? '⏳ Generating...' : '➕ Generate Tasks' }}
        </el-button>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <el-button @click="closeDialog">Cancel</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElNotification } from 'element-plus'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { generateTasksFromText } from '@/services/aiService'
import { addTaskToFirebase } from '@/services/firebaseService'
import { useTasks } from '@/composables/useTasks'

const props = defineProps({
  open: Boolean,
  date: { type: [String, Date], default: () => new Date().toISOString().split('T')[0] },
})
const emit = defineEmits(['close', 'saved'])

const { tasks, loadTasks } = useTasks()

// Reactive states
const internalOpen = ref(props.open)
const input = ref('')
const selectedDate = ref(props.date) // always string (YYYY-MM-DD)
const loading = ref(false)

// Keep internalOpen synced with parent
watch(() => props.open, (val) => (internalOpen.value = val))
watch(internalOpen, (val) => { if (!val) emit('close') })

// Format header date
const formattedDate = computed(() => {
  let dateStr = selectedDate.value
  if (dateStr instanceof Date) dateStr = dateStr.toISOString().split('T')[0]

  if (typeof dateStr === 'string') {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }
  return new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
})

function handleTranscript(text) {
  input.value = text
}

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
        date: selectedDate.value,
        order: tasks.value.length + i,
        logs: [],
      }
      const saved = await addTaskToFirebase(newTask)
      tasks.value.push(saved)
    }

    ElNotification({
      title: 'Success',
      message: `${items.length} task${items.length > 1 ? 's' : ''} generated for ${formattedDate.value}`,
      type: 'success',
      duration: 2500,
    })

    emit('saved')
    setTimeout(() => closeDialog(), 800)
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
    await loadTasks()
  }
}

function closeDialog() {
  internalOpen.value = false
  emit('close')
}
</script>

<style scoped>
.el-dialog {
  background-color: #0f172a; /* slate-900 */
  color: #e2e8f0; /* gray-200 */
  border-radius: 1rem;
}
</style>