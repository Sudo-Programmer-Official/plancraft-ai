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
        :disabled="props.readonly || props.lockDate"
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
        :disabled="props.readonly || props.disableReminder"
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
          :disabled="!input.trim() || !isFeatureAllowed({ plan: subStore.subscription.plan, role: authStore?.user?.role }, 'aiSplit')"
          class="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-medium shadow-md
            bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
            hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
            transition-all duration-300"
        >
          <template v-if="transcribing">⌛ Transcribing…</template>
          <template v-else>{{ loading ? '⏳ Generating...' : '+ Generate Tasks' }}</template>
        </el-button>
        <p v-if="!isFeatureAllowed({ plan: subStore.subscription.plan, role: authStore?.user?.role }, 'aiSplit')" class="mt-2 text-xs text-red-300">
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
    <!-- Preview Timeline -->
    <div v-if="generatedTasks.length > 0" class="mb-5">
      <TaskTimelinePreview
        :tasks="generatedTasks"
        :time-relations="taskTimeRelations"
        @remove-task="removeGeneratedTask"
        @update-times="resequenceTasks"
      />
    </div>

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
          :disabled="loading || generatedTasks.length === 0"
          class="flex-1 px-4 ml-0-custom py-2 rounded-lg text-white font-medium shadow-md
            bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700
            hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800
            transition-all duration-300 [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]"
        >
          {{ loading ? 'Creating Tasks...' : (props.task ? "Update Task" : "Save Tasks") }}
        </el-button>
      </div>
    </template>
  </el-dialog>
  <!-- Local notification setup prompt -->
  <NotificationPrompt v-model="notifPromptOpen" />
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ElNotification, ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

import api from '@/services/api'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import NotificationPrompt from '@/components/NotificationPrompt.vue'
import TaskTimelinePreview from '@/components/TaskTimelinePreview.vue'

import { generateTasksFromText } from '@/services/aiService'
import { addTaskToFirebase } from '@/services/firebaseService'
import { useAuthStore } from '@/stores/authStore'
import { useTasks } from '@/composables/useTasks'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

import { getPreferences as getUserPreferences } from '@/services/settingsService'
import { scheduleReminder, getReminderStatus } from '@/services/reminderService'
import { hasNotificationSetup } from '@/utils/notificationCheck'
import { toLocalDateKey, parseLocalDateKey } from '@/utils/dateHelper'
import { toUtcIso, getUserTimezone } from '@/utils/time'
import { isFeatureAllowed } from '@/services/planService'

dayjs.extend(utc)
dayjs.extend(timezone)

// === Props & Emits ===
const props = defineProps({
  open: Boolean,
  date: { type: [String, Date], default: () => toLocalDateKey(new Date()) },
  task: Object,
  editMode: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  lockDate: { type: Boolean, default: false },
  disableReminder: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'saved'])

// === State ===
const internalOpen = ref(props.open)
const input = ref('')
const details = ref('')
const link = ref('')
const reminderTime = ref(props.task?.reminderTime || '')
const selectedDate = ref(
  typeof props.date === 'string' ? props.date : toLocalDateKey(props.date)
)

const generatedTasks = ref([])
const taskTimeRelations = ref([])
const loading = ref(false)
const transcribing = ref(false)
const notifPromptOpen = ref(false)
const suppressAutoClose = ref(false)

const authStore = useAuthStore()
const subStore = useSubscriptionStore()
const { tasks } = useTasks()
const userPrefs = ref({ notifications: {}, integrations: {} })

// === Responsive Dialog Width ===
const screenWidth = ref(window.innerWidth)
const onResize = () => (screenWidth.value = window.innerWidth)
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
const dialogWidth = computed(() => (screenWidth.value < 640 ? '90%' : '520px'))

// === Watchers ===
watch(() => props.task, (task) => {
  if (task) {
    input.value = task.title || ''
    details.value = task.details || ''
    link.value = task.link || ''
    selectedDate.value = task.date
    reminderTime.value = task.reminderTime || ''
    tryPrefillReminder(task)
  } else {
    input.value = ''
    details.value = ''
    link.value = ''
    selectedDate.value = props.date || ''
    reminderTime.value = ''
  }
}, { immediate: true })

watch(() => props.open, (v) => (internalOpen.value = v))
watch(internalOpen, (v) => { if (!v) emit('close') })

watch(selectedDate, (val) => {
  if (props.lockDate && props?.task?.date && val !== props.task.date)
    selectedDate.value = props.task.date
})

watch(reminderTime, (val) => {
  if (
    props.disableReminder &&
    typeof props?.task?.reminderTime !== 'undefined' &&
    val !== (props.task.reminderTime || '')
  ) reminderTime.value = props.task.reminderTime || ''
})

watch(notifPromptOpen, (open) => {
  if (!open && suppressAutoClose.value) {
    suppressAutoClose.value = false
    setTimeout(() => closeDialog(), 50)
  }
})

// === Lifecycle: Load Preferences ===
onMounted(async () => {
  try {
    const uid = authStore?.user?.uid
    if (uid) {
      const res = await getUserPreferences(uid)
      userPrefs.value = res || { notifications: {}, integrations: {} }
    }
  } catch (e) {
    console.warn('getUserPreferences failed:', e)
  }

  if (props.task) tryPrefillReminder(props.task)
})

// === Computed ===
const formattedDate = computed(() => {
  const key = typeof selectedDate.value === 'string'
    ? selectedDate.value
    : toLocalDateKey(selectedDate.value)
  const d = parseLocalDateKey(key)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
})

const displayLink = computed(() =>
  link.value.replace(/^https?:\/\//, '').slice(0, 40) + (link.value.length > 40 ? '…' : '')
)

// === Utility Handlers ===
function handleTranscript(text) {
  input.value = text
  transcribing.value = true
  setTimeout(() => (transcribing.value = false), 2000)
}

function appendDetails(text) {
  details.value = (details.value + ' ' + text).trim()
}

function buildLocalIso(ymd, hhmm) {
  try {
    const tz = getUserTimezone()
    return toUtcIso(String(ymd || ''), String(hhmm || '00:00'), tz)
  } catch {
    return new Date().toISOString()
  }
}

// === Reminder Prefill ===
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

        const toJSDate = (v) => {
          try {
            if (!v) return null
            if (typeof v === 'string') return new Date(v)
            if (v instanceof Date) return v
            if (typeof v.toDate === 'function') return v.toDate()
            if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
            if (typeof v._seconds === 'number') return new Date(v._seconds * 1000)
          } catch { return null }
        }

        const scheduled = items.filter(it =>
          String(it?.status).toLowerCase() === 'scheduled' && !it?.sentAt
        )
        const pool = scheduled.length ? scheduled : items
        pool.sort((a, b) => {
          const ad = toJSDate(a.createdAt) || toJSDate(a.scheduledTime) || new Date(0)
          const bd = toJSDate(b.createdAt) || toJSDate(b.scheduledTime) || new Date(0)
          return bd - ad
        })

        const st = pool[0]?.scheduledTime
        if (!st) return

        const iso = (st instanceof Date)
          ? st.toISOString()
          : typeof st.toDate === 'function'
          ? st.toDate().toISOString()
          : String(st)

        if (before && before !== (reminderTime.value || '')) return
        if (reminderTime.value) return

        const userTz = task?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
        const local = dayjs.utc(iso).tz(userTz)
        reminderTime.value = local.format('HH:mm')
      })
      .catch(e => console.warn('tryPrefillReminder getReminderStatus failed', e))
  } catch (e) {
    console.warn('tryPrefillReminder failed', e)
  }
}

// === Task Sequencing ===
async function resequenceTasks() {
  if (!generatedTasks.value.length) return
  try {
    const userTimezone = getUserTimezone()
    const { autoAdjustTimes } = await import('../utils/timeSequencer.js')
    const adjusted = autoAdjustTimes({
      tasks: generatedTasks.value,
      timeRelations: taskTimeRelations.value,
      startTime: new Date().toISOString(),
      timezone: userTimezone
    })
    generatedTasks.value = adjusted
    ElNotification({ title: 'Success', message: 'Task times adjusted', type: 'success' })
  } catch (e) {
    console.error('Failed to resequence tasks:', e)
    ElNotification({ title: 'Error', message: 'Failed to adjust task times', type: 'warning' })
  }
}

// === Task Generation ===
async function generateTasks() {
  if (!input.value.trim()) return
  loading.value = true
  try {
    const userTimezone = getUserTimezone()
    const result = await generateTasksFromText(input.value, {
      timezone: userTimezone,
      currentTime: new Date().toISOString()
    })

    // After tasks are generated
    // Normalize and visually distribute generated tasks
    const baseTime = dayjs().startOf('hour').add(15, 'minute');
    const normalized = (result.tasks || []).map((t, i) => {
      // Prefer ISO scheduledTime, otherwise use time.value (HH:mm) with selected date, otherwise visual spacing
      let scheduled = null
      if (t.scheduledTime) {
        scheduled = dayjs(t.scheduledTime)
      } else if (t.time && t.time.value) {
        // t.time.value expected as HH:mm
        try {
          scheduled = dayjs(`${selectedDate.value}T${t.time.value}`)
        } catch {
          scheduled = null
        }
      }
      if (!scheduled || !scheduled.isValid()) scheduled = baseTime.add(i * 45, 'minute')

      return {
        ...t,
        title: (t.title || `Task ${i + 1}`).trim(),
        time: t.time || { type: 'derived', value: null },
        estimate_minutes: t.estimate_minutes || 30,
        scheduledTime: scheduled.toISOString()
      }
    })

    generatedTasks.value = normalized
    taskTimeRelations.value = result.timeRelations || []
    ElNotification({
      title: 'Tasks Generated',
      message: 'Review the timeline and click Save to create tasks',
      type: 'success'
    })
  } catch (e) {
    console.error('generateTasks failed', e)
    ElNotification({ title: 'Error', message: 'Failed to generate tasks', type: 'error' })
  } finally {
    loading.value = false
  }
}

// === Save ===
async function save() {
  if (generatedTasks.value.length) {
    // Batch create mode
    loading.value = true
    try {
      const uid = authStore?.user?.uid
      const prefs = userPrefs.value?.notifications || {}
      const tz = getUserTimezone()
      const chans = [
        prefs?.whatsapp && 'whatsapp',
        (prefs?.pwa || prefs?.push) && 'pwa',
        prefs?.email && 'email',
        prefs?.sms && 'sms',
        prefs?.voice_call && 'voice_call'
      ].filter(Boolean)

      if (!hasNotificationSetup(prefs)) {
        notifPromptOpen.value = true
        suppressAutoClose.value = true
      }

      const taskPromises = generatedTasks.value.map(async (task, index) => {
        const newTask = {
          title: task.title,
          details: task.details || '',
          link: '',
          completed: false,
          date: selectedDate.value,
          order: tasks.value.length + index,
          logs: [],
          reminderTime: dayjs(task.scheduledTime).format('HH:mm')
        }

        const saved = await addTaskToFirebase(newTask)
        if (uid && saved?.id && task.scheduledTime) {
          return {
            text: newTask.title,
            scheduledTime: task.scheduledTime,
            taskId: saved.id,
            channels: chans.length ? chans : undefined,
            timezone: tz
          }
        }
      })

      const reminderPayloads = (await Promise.all(taskPromises)).filter(Boolean)
      if (reminderPayloads.length) {
        await api.post('/reminders/batch', { reminders: reminderPayloads })
      }

      ElNotification({ title: 'Success', message: `Created ${generatedTasks.value.length} tasks`, type: 'success' })
      emit('saved')
      if (!notifPromptOpen.value) closeDialog()
    } catch (e) {
      console.error('save() batch failed', e)
      ElNotification({ title: 'Error', message: 'Failed to save tasks', type: 'error' })
    } finally {
      loading.value = false
    }
  } else if (props.task) {
    // Single edit
    const dateToSave = props.lockDate && props.task?.date ? props.task.date : selectedDate.value
    const reminderToSave = props.disableReminder && props.task?.reminderTime !== undefined
      ? props.task.reminderTime ?? null
      : reminderTime.value || null
    emit('saved', { ...props.task, title: input.value, details: details.value, link: link.value, date: dateToSave, reminderTime: reminderToSave })
    ElNotification({ title: 'Success', message: 'Task updated successfully', type: 'success', duration: 2000 })
  } else {
    // Single create
    try {
      if ((reminderTime.value || '').trim()) {
        const prefs = userPrefs.value?.notifications || {}
        if (!hasNotificationSetup(prefs)) {
          notifPromptOpen.value = true
          suppressAutoClose.value = true
        }
      }
      emit('saved', {
        title: input.value,
        details: details.value,
        link: link.value,
        date: selectedDate.value,
        reminderTime: reminderTime.value || null
      })
      ElNotification({ title: 'Success', message: 'Task saved successfully', type: 'success', duration: 2000 })
    } catch (e) {
      console.warn('save() single failed', e)
    }
  }

  if (!notifPromptOpen.value) closeDialog()
}

// === Misc ===
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
