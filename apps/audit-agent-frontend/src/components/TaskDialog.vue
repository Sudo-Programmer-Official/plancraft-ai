<template>
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
    <div class="bg-white text-gray-900 p-6 rounded-xl w-full max-w-md relative z-[10000]">
      <h3 class="text-lg font-bold mb-4">
        {{ form.id ? '✏️ Edit Task' : '➕ New Task' }}
      </h3>

      <!-- Form -->
      <div class="space-y-4">
        <!-- Title -->
        <input
          v-model="form.title"
          placeholder="Title"
          class="w-full p-3 border rounded"
        />

        <!-- Details -->
        <textarea
          v-model="form.details"
          placeholder="Details..."
          rows="3"
          class="w-full p-3 border rounded"
        ></textarea>

        <!-- Voice Recorder -->
        <button
          @click="toggleRecording"
          :class="isRecording ? 'bg-red-500' : 'bg-indigo-600'"
          class="px-3 py-2 rounded text-white mt-2"
        >
          {{ isRecording ? '🎙️ Recording… Tap to Stop' : '🎤 Add by Voice' }}
        </button>

        <!-- Date -->
        <input
          v-model="form.date"
          type="date"
          class="w-full p-3 border rounded"
        />
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6">
        <button @click="$emit('close')" class="px-4 py-2 rounded bg-gray-300">
          Cancel
        </button>
        <button
          @click="save"
          class="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue"
import { addTaskToFirebase, updateTaskInFirebase } from "@/services/firebaseService"
import { useVoiceRecorder } from "@/composables/useVoiceRecorder"
import api from "@/services/api"
import { useAuthStore } from "@/stores/authStore"

const props = defineProps({
  task: { type: Object, default: null }
})
const emit = defineEmits(["saved", "close"])

const today = new Date().toISOString().split("T")[0]

const form = ref({
  id: null,
  title: "",
  details: "",
  date: today,
  completed: false,
  logs: [],
})

const authStore = useAuthStore()
let initialDate = null

// Watch for incoming task (edit mode)
watch(
  () => props.task,
  (t) => {
    if (t) {
      form.value = { ...t }
      initialDate = t.date || null
    } else {
      form.value = {
        id: null,
        title: "",
        details: "",
        date: today,
        completed: false,
        logs: [],
      }
      initialDate = form.value.date
    }
  },
  { immediate: true }
)

// Voice recorder for details
const { isRecording, startRecording, stopRecording } = useVoiceRecorder(async (rawText) => {
  form.value.details = rawText
})

function toggleRecording() {
  isRecording.value ? stopRecording() : startRecording()
}

// Save new or update existing task
async function save() {
  if (!form.value.title.trim()) return

  if (form.value.id) {
    await updateTaskInFirebase(form.value)
  } else {
    const saved = await addTaskToFirebase(form.value)
    form.value.id = saved.id // assign Firestore doc id
  }

  try {
    const uid = authStore?.user?.uid
    const hasDate = !!form.value.date
    if (uid && form.value.id) {
      if (hasDate) {
        // Schedule/update reminder using natural language text + date hint
        const text = `${form.value.title} on ${form.value.date}`
        await api.post('/reminders/text', {
          userId: uid,
          taskId: form.value.id,
          text,
          channels: ['whatsapp','pwa'],
        })
      } else if (!hasDate && initialDate) {
        // Date removed → cancel any pending reminders for this task
        await api.post('/reminders/cancel', {
          userId: uid,
          taskId: form.value.id,
        })
      }
    }
  } catch (e) {
    console.warn('Reminder sync failed:', e?.response?.data || e?.message)
  }

  emit("saved")
  emit("close")
}
</script>
