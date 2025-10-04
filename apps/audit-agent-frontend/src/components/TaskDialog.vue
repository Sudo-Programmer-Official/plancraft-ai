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
        <!-- Reminder Time (optional) -->
        <input
          v-model="form.reminderTime"
          type="time"
          class="w-full p-3 border rounded"
          placeholder="Reminder time (optional)"
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
import { getReminderStatus, scheduleReminder } from "@/services/reminderService"
import { getPreferences as getUserPreferences } from "@/services/settingsService"

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
  reminderTime: "",
  completed: false,
  logs: [],
})

const authStore = useAuthStore()
const userPrefs = ref({ notifications: {}, integrations: {} })
import { onMounted } from 'vue'
onMounted(async () => {
  try {
    const uid = authStore?.user?.uid
    if (uid) {
      const res = await getUserPreferences(uid)
      userPrefs.value = res || { notifications: {}, integrations: {} }
    }
  } catch {}
})
let initialDate = null

// Watch for incoming task (edit mode)
watch(
  () => props.task,
  (t) => {
    if (t) {
      form.value = { ...t, reminderTime: t.reminderTime || "" }
      initialDate = t.date || null
      prefillReminderTime(t).catch(() => {})
    } else {
      form.value = {
        id: null,
        title: "",
        details: "",
        date: today,
        reminderTime: "",
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
    if (uid && form.value.id) {
      const hasTime = !!form.value.reminderTime
      if (hasTime) {
        const iso = buildLocalIso(form.value.date, form.value.reminderTime)
        const prefs = userPrefs.value?.notifications || {}
        await scheduleReminder(uid, form.value.id, form.value.title, iso, prefs)
      } else if (!hasTime) {
        await api.post('/reminders/cancel', { userId: uid, taskId: form.value.id })
      }
    }
  } catch (e) {
    console.warn('Reminder sync failed:', e?.response?.data || e?.message)
  }

  emit("saved")
  emit("close")
}

function buildLocalIso(ymd, hhmm) {
  try {
    const d = new Date(`${ymd}T${hhmm}`)
    return d.toISOString()
  } catch { return new Date().toISOString() }
}

async function prefillReminderTime(task) {
  try {
    const uid = authStore?.user?.uid
    if (!uid || !task?.id) return
    const r = await getReminderStatus(uid, task.id)
    if (r?.hasActive && r.items?.length) {
      const st = r.items[0]?.scheduledTime
      const dt = coerceToDate(st)
      if (dt) {
        const hh = String(dt.getHours()).padStart(2, '0')
        const mm = String(dt.getMinutes()).padStart(2, '0')
        form.value.reminderTime = `${hh}:${mm}`
      }
    }
  } catch {}
}

function coerceToDate(val) {
  try {
    if (!val) return null
    if (typeof val === 'string') return new Date(val)
    if (val && typeof val === 'object') {
      if (typeof val.toDate === 'function') return val.toDate()
      if (typeof val.seconds === 'number') return new Date(val.seconds * 1000)
      if (typeof val._seconds === 'number') return new Date(val._seconds * 1000)
    }
  } catch {}
  return null
}
</script>
