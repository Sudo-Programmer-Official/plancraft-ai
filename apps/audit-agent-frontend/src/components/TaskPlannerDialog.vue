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

    <!-- Title -->
    <el-input
      v-model="input"
      type="textarea"
      :rows="3"
      placeholder="Speak or type your task..."
      resize="none"
      class="mb-5"
    />

    <!-- Reminder Time (optional) -->
    <div class="mb-5">
      <label class="block text-sm text-slate-300 mb-1">Reminder Time (optional)</label>
      <el-time-picker
        v-model="reminderTime"
        placeholder="HH:mm"
        format="HH:mm"
        value-format="HH:mm"
        class="w-full"
      />
    </div>

    <!-- Details + Link (only in edit mode) -->
    <div v-if="props.task" class="mb-5 space-y-3">
      <div>
        <label class="block text-sm text-slate-300 mb-1">Details</label>
        <el-input
          v-model="details"
          type="textarea"
          :rows="4"
          placeholder="Add more context or notes..."
          resize="none"
          class="mb-3"
        />
        <!-- Mic for details -->
        <VoiceRecorder @transcribed="appendDetails" class="w-full" />
      </div>

      <div>
        <label class="block text-sm text-slate-300 mb-1">Optional Link</label>
        <el-input
          v-model="link"
          type="text"
          placeholder="https://example.com"
          clearable
        />
        <div v-if="link" class="mt-1 text-xs">
          <a
            :href="link"
            target="_blank"
            rel="noopener noreferrer"
            class="text-indigo-400 hover:underline truncate inline-block max-w-full"
          >
            🔗 {{ displayLink }}
          </a>
        </div>
      </div>
    </div>

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
          :disabled="!input.trim() || !isFeatureAllowed({ plan: subStore.subscription.plan }, 'aiSplit')"
          class="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium shadow-md
            bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
            hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
            transition-all duration-300"
        >
          <template v-if="transcribing">⌛ Transcribing…</template>
          <template v-else>{{ loading ? '⏳ Generating...' : '➕ Generate Tasks' }}</template>
        </el-button>
        <p v-if="!isFeatureAllowed({ plan: subStore.subscription.plan }, 'aiSplit')" class="mt-2 text-xs text-red-300">
          Upgrade to Pro to use AI task generation 💎
        </p>
      </div>
    </div>

    <!-- Footer -->
    <!-- <template v-if="props.editMode" #footer>
      <el-button @click="closeDialog" plain>Cancel</el-button>
      <el-button
        type="primary"
        @click="save"
        class="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium shadow-md
          bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
          hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
          transition-all duration-300 [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]"
      >
        {{ props.task ? "Update Task" : "Save Task" }}
      </el-button>
    </template> -->
    <!-- Footer -->
<template v-if="props.editMode" #footer>
  <div class="flex flex-col sm:flex-row gap-3 w-full">
    <el-button
      @click="closeDialog"
      class="flex-1 px-4 py-2 rounded-lg font-medium border border-gray-500 text-gray-300 hover:bg-gray-700"
    >
      Cancel
    </el-button>
    <el-button
      type="primary"
      @click="save"
      class="flex-1 px-4 ml-0-custom py-2 rounded-lg text-white font-medium shadow-md
        bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
        hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
        transition-all duration-300 [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]"
    >
      {{ props.task ? "Update Task" : "Save Task" }}
    </el-button>
  </div>
</template>
  </el-dialog>
</template>



<script setup>
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { ElNotification } from 'element-plus'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { generateTasksFromText } from '@/services/aiService'
import { addTaskToFirebase } from '@/services/firebaseService'
import { useAuthStore } from '@/stores/authStore'
import { getPreferences as getUserPreferences } from '@/services/settingsService'
import { scheduleReminder, getReminderStatus } from '@/services/reminderService'
import { useTasks } from '@/composables/useTasks'
import { toLocalDateKey, parseLocalDateKey } from '@/utils/dateHelper'
import { normalizeParsedDateTime } from '@/utils/dateParser'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { isFeatureAllowed } from '@/services/planService'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { toLocal } from '@/utils/timezone'  // add this at top if not imported


dayjs.extend(utc)
dayjs.extend(timezone)

const props = defineProps({
  open: Boolean,
  date: { type: [String, Date], default: () => toLocalDateKey(new Date()) },
  task: Object,
  editMode: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'saved'])

const { tasks } = useTasks()
const reminderTime = ref(props.task ? props.task.reminderTime || '' : '')
const subStore = useSubscriptionStore()

const internalOpen = ref(props.open)
const input = ref('')
const details = ref('')
const link = ref('')
const selectedDate = ref(typeof props.date === 'string' ? props.date : toLocalDateKey(props.date))
const loading = ref(false)
const transcribing = ref(false)

const screenWidth = ref(window.innerWidth)
onMounted(() => window.addEventListener("resize", () => screenWidth.value = window.innerWidth))
onBeforeUnmount(() => window.removeEventListener("resize", () => {}))
const dialogWidth = computed(() => screenWidth.value < 640 ? "90%" : "520px")

watch(() => props.task, (task) => {
  if (task) {
    input.value = task.title || ""
    details.value = task.details || ""
    link.value = task.link || ""
    selectedDate.value = task.date
    reminderTime.value = task.reminderTime || ""
    // If reminderTime missing but task exists, try to prefill from reminder status
    tryPrefillReminder(task)
  } else {
    input.value = ""
    details.value = ""
    link.value = ""
    selectedDate.value = props.date || ""
    reminderTime.value = ""
  }
}, { immediate: true })

watch(() => props.open, (val) => internalOpen.value = val)
watch(internalOpen, (val) => { if (!val) emit('close') })

const formattedDate = computed(() => {
  const dateKey = typeof selectedDate.value === "string" ? selectedDate.value : toLocalDateKey(selectedDate.value)
  const dateObj = parseLocalDateKey(dateKey)
  return dateObj.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
})

function handleTranscript(text) {
  input.value = text
  transcribing.value = true
  setTimeout(() => transcribing.value = false, 2000)
}
function appendDetails(text) {
  details.value = (details.value + " " + text).trim()
}

const displayLink = computed(() =>
  link.value.replace(/^https?:\/\//, "").slice(0, 40) + (link.value.length > 40 ? "…" : "")
)

const authStore = useAuthStore()
const userPrefs = ref({ notifications: {}, integrations: {} })

onMounted(async () => {
  try {
    const uid = authStore?.user?.uid
    if (uid) {
      const res = await getUserPreferences(uid)
      userPrefs.value = res || { notifications: {}, integrations: {} }
    }
  } catch {}
  // Attempt prefill when opening in edit mode
  if (props.task) tryPrefillReminder(props.task)
})

// function tryPrefillReminder(task) {
//   try {
//     if (!task?.id || reminderTime.value) return
//     const uid = authStore?.user?.uid
//     if (!uid) return
//     // Query reminder status and set HH:mm from first scheduled item
//     getReminderStatus(uid, task.id).then((r) => {
//       const items = Array.isArray(r?.items) ? r.items : []
//       const active = items.find(it => String(it?.status).toLowerCase() === 'scheduled') || items[0]
//       const st = active?.scheduledTime
//       if (!st) return
//       try {
//         // Normalize to local time from UTC and format as HH:mm
//         let iso
//         if (st && typeof st.toDate === 'function') {
//           const d = st.toDate()
//           iso = d && d.toISOString ? d.toISOString() : String(d)
//         } else if (st instanceof Date) {
//           iso = st.toISOString()
//         } else {
//           iso = String(st)
//         }
//         const local = dayjs.utc(iso).local()
//         reminderTime.value = local.format('HH:mm')
//       } catch {}
//     }).catch(() => {})
//   } catch {}
// }
// function tryPrefillReminder(task) {
//   try {
//     if (!task?.id || reminderTime.value) return
//     const uid = authStore?.user?.uid
//     if (!uid) return

//     getReminderStatus(uid, task.id).then((r) => {
//       const items = Array.isArray(r?.items) ? r.items : []
//       const active = items.find(it => String(it?.status).toLowerCase() === 'scheduled') || items[0]
//       const st = active?.scheduledTime
//       if (!st) return

//       let iso
//       if (st && typeof st.toDate === 'function') iso = st.toDate().toISOString()
//       else if (st instanceof Date) iso = st.toISOString()
//       else iso = String(st)

//       // ✅ FIX: Convert UTC → user timezone correctly
//       const userTz = task?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
//       const local = dayjs.utc(iso).tz(userTz)
//       reminderTime.value = local.format('HH:mm')
//     }).catch(() => {})
//   } catch {}
// }
// function tryPrefillReminder(task) {
//   try {
//     if (!task?.id || reminderTime.value) return
//     const uid = authStore?.user?.uid
//     if (!uid) return

//     const before = reminderTime.value || ''
//     getReminderStatus(uid, task.id).then((r) => {
//       const items = Array.isArray(r?.items) ? r.items : []
//       if (!items.length) return

//       // Prefer active scheduled reminders; choose the most recently created/scheduled
//       const toJSDate = (v) => {
//         try {
//           if (!v) return null
//           if (typeof v === 'string') return new Date(v)
//           if (v instanceof Date) return v
//           if (typeof v.toDate === 'function') return v.toDate()
//           if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
//           if (typeof v._seconds === 'number') return new Date(v._seconds * 1000)
//         } catch {}
//         return null
//       }
//       const scheduled = items.filter(it => String(it?.status).toLowerCase() === 'scheduled' && !it?.sentAt)
//       const pool = scheduled.length ? scheduled : items
//       pool.sort((a, b) => {
//         const ad = toJSDate(a.createdAt) || toJSDate(a.scheduledTime) || new Date(0)
//         const bd = toJSDate(b.createdAt) || toJSDate(b.scheduledTime) || new Date(0)
//         return bd - ad
//       })
//       const st = pool[0]?.scheduledTime
//       if (!st) return

//       let iso
//       if (st && typeof st.toDate === 'function') iso = st.toDate().toISOString()
//       else if (st instanceof Date) iso = st.toISOString()
//       else iso = String(st)

//       // If user typed since request started, do not overwrite
//       if (before && before !== (reminderTime.value || '')) return
//       if (reminderTime.value) return

//       const userTz = task?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
//       const local = (dayjs.utc && dayjs.utc(iso).tz) ? dayjs.utc(iso).tz(userTz) : dayjs.utc(iso).local()
//       reminderTime.value = local.format('HH:mm')
//     }).catch(() => {})
//   } catch {}
// }
// function tryPrefillReminder(task) {
//   try {
//     if (!task?.id || reminderTime.value) return
//     const uid = authStore?.user?.uid
//     if (!uid) return

//     const before = reminderTime.value || ''
//     getReminderStatus(uid, task.id).then((r) => {
//       const items = Array.isArray(r?.items) ? r.items : []
//       if (!items.length) return

//       // Prefer active scheduled reminders; choose the most recently created/scheduled
//       const toJSDate = (v) => {
//         try {
//           if (!v) return null
//           if (typeof v === 'string') return new Date(v)
//           if (v instanceof Date) return v
//           if (typeof v.toDate === 'function') return v.toDate()
//           if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
//           if (typeof v._seconds === 'number') return new Date(v._seconds * 1000)
//         } catch {}
//         return null
//       }

//       const scheduled = items.filter(
//         it => String(it?.status).toLowerCase() === 'scheduled' && !it?.sentAt
//       )
//       const pool = scheduled.length ? scheduled : items
//       pool.sort((a, b) => {
//         const ad = toJSDate(a.createdAt) || toJSDate(a.scheduledTime) || new Date(0)
//         const bd = toJSDate(b.createdAt) || toJSDate(b.scheduledTime) || new Date(0)
//         return bd - ad
//       })

//       const st = pool[0]?.scheduledTime
//       if (!st) return

//       let iso
//       if (st && typeof st.toDate === 'function') iso = st.toDate().toISOString()
//       else if (st instanceof Date) iso = st.toISOString()
//       else iso = String(st)

//       // If user typed since request started, do not overwrite
//       if (before && before !== (reminderTime.value || '')) return
//       if (reminderTime.value) return

//       // ✅ FIX: Always convert from UTC → user timezone safely
//       const userTz = task?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
//       const local = dayjs.tz(dayjs.utc(iso), userTz)
//       reminderTime.value = local.format('HH:mm')
//     }).catch(() => {})
//   } catch {}
// }

function tryPrefillReminder(task) {
  try {
    if (!task?.id || reminderTime.value) return
    const uid = authStore?.user?.uid
    if (!uid) return

    const before = reminderTime.value || ''
    getReminderStatus(uid, task.id)
      .then((r) => {
        const items = Array.isArray(r?.items) ? r.items : []
        if (!items.length) return

        // Prefer active scheduled reminders; choose the most recently created/scheduled
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

        const scheduled = items.filter(
          (it) => String(it?.status).toLowerCase() === 'scheduled' && !it?.sentAt
        )
        const pool = scheduled.length ? scheduled : items
        pool.sort((a, b) => {
          const ad = toJSDate(a.createdAt) || toJSDate(a.scheduledTime) || new Date(0)
          const bd = toJSDate(b.createdAt) || toJSDate(b.scheduledTime) || new Date(0)
          return bd - ad
        })

        const st = pool[0]?.scheduledTime
        if (!st) return

        let iso
        if (st && typeof st.toDate === 'function') iso = st.toDate().toISOString()
        else if (st instanceof Date) iso = st.toISOString()
        else iso = String(st)

        // If user typed since request started, do not overwrite
        if (before && before !== (reminderTime.value || '')) return
        if (reminderTime.value) return

        // Always convert from UTC → user's local time correctly, using explicit tz
        const userTz = task?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        const local = dayjs.utc(iso).tz(userTz)
        reminderTime.value = local.format('HH:mm')
      })
      .catch(() => {})
  } catch {}
}

function buildLocalIso(ymd, hhmm) {
  try {
    const [y, m, d] = String(ymd || '').split('-').map(Number)
    const [hh, mm] = String(hhmm || '00:00').split(':').map(Number)
    if (!y || !m || !d) throw new Error('invalid date parts')

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const yStr = String(y).padStart(4, '0')
    const mStr = String(m).padStart(2, '0')
    const dStr = String(d).padStart(2, '0')
    const hhStr = String(hh || 0).padStart(2, '0')
    const mmStr = String(mm || 0).padStart(2, '0')

    // Interpret as wall-clock time in user's TZ, then convert to UTC ISO
    const local = dayjs.tz(`${yStr}-${mStr}-${dStr} ${hhStr}:${mmStr}`, tz, true)
    return local.utc().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

async function generateTasks() {
  if (!input.value.trim()) return
  loading.value = true
  try {
    const { tasks: items, reminderTime: aiIso } = await generateTasksFromText(input.value)
    // If AI provided a parsed reminder datetime (UTC ISO), sync date picker + time
    if (aiIso) {
      const { date, time } = normalizeParsedDateTime(aiIso)
      if (date && selectedDate.value !== date) selectedDate.value = date
      // if (time && reminderTime.value !== time) reminderTime.value = time
      // Removed double timezone shift: trust aiIso directly as UTC
    }
    if (aiIso && !reminderTime.value) {
      reminderTime.value = null  // DO NOT display auto time in UI
    }
    const manualIso = reminderTime.value ? buildLocalIso(toLocalDateKey(parseLocalDateKey(selectedDate.value)), reminderTime.value) : null
    const effectiveIso = manualIso || aiIso

    for (const [i, t] of items.entries()) {
      const newTask = {
        title: t,
        details: '',
        link: '',
        completed: false,
        date: toLocalDateKey(parseLocalDateKey(selectedDate.value)),
        order: tasks.value.length + i,
        logs: [],
        reminderTime: reminderTime.value || null
      }
      const saved = await addTaskToFirebase(newTask)
      try {
        const uid = authStore?.user?.uid
        if (uid && saved?.id && effectiveIso) {
          const prefs = userPrefs.value?.notifications || {}
          await scheduleReminder(uid, saved.id, newTask.title, effectiveIso, prefs)
        }
      } catch (e) {
        console.warn('AI-split reminder schedule failed:', e?.response?.data || e?.message)
      }
    }
    ElNotification({ title: 'Success', message: `${items.length} task${items.length > 1 ? 's' : ''} generated`, type: 'success', duration: 2500 })
    emit('saved', items)
    closeDialog()
  } catch (err) {
    const status = err?.response?.status
    if (status === 403) {
      const msg = err?.response?.data?.error || 'Daily AI limit reached. Upgrade to Pro to continue.'
      ElNotification({ title: 'Upgrade Required', message: msg, type: 'warning', duration: 3500 })
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('upgrade-required', { detail: { source: 'ai-split' } })) } catch {}
    } else {
      console.error(err)
      ElNotification({ title: 'Error', message: 'Task generation failed. Please try again.', type: 'error', duration: 3000 })
    }
  } finally {
    loading.value = false
    input.value = ''
    reminderTime.value = ''
  }
}

function save() {
  if (props.task) {
    emit("saved", { ...props.task, title: input.value, details: details.value, link: link.value, date: selectedDate.value, reminderTime: reminderTime.value || null })
    ElNotification({ title: 'Success', message: 'Task updated successfully', type: 'success', duration: 2000 })
  } else {
    emit("saved", { title: input.value, details: details.value, link: link.value, date: selectedDate.value, reminderTime: reminderTime.value || null })
    ElNotification({ title: 'Success', message: 'Task saved successfully', type: 'success', duration: 2000 })
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
.ml-0-custom {
  margin-left: 0 !important;
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
/* Inputs (title, details, link) */


.task-planner-dialog .el-input__inner::placeholder,
.task-planner-dialog .el-textarea__inner::placeholder {
  color: #cbd5e1; /* light slate */
}

/* Input hover/focus state */
.task-planner-dialog .el-input__wrapper.is-focus,
.task-planner-dialog .el-input__wrapper:hover {
  border-color: #6366f1 !important; /* indigo-500 accent */
  background-color: rgba(255, 255, 255, 0.15);
}

/* Optional link preview under input */
.task-planner-dialog a {
  color: #93c5fd; /* blue-300 */
  font-weight: 500;
  text-decoration: none;
}
.task-planner-dialog a:hover {
  text-decoration: underline;
  color: #bfdbfe; /* blue-200 */
}
/* Fix input wrapper so no double box */
.task-planner-dialog .el-input__wrapper {
  background-color: rgba(255, 255, 255, 0.1) !important; /* semi-transparent dark */
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 0.5rem !important;
  box-shadow: none !important;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

/* Ensure inner input inherits styling correctly */
.task-planner-dialog .el-input__inner {
  background-color: transparent !important; /* remove extra box */
  color: #f8fafc !important; /* text color */
}

.task-planner-dialog .el-input__inner::placeholder {
  color: rgba(255, 255, 255, 0.5) !important;
}

/* Hover + Focus states (keep dark, add highlight) */
.task-planner-dialog .el-input__wrapper.is-focus,
.task-planner-dialog .el-input__wrapper:hover {
  background-color: rgba(255, 255, 255, 0.15) !important; /* slightly brighter */
  border-color: #6366f1 !important; /* indigo highlight */
}
</style>
