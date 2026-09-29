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
          :disabled="isTranscribing"
          :class="isRecording ? 'bg-red-500' : 'bg-indigo-600'"
          class="px-3 py-2 rounded text-white mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span v-if="isTranscribing">⏳ Transcribing…</span>
          <span v-else>{{ isRecording ? '🎙️ Recording… Tap to Stop' : '🎤 Add by Voice' }}</span>
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
import { ElNotification } from 'element-plus'
import { addTaskToFirebase, updateTaskInFirebase } from "@/services/firebaseService"
import { useAudioRecorder } from "@/composables/useAudioRecorder"
import api from "@/services/api"
import { useAuthStore } from "@/stores/authStore"
import { getReminderStatus, scheduleReminder } from "@/services/reminderService"
import { getPreferences as getUserPreferences } from "@/services/settingsService"
import { resolveReminderIso } from '@/utils/timeHelper.js'

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
const {
  isRecording,
  startRecording,
  stopRecording,
  isTranscribing,
} = useAudioRecorder({
  onTranscription: async (rawText) => {
    form.value.details = rawText
  },
  logPrefix: '[TaskDialogVoice]',
  surface: 'task_dialog',
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
    if (saved?.__notifyMeta) form.value.__notifyMeta = saved.__notifyMeta
  }

  try {
    const uid = authStore?.user?.uid
    if (uid && form.value.id) {
      const hasTime = !!form.value.reminderTime
      const notifyMeta = form.value.__notifyMeta || null
      if (form.value.__notifyMeta) delete form.value.__notifyMeta
      const scheduledByBackend = !!notifyMeta?.scheduled
      if (hasTime) {
        if (scheduledByBackend) return
        const iso = resolveReminderIso(form.value)
        if (!iso) return
        const prefs = userPrefs.value?.notifications || {}
        await scheduleReminder(uid, form.value.id, form.value.title, iso, prefs)
      } else if (!hasTime) {
        await api.post('/reminders/cancel', { userId: uid, taskId: form.value.id })
      }
    }
  } catch (e) {
    const status = e?.response?.status
    if (status === 403) {
      const msg = e?.response?.data?.error || 'Daily reminder limit reached. Upgrade to Pro to continue.'
      ElNotification({ title: 'Upgrade Required', message: msg, type: 'warning', duration: 3500 })
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('upgrade-required', { detail: { source: 'reminder' } })) } catch {}
    } else {
      console.warn('Reminder sync failed:', e?.response?.data || e?.message)
    }
  }

  emit("saved")
  emit("close")
}

async function prefillReminderTime(task) {
  try {
    const uid = authStore?.user?.uid
    if (!uid || !task?.id) return
    const before = form.value.reminderTime || ''
    const r = await getReminderStatus(uid, task.id)
    const items = Array.isArray(r?.items) ? r.items : []
    if (!items.length) return

    // Prefer active scheduled reminders; pick the most recently created or scheduled
    const toJSDate = (v) => {
      try {
        if (!v) return null
        if (typeof v === 'string') return new Date(v)
        if (v instanceof Date) return v
        if (typeof v.toDate === 'function') return v.toDate()
        if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
        if (typeof v._seconds === 'number') return new Date(v._seconds * 1000)
      } catch {}
      return null
    }
    const scheduled = items.filter(it => String(it?.status).toLowerCase() === 'scheduled' && !it?.sentAt)
    const pool = scheduled.length ? scheduled : items
    pool.sort((a, b) => {
      const ad = toJSDate(a.createdAt) || toJSDate(a.scheduledTime) || new Date(0)
      const bd = toJSDate(b.createdAt) || toJSDate(b.scheduledTime) || new Date(0)
      return bd - ad // most recent first
    })
    const st = pool[0]?.scheduledTime
    const dt = toJSDate(st)
    if (!dt) return

    // Only apply if user hasn't typed since request started
    if (before && before !== (form.value.reminderTime || '')) return
    if (form.value.reminderTime) return

    const hh = String(dt.getHours()).padStart(2, '0')
    const mm = String(dt.getMinutes()).padStart(2, '0')
    form.value.reminderTime = `${hh}:${mm}`
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
