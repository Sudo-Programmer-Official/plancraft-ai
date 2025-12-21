<template>
  <Teleport to="body">
    <el-dialog
      v-model="internalOpen"
      :title="task ? `✏️ Edit Task` : `📅 Plan for ${formattedDate}`"
      :width="dialogWidth"
      class="task-planner-dialog"
      modal-class="planner-overlay"
      destroy-on-close
      :lock-scroll="false"
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
    <div class="planner-stack">
      <section class="planner-card">
        <div class="card-heading">
          <div>
            <p class="card-eyebrow">Plan basics</p>
            <h3 class="card-title">Choose your day & reminder time</h3>
          </div>
        </div>
        <div class="field-grid">
          <div class="field">
            <label class="field-label">Plan date</label>
            <el-date-picker
              v-model="selectedDate"
              :disabled="props.readonly || props.lockDate"
              type="date"
              placeholder="Select a day"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="w-full"
            />
          </div>
          <div class="field">
            <label class="field-label">Reminder time (optional)</label>
            <el-time-picker
              v-model="reminderTime"
              placeholder="HH:mm"
              :disabled="props.readonly || props.disableReminder"
              format="HH:mm"
              value-format="HH:mm"
              class="w-full"
              @change="onReminderTimeChange"
            />
          </div>
        </div>
      </section>

      <section class="planner-card">
        <div class="card-heading">
          <div>
            <p class="card-eyebrow">Task idea</p>
            <h3 class="card-title">What should we plan?</h3>
          </div>
        </div>
        <el-input
          v-model="input"
          type="textarea"
          :rows="3"
          placeholder="Speak or type your task..."
          resize="none"
          class="mb-4"
        />
        <div v-if="!props.task" class="planner-voice-row">
          <div class="planner-voice">
            <label class="field-label">Dictate instead</label>
            <VoiceRecorder
              :autoCommit="true"
              :disabled="loading"
              :reset-trigger="plannerVoiceReset"
              @transcribed="handleTranscript"
            />
          </div>
          <el-button
            @click="generateTasks"
            :loading="loading"
            :disabled="!input.trim() || !isFeatureAllowed({ plan: subStore.subscription.plan, role: authStore?.user?.role }, 'aiSplit')"
            class="generate-btn"
          >
            {{ loading ? '⏳ Generating...' : '+ Generate Tasks' }}
          </el-button>
        </div>
      </section>

      <section class="planner-card reminder-card" :class="{ 'reminder-card--collapsed': !reminderOptionsVisible }">
        <div class="card-heading">
          <div>
            <p class="card-eyebrow">Reminder</p>
            <h3 class="card-title">Keep me on track</h3>
          </div>
          <button
            class="card-toggle"
            type="button"
            @click="reminderOptionsVisible = !reminderOptionsVisible"
          >
            <span>{{ reminderOptionsVisible ? 'Hide options' : 'Show options' }}</span>
            <svg
              class="card-toggle__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            >
              <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
        <transition name="reminder-collapse">
          <div v-show="reminderOptionsVisible">
            <label class="reminder-toggle" :class="{ 'reminder-toggle--disabled': props.readonly || props.disableReminder }">
              <el-switch
                v-model="setReminder"
                :disabled="props.readonly || props.disableReminder"
              />
              <span class="reminder-toggle__label">Set reminder</span>
            </label>
            <div class="channel-icons">
              <el-tooltip
                v-for="option in channelOptions"
                :key="option.id"
                effect="dark"
                placement="top"
                :content="option.label"
              >
                <button
                  class="channel-icon"
                  type="button"
                  :disabled="props.readonly || props.disableReminder || !setReminder"
                  :class="{ 'channel-icon--active': isChannelSelected(option.id) }"
                  @click="toggleChannel(option.id)"
                >
                  <span aria-hidden="true">{{ option.icon }}</span>
                </button>
              </el-tooltip>
            </div>
            <p
              v-if="setReminder && !(props.readonly || props.disableReminder)"
              class="hint"
            >
              We’ll match your notification preferences. Calls only ring when it’s reminder time.
            </p>
          </div>
        </transition>
      </section>

      <section v-if="props.task" class="planner-card">
        <div class="card-heading">
          <div>
            <p class="card-eyebrow">Extras</p>
            <h3 class="card-title">Add details or link</h3>
          </div>
        </div>
        <el-input
          v-model="details"
          type="textarea"
          :rows="4"
          placeholder="Add more context or notes..."
          resize="none"
          class="mb-4"
        />
        <div class="planner-voice">
          <label class="field-label">Add via voice</label>
          <VoiceRecorder
            :disabled="props.readonly"
            :reset-trigger="detailsVoiceReset"
            @transcribed="appendDetails"
          />
        </div>
        <div class="link-field">
          <label class="field-label">Optional link</label>
          <el-input v-model="link" type="text" placeholder="https://example.com" clearable />
          <div v-if="link" class="link-preview">
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
      </section>
    </div>

    <!-- Footer Slot -->
    <template #footer>
      <div v-if="props.editMode" class="flex flex-col sm:flex-row gap-3 w-full">
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
            transition-all duration-300"
        >
          {{ props.task ? "Update Task" : "Save Task" }}
        </el-button>
      </div>
    </template>
    </el-dialog>
  </Teleport>

  <!-- Local notification setup prompt -->
  <NotificationPrompt v-model="notifPromptOpen" />
</template>



<script setup>
/* ---------------- Core Imports ---------------- */
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { ElNotification, ElMessage } from 'element-plus'
import api from '@/services/api'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import NotificationPrompt from '@/components/NotificationPrompt.vue'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useTasks } from '@/composables/useTasks'

/* ---------------- Services ---------------- */
import { generateTasksFromText, extractReminderTime } from '@/services/aiService'
import { addTaskToFirebase } from '@/services/firebaseService'
import { getPreferences as getUserPreferences, getReminderPreferences } from '@/services/settingsService'
import { scheduleReminder, getReminderStatus } from '@/services/reminderService'
import { isFeatureAllowed } from '@/services/planService'
import { hasNotificationSetup } from '@/utils/notificationCheck'

/* ---------------- Utilities ---------------- */
import { toLocalDateKey, parseLocalDateKey } from '@/utils/dateHelper'
import { toUtcIso, getUserTimezone } from '@/utils/time'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/* ---------------- Constants ---------------- */
const DURATION_HINTS = {
  class: 75, lecture: 60, exam: 120, study: 45, homework: 40,
  assignment: 40, gym: 60, workout: 60, run: 45, dinner: 45,
  lunch: 40, breakfast: 20, meeting: 30, call: 20, sleep: 480,
}
const RELATIVE_HINT_PATTERN = /\b(in\s+\d+\s+\w+|after\s+\w+|before\s+\w+|later|then|next|from now|soon)\b/i
const REMINDER_CHANNEL_ALLOW_LIST = ['pwa', 'whatsapp', 'email', 'sms', 'voice_call']
const CREATION_CHANNELS = ['pwa', 'whatsapp']
const channelOptions = [
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'pwa', label: 'Push (Browser)', icon: '📳' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'sms', label: 'SMS', icon: '📲' },
  { id: 'voice_call', label: 'Voice Call', icon: '📞' },
]
const DEFAULT_REMINDER_CHANNELS = ['email', 'pwa', 'whatsapp']
const MAX_INSTANT_ALERTS = 2

function coerceText(value, fallback = '') {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    if (typeof value.title === 'string') return value.title
    if (typeof value.text === 'string') return value.text
    if (typeof value.value === 'string') return value.value
  }
  return fallback
}

function assignText(targetRef, value, fallback = '') {
  targetRef.value = coerceText(value, fallback)
}

/* ---------------- Props / Emits ---------------- */
const props = defineProps({
  open: Boolean,
  date: { type: [String, Date], default: () => toLocalDateKey(new Date()) },
  task: Object,
  editMode: { type: Boolean, default: false },
  readonly: Boolean,
  lockDate: Boolean,
  disableReminder: Boolean,
})
const emit = defineEmits(['close', 'saved'])

const task = computed(() => props.task || null)

function logTimeBrainDialog(event, payload) {
  try {
     
    console.log(`[TimeBrain][Dialog] ${event}`, payload)
  } catch {
    /* noop */
  }
}

const internalOpen = ref(props.open)

let previousBodyOverflow = ''
let bodyScrollLocked = false
let reminderAutofillGuard = false

function setBodyScrollLocked(locked) {
  if (typeof document === 'undefined') return
  try {
    const body = document.body
    if (!body) return
    if (locked) {
      if (bodyScrollLocked) return
      previousBodyOverflow = body.style.overflow || ''
      body.style.overflow = 'hidden'
      bodyScrollLocked = true
    } else if (bodyScrollLocked) {
      body.style.overflow = previousBodyOverflow
      previousBodyOverflow = ''
      bodyScrollLocked = false
    }
  } catch {
    /* noop */
  }
}

watch(() => props.open, (val) => {
  internalOpen.value = val
})
watch(internalOpen, (val) => {
  setBodyScrollLocked(val)
  if (!val) emit('close')
})
onBeforeUnmount(() => setBodyScrollLocked(false))
onMounted(() => {
  if (internalOpen.value) setBodyScrollLocked(true)
})
const channelOptionIds = channelOptions.map(o => o.id)

/* ---------------- Helper Functions ---------------- */
function normalizeDateInput(value) {
  if (!value) return toLocalDateKey(new Date())
  return typeof value === 'string' ? value : toLocalDateKey(value)
}

function inferDuration(title, fallback = 30) {
  const key = (title || '').toLowerCase()
  for (const [k, mins] of Object.entries(DURATION_HINTS)) {
    if (key.includes(k)) return mins
  }
  return fallback
}

function normalizeReminderPreferences(raw) {
  const channels = Array.isArray(raw?.channels)
    ? Array.from(
        new Set(
          raw.channels
            .map(c => String(c || '').toLowerCase())
            .filter(c => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
        )
      )
    : []
  const fallback = channels.length
    ? channels
    : raw?.enabled === false
      ? []
      : [...DEFAULT_REMINDER_CHANNELS]
  const enabled = raw?.enabled !== undefined ? !!raw.enabled : fallback.length > 0
  return { enabled, channels: fallback }
}

function applyReminderDefaults(source) {
  const normalized = normalizeReminderPreferences(source)
  reminderPrefs.value = normalized
  setReminder.value = !!normalized.enabled
  const valid = normalized.channels.filter(ch => channelOptionIds.includes(ch))
  if (!normalized.enabled) {
    allowedReminderChannels.value = []
  } else if (valid.length) {
    allowedReminderChannels.value = valid
  } else {
    allowedReminderChannels.value = DEFAULT_REMINDER_CHANNELS.filter(ch => channelOptionIds.includes(ch))
  }
}

function computeCreationChannels() {
  const selected = new Set(allowedReminderChannels.value.map(c => c.toLowerCase()))
  const defaults = reminderPrefs.value.channels.map(c => c.toLowerCase())
  const combined = CREATION_CHANNELS.filter(c => selected.has(c) || defaults.includes(c))
  return combined.slice(0, 2)
}

function computeReminderChannels() {
  const base = new Set(reminderPrefs.value.channels.map(c => c.toLowerCase()))
  const toggled = new Set(allowedReminderChannels.value.map(c => c.toLowerCase()))
  for (const opt of channelOptions) {
    if (toggled.has(opt.id)) base.add(opt.id)
    else base.delete(opt.id)
  }
  const merged = Array.from(base).filter(c => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
  return merged.length ? merged : ['pwa']
}

/* ---------------- Refs ---------------- */
const { tasks: taskStore } = useTasks()
const tasks = computed(() => {
  const value = taskStore?.value
  return Array.isArray(value) ? value : []
})

const authStore = useAuthStore()
const subStore = useSubscriptionStore()
const reminderPrefs = ref({ enabled: true, channels: [...DEFAULT_REMINDER_CHANNELS] })
const allowedReminderChannels = ref([])
const reminderTime = ref('')
const reminderManuallyEdited = ref(false)
const reminderAbsoluteIso = ref(null)
const setReminder = ref(false)
const reminderOptionsVisible = ref(false)
const plannerVoiceReset = ref(0)
const detailsVoiceReset = ref(0)
const input = ref('')
const details = ref('')
const link = ref('')
const selectedDate = ref(normalizeDateInput(props.date))
const loading = ref(false)
const notifPromptOpen = ref(false)
const suppressAutoClose = ref(false)
const reminderPrefsLoaded = ref(false)
const notificationChecked = ref(false)

function getInputText() {
  return coerceText(input.value)
}

function onReminderTimeChange() {
  if (!reminderAutofillGuard) {
    reminderManuallyEdited.value = true
  }
}

const formattedDate = computed(() => {
  try {
    const base = parseLocalDateKey(selectedDate.value || normalizeDateInput(new Date()))
    return dayjs(base).format('MMM D, YYYY')
  } catch {
    return selectedDate.value || ''
  }
})

const displayLink = computed(() => {
  const value = coerceText(link.value).trim()
  if (!value) return ''
  try {
    const url = new URL(value)
    const path = url.pathname && url.pathname !== '/' ? url.pathname : ''
    return `${url.hostname}${path}`
  } catch {
    return value
  }
})

/* ---------------- Screen Size Reactive ---------------- */
const screenWidth = ref(window.innerWidth)
let resizeHandler = null
onMounted(() => {
  resizeHandler = () => (screenWidth.value = window.innerWidth)
  window.addEventListener('resize', resizeHandler)
})
onBeforeUnmount(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
})
const dialogWidth = computed(() => (screenWidth.value < 640 ? '90vw' : '480px'))

/* ---------------- Watchers ---------------- */
watch(
  () => props.open,
  async (val) => {
    logTimeBrainDialog('visibility-change', { open: val })
    if (!val) {
      suppressAutoClose.value = false
      reminderPrefsLoaded.value = false
      return
    }
    await ensureReminderPreferences(true)
    await ensureNotificationPrompt()
    if (!task.value) {
      resetNewTaskState()
    }
  }
)
watch(
  () => props.date,
  (val) => {
    logTimeBrainDialog('date-prop-change', { value: val })
    if (task.value && props.lockDate) return
    selectedDate.value = normalizeDateInput(val)
  }
)
watch(
  task,
  async (current) => {
    if (current) {
      hydrateFromTask(current)
      await tryPrefillReminder(current)
    } else {
      resetNewTaskState()
    }
  },
  { immediate: true }
)
watch(selectedDate, val => {
  logTimeBrainDialog('selected-date-change', { value: val })
  if (props.lockDate && props?.task?.date && val !== props.task.date)
    selectedDate.value = props.task.date
  if (!reminderAutofillGuard) {
    reminderAbsoluteIso.value = null
  }
})
watch(reminderTime, val => {
  logTimeBrainDialog('reminder-time-change', { value: val, lock: props.disableReminder })
  if (props.disableReminder && props.task?.reminderTime && val !== props.task.reminderTime)
    reminderTime.value = props.task.reminderTime
  if (!reminderAutofillGuard) {
    reminderAbsoluteIso.value = null
  }
})
watch(setReminder, enabled => {
  logTimeBrainDialog('set-reminder-toggle', { enabled })
  const defaults = DEFAULT_REMINDER_CHANNELS.filter(ch => channelOptionIds.includes(ch))
  if (enabled && !allowedReminderChannels.value.length)
    allowedReminderChannels.value = defaults
  if (!enabled && allowedReminderChannels.value.length)
    allowedReminderChannels.value = []
  reminderPrefs.value = {
    ...reminderPrefs.value,
    enabled,
  }
  if (!enabled) {
    reminderAbsoluteIso.value = null
  }
})
watch(allowedReminderChannels, channels => {
  logTimeBrainDialog('channel-change', { channels })
  const normalized = Array.from(
    new Set(
      channels
        .map(ch => String(ch || '').toLowerCase())
        .filter(ch => channelOptionIds.includes(ch))
    )
  )
  if (!normalized.length && setReminder.value) {
    setReminder.value = false
  } else if (normalized.length && !setReminder.value) {
    setReminder.value = true
  }
  reminderPrefs.value = {
    ...reminderPrefs.value,
    channels: normalized,
  }
})

async function ensureReminderPreferences(force = false) {
  try {
    if (reminderPrefsLoaded.value && !force) return
    const uid = authStore?.user?.uid
    if (!uid) return

    const prefs = await getReminderPreferences(uid)
    if (prefs) applyReminderDefaults(prefs)
    reminderPrefsLoaded.value = true
  } catch (err) {
    console.warn('Failed to load reminder preferences', err)
    reminderPrefsLoaded.value = true
  }
}

async function ensureNotificationPrompt() {
  try {
    if (notificationChecked.value || notifPromptOpen.value) return
    const uid = authStore?.user?.uid
    if (!uid) return
    const prefs = await getUserPreferences(uid)
    if (!hasNotificationSetup(prefs?.notifications)) {
      notifPromptOpen.value = true
    }
  } catch (err) {
    console.warn('Notification preference check failed', err)
  }
  notificationChecked.value = true
}

function resetNewTaskState() {
  logTimeBrainDialog('reset-new-task-state', { reason: 'create-mode' })
  assignText(input, '')
  assignText(details, '')
  assignText(link, '')
  reminderTime.value = ''
  reminderAbsoluteIso.value = null
  reminderManuallyEdited.value = false
  if (!props.lockDate) selectedDate.value = normalizeDateInput(props.date)
  setReminder.value = !!reminderPrefs.value.enabled
  reminderOptionsVisible.value = false
  plannerVoiceReset.value += 1
  if (!allowedReminderChannels.value.length && reminderPrefs.value.channels.length) {
    allowedReminderChannels.value = reminderPrefs.value.channels.filter(ch => channelOptionIds.includes(ch))
  }
}

function hydrateFromTask(current) {
  logTimeBrainDialog('hydrate-task', { id: current?.id, title: current?.title })
  assignText(input, current.title || '')
  assignText(details, current.details || '')
  assignText(link, current.link || '')
  reminderManuallyEdited.value = false
  plannerVoiceReset.value += 1
  detailsVoiceReset.value += 1

  if (current.date) selectedDate.value = normalizeDateInput(current.date)
  let reminderHydrated = false
  if (current.scheduledTime) {
    reminderHydrated = applyReminderIso(current.scheduledTime, {
      allowDateChange: false,
      timezoneOverride: current.timezone,
    })
  }
  if (!reminderHydrated) {
    reminderTime.value = current.reminderTime || ''
    if (current.scheduledTime) {
      try {
        const parsed = dayjs(current.scheduledTime)
        reminderAbsoluteIso.value = parsed.isValid() ? parsed.utc().toISOString() : null
      } catch {
        reminderAbsoluteIso.value = null
      }
    } else {
      reminderAbsoluteIso.value = null
    }
  }

  const existingChannels = Array.isArray(current.reminderChannels)
    ? current.reminderChannels
    : Array.isArray(current.channels)
      ? current.channels
      : []
  if (existingChannels.length) {
    allowedReminderChannels.value = existingChannels.filter(ch => channelOptionIds.includes(ch))
  }

  setReminder.value = existingChannels.length > 0 || !!current.reminderTime
  reminderOptionsVisible.value = setReminder.value
}

/* ---------------- Prefill Reminder ---------------- */
async function tryPrefillReminder(task) {
  try {
    logTimeBrainDialog('prefill-reminder:start', { taskId: task?.id })
    if (!task?.id || reminderTime.value) return
    const uid = authStore?.user?.uid
    if (!uid) return

    const before = reminderTime.value || ''
    const res = await getReminderStatus(uid, task.id)
    const items = Array.isArray(res?.items) ? res.items : []
    if (!items.length) return

    const toJSDate = v => {
      try {
        if (!v) return null
        if (typeof v === 'string') return new Date(v)
        if (v instanceof Date) return v
        if (typeof v.toDate === 'function') return v.toDate()
        if (v.seconds) return new Date(v.seconds * 1000)
        return null
      } catch {
        return null
      }
    }

    const scheduled = items.filter(i => String(i.status).toLowerCase() === 'scheduled' && !i.sentAt)
    const pool = scheduled.length ? scheduled : items
    pool.sort((a, b) => {
      const ad = toJSDate(a.createdAt) || toJSDate(a.scheduledTime) || new Date(0)
      const bd = toJSDate(b.createdAt) || toJSDate(b.scheduledTime) || new Date(0)
      return bd - ad
    })
    const st = pool[0]?.scheduledTime
    if (!st || (before && before !== reminderTime.value)) return

    const iso = typeof st === 'string' ? st : st.toISOString?.() || String(st)
    const userTz = task?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    applyReminderIso(iso, { allowDateChange: false, timezoneOverride: userTz })
  } catch (err) {
    console.warn('Prefill reminder failed', err)
    logTimeBrainDialog('prefill-reminder:error', { message: err?.message })
  }
}

/* ---------------- Utility ---------------- */
function buildLocalIso(ymd, hhmm) {
  const tzCandidate = getUserTimezone()
  let tz = typeof tzCandidate === 'string' && tzCandidate.includes('/')
    ? tzCandidate
    : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return toUtcIso(String(ymd || ''), String(hhmm || '00:00'), tz)
}

function applyReminderIso(isoInput, options = {}) {
  const {
    allowDateChange = !props.lockDate,
    timezoneOverride,
  } = options
  if (!isoInput) return false
  try {
    const tzCandidate = timezoneOverride || getUserTimezone()
    const tz = typeof tzCandidate === 'string' && tzCandidate.includes('/')
      ? tzCandidate
      : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const sourceValue = (() => {
      if (!isoInput && isoInput !== 0) return null
      if (typeof isoInput?.toDate === 'function') {
        try { return isoInput.toDate() } catch { return null }
      }
      if (typeof isoInput?.seconds === 'number') return new Date(isoInput.seconds * 1000)
      if (typeof isoInput?._seconds === 'number') return new Date(isoInput._seconds * 1000)
      return isoInput
    })()
    if (!sourceValue) return false
    const parsed = dayjs(sourceValue)
    if (!parsed.isValid()) return false
    const local = parsed.tz(tz)
    const normalizedIso = parsed.utc().toISOString()
    reminderAutofillGuard = true
    try {
      reminderTime.value = local.format('HH:mm')
      reminderManuallyEdited.value = false
      if (allowDateChange) {
        selectedDate.value = normalizeDateInput(local.format('YYYY-MM-DD'))
      }
    } finally {
      reminderAutofillGuard = false
    }
    reminderAbsoluteIso.value = normalizedIso
    return true
  } catch (err) {
    reminderAutofillGuard = false
    console.warn('applyReminderIso failed', err?.message || err)
    return false
  }
}

function toLocalDateTimeIso(dateStr, timeStr, tz) {
  if (!dateStr || !timeStr) return null
  try {
    return dayjs.tz(`${dateStr}T${timeStr}`, tz).format('YYYY-MM-DDTHH:mm:ssZ')
  } catch {
    return null
  }
}

function resolveTaskLocalEnd(task, tz, fallbackDate) {
  if (!task) return null
  const zone = task?.timezone || tz
  const dateKey = task?.date || fallbackDate

  if (task?.ends_at) {
    try {
      const parsed = dayjs(task.ends_at).tz(zone)
      if (parsed.isValid()) return parsed.format('YYYY-MM-DDTHH:mm:ssZ')
    } catch {}
  }

  if (task?.reminderTime && dateKey) {
    const iso = toLocalDateTimeIso(normalizeDateInput(dateKey), task.reminderTime, zone)
    if (iso) return iso
  }

  if (task?.scheduledTime) {
    try {
      const parsed = dayjs(task.scheduledTime).tz(zone)
      if (parsed.isValid()) return parsed.format('YYYY-MM-DDTHH:mm:ssZ')
    } catch {}
  }

  return null
}

function collectContextTasks(dateStr, tz) {
  const normalizedDate = normalizeDateInput(dateStr)
  return tasks.value
    .filter(t => normalizeDateInput(t?.date || normalizedDate) === normalizedDate)
    .map(t => {
      const endsAt = resolveTaskLocalEnd(t, tz, normalizedDate)
      return {
        id: t.id,
        title: t.title,
        date: normalizeDateInput(t?.date || normalizedDate),
        reminderTime: t.reminderTime || null,
        scheduledTime: t.scheduledTime || null,
        timezone: t.timezone || tz,
        ends_at: endsAt,
      }
    })
}

function computeLastTaskEndIso(contextTasks, tz) {
  if (!Array.isArray(contextTasks) || !contextTasks.length) return null
  const sorted = contextTasks
    .map(t => t.ends_at ? { ...t, ends_at: dayjs(t.ends_at).tz(t.timezone || tz) } : null)
    .filter(Boolean)
    .sort((a, b) => a.ends_at.valueOf() - b.ends_at.valueOf())
  if (!sorted.length) return null
  return sorted[sorted.length - 1].ends_at.format('YYYY-MM-DDTHH:mm:ssZ')
}

async function inferReminderTimeFromInput() {
  try {
    if (props.disableReminder || !setReminder.value) return null
    const raw = getInputText().trim()
    if (!raw) return null

    const tzCandidate = getUserTimezone()
    const tz = typeof tzCandidate === 'string' && tzCandidate.includes('/')
      ? tzCandidate
      : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

    const isRelativeHint = RELATIVE_HINT_PATTERN.test(raw)
    const now = new Date()
    const todayKey = toLocalDateKey(now)

    const basePlanDate = normalizeDateInput(selectedDate.value)
    let planDateKey = isRelativeHint ? todayKey : basePlanDate

    const contextTasks = collectContextTasks(planDateKey, tz)
    const lastTaskEnd = computeLastTaskEndIso(contextTasks, tz)
    const planAnchor =
      planDateKey === todayKey
        ? now
        : dayjs.tz(`${planDateKey}T12:00:00`, tz).toDate()

    const inferenceNow = isRelativeHint ? now : planAnchor
    if (isRelativeHint && !props.lockDate) {
      selectedDate.value = normalizeDateInput(todayKey)
    }

    const iso = await extractReminderTime(raw, {
      planDate: planDateKey,
      timezone: tz,
      lastTaskEnd,
      existingTasks: contextTasks,
      userPreferences: reminderPrefs.value,
      now: inferenceNow,
      debugLabel: 'TaskPlannerDialog:manual-save',
    })

    if (!iso) return null
    const applied = applyReminderIso(iso, { timezoneOverride: tz })
    return applied ? iso : null
  } catch (err) {
    console.warn('Failed to infer reminder time from input', err?.message || err)
    return null
  }
}

function normalizeTitleKey(value) {
  if (!value) return ''
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function capitalizeTitle(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function enrichTitle(task) {
  const rawPhrase = task.rawPhrase || ''
  const displayTitle = task.displayTitle || ''
  const baseTitle = task.title || ''

  const candidateList = [
    displayTitle,
    baseTitle,
    rawPhrase,
  ].map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)

  let chosen = candidateList[0] || ''

  if (chosen.split(/\s+/).length <= 1) {
    const alt = candidateList.find(v => v.split(/\s+/).length > 1)
    if (alt) chosen = alt
  }

  if (/^go$/i.test(chosen) && rawPhrase) chosen = rawPhrase

  if (/^(sleep|bed|dinner|lunch|breakfast)$/i.test(chosen)) {
    chosen = `Prepare for ${chosen}`
  } else if (/^(sleep|bed)\b/i.test(chosen) && !/(prepare|plan|schedule)/i.test(chosen)) {
    chosen = chosen.replace(/^\s*go\b/i, 'Prepare').trim()
  }

  chosen = chosen.replace(/^\s*to\s+/i, '').trim()
  if (/^sleep$/i.test(chosen)) chosen = 'Prepare for sleep'

  if (!chosen) chosen = baseTitle || rawPhrase
  chosen = capitalizeTitle(chosen)
  return chosen || 'Plan task'
}

function parseLocalMoment(value, tz) {
  if (!value) return null
  try {
    const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(String(value))
    if (hasZone) {
      const base = dayjs(value)
      return base.isValid() ? base.tz(tz) : null
    }
    const parsed = dayjs.tz(value, tz, true)
    return parsed.isValid() ? parsed : null
  } catch {
    return null
  }
}

/* ---------------- Main Generator ---------------- */
async function generateTasks() {
  const currentInput = getInputText()
  if (!currentInput.trim()) return
  loading.value = true

  const tzCandidate = getUserTimezone()
  const tz = typeof tzCandidate === 'string' && tzCandidate.includes('/')
    ? tzCandidate
    : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const contextTasks = collectContextTasks(selectedDate.value, tz)
  const lastTaskEnd = computeLastTaskEndIso(contextTasks, tz)

  try {
    logTimeBrainDialog('generate:start', {
      tz,
      planDate: selectedDate.value,
      existingTasks: contextTasks.length,
      lastTaskEnd,
    })

    const result = await generateTasksFromText(currentInput, {
      planDate: selectedDate.value,
      timezone: tz,
      lastTaskEnd,
      userPreferences: reminderPrefs.value,
      existingTasks: contextTasks,
      debugLabel: 'TaskPlannerDialog',
    })

    const contextBundle = result?.context
      ? { context: result.context, serialized: result.contextSerialized }
      : null

    const revalidationMap = new Map(
      (result?.revalidation || []).map(entry => [entry.task.sourceIndex, entry])
    )

    let autoPlanDate = null
    let autoReminderTime = null
    const resolved = []
    for (const item of result?.items || []) {
      let parsedLocal = item.parsedTimeLocal
      const pending = revalidationMap.get(item.sourceIndex)

      if (pending) {
        const refinedIso = await extractReminderTime(pending.question, {
          contextBundle,
          timezone: tz,
          planDate: selectedDate.value,
          debugLabel: `TaskPlannerDialog:refine:${item.sourceIndex}`,
        })
        if (refinedIso) parsedLocal = refinedIso
        logTimeBrainDialog('generate:refine', {
          title: item.title,
          refined: !!refinedIso,
          confidence: item.confidence,
        })
      }

      let scheduledUtc = null
      if (parsedLocal) {
        const localMoment = parseLocalMoment(parsedLocal, tz)
        if (localMoment && localMoment.isValid()) {
          scheduledUtc = localMoment.utc().toISOString()
          if (!autoPlanDate) autoPlanDate = localMoment.format('YYYY-MM-DD')
          if (!autoReminderTime) autoReminderTime = localMoment.format('HH:mm')
        }
      }
      resolved.push({
        ...item,
        parsedTimeLocal: parsedLocal,
        scheduledTime: scheduledUtc,
        timezone: tz,
        reminderTime: scheduledUtc ? dayjs.utc(scheduledUtc).tz(tz).format('HH:mm') : null,
      })
    }

    if (typeof result?.reminderTime === 'string') {
      const reminderMoment = dayjs.utc(result.reminderTime).tz(tz)
      if (reminderMoment.isValid()) {
        if (!autoPlanDate) autoPlanDate = reminderMoment.format('YYYY-MM-DD')
        if (!autoReminderTime) autoReminderTime = reminderMoment.format('HH:mm')
      }
    }

    const seenKeys = new Set()
    const refined = []
    for (const item of resolved) {
      const finalTitle = enrichTitle(item)
      const key = normalizeTitleKey(finalTitle)
      if (key && seenKeys.has(key)) {
        logTimeBrainDialog('generate:dedupe-skip', { title: finalTitle })
        continue
      }
      if (key) seenKeys.add(key)
      refined.push({ ...item, finalTitle })
    }

    if (!refined.length) {
      logTimeBrainDialog('generate:empty', { reason: 'no-tasks-returned' })
      ElNotification({
        title: 'No Tasks Generated',
        message: 'Try adding more detail or different phrasing.',
        type: 'warning',
        duration: 2500,
      })
      return
    }

  if (!props.lockDate && autoPlanDate) {
    selectedDate.value = normalizeDateInput(autoPlanDate)
  }
  if (!reminderTime.value && autoReminderTime) {
    reminderTime.value = autoReminderTime
    reminderManuallyEdited.value = false
  }

    const prepared = refined.map((task, idx) => ({
      title: task.finalTitle || task.title || `Task ${idx + 1}`,
      displayTitle: task.displayTitle || task.finalTitle || task.title,
      rawPhrase: task.rawPhrase || task.title,
      details: task.details || '',
      category: task.category || 'Uncategorized',
      scheduledTime: task.scheduledTime,
      timezone: tz,
      reminderTime: task.reminderTime,
      timeHint: task.timeHint,
      relation: task.relation,
      gapMinutes: task.gapMinutes,
      confidence: task.confidence,
      meta: {
        ...task.meta,
        finalTitle: task.finalTitle,
        rawPhrase: task.rawPhrase,
        displayTitle: task.displayTitle,
      },
    }))

    const saved = await Promise.all(
      prepared.map(async (task, idx) => {
        const payload = {
          ...task,
          date: selectedDate.value,
          order: tasks.value.length + idx,
          completed: false,
        }
        return await addTaskToFirebase(payload)
      })
    )

    ElNotification({
      title: 'Success',
      message: `${saved.length} task${saved.length > 1 ? 's' : ''} created`,
      type: 'success',
      duration: 2500,
    })
    emit('saved', saved)
    logTimeBrainDialog('generate:completed', { saved: saved.length })
    if (!notifPromptOpen.value) closeDialog()
  } catch (err) {
    console.error('Generate failed', err)
    ElNotification({ title: 'Error', message: 'Task generation failed', type: 'error' })
  } finally {
    loading.value = false
  }
}

/* ---------------- Save Handler ---------------- */
async function save() {
  const rawText = getInputText().trim()
  const shouldForceRelative =
    !props.disableReminder &&
    setReminder.value &&
    RELATIVE_HINT_PATTERN.test(rawText) &&
    !reminderManuallyEdited.value

  if (shouldForceRelative) {
    await inferReminderTimeFromInput()
  }

  if (!props.disableReminder && setReminder.value && !reminderTime.value) {
    await inferReminderTimeFromInput()
    if (!reminderTime.value) {
      ElMessage({
        type: 'warning',
        message: 'Please choose a reminder time or include a specific time in your task.',
        duration: 4000,
      })
      return
    }
  }

  const dateToSave = props.lockDate && props.task?.date ? props.task.date : selectedDate.value
  let reminderToSave = null
  if (props.disableReminder) {
    reminderToSave = props.task?.reminderTime ?? null
  } else if (setReminder.value) {
    reminderToSave = reminderTime.value || null
  }

  const baseIso = reminderToSave
    ? (reminderAbsoluteIso.value || buildLocalIso(dateToSave, reminderToSave))
    : null
  const scheduledIso = baseIso ? enforceFutureReminder(baseIso, { allowDateChange: !props.lockDate }) : null

  const channelsToSave = setReminder.value ? computeReminderChannels() : []

  const safeTitle = getInputText() || props.task?.title || 'Untitled Task'

  emit('saved', {
    ...props.task,
    title: safeTitle,
    details: details.value,
    date: dateToSave,
    reminderTime: reminderToSave,
    scheduledTime: scheduledIso,
    reminderChannels: channelsToSave,
    channels: channelsToSave,
  })
  ElNotification({ title: 'Success', message: 'Task saved', type: 'success' })
  closeDialog()
}

function enforceFutureReminder(iso, { allowDateChange = true } = {}) {
  if (!iso) return null
  try {
    const tzCandidate = getUserTimezone()
    const tz = typeof tzCandidate === 'string' && tzCandidate.includes('/')
      ? tzCandidate
      : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

    const local = dayjs(iso).tz(tz)
    if (!local.isValid()) return iso

    const minFuture = dayjs().tz(tz).add(2, 'minute')
    if (local.isBefore(minFuture)) {
      const adjusted = minFuture
      reminderAutofillGuard = true
      try {
        reminderTime.value = adjusted.format('HH:mm')
        reminderAbsoluteIso.value = adjusted.utc().toISOString()
        if (allowDateChange) {
          selectedDate.value = normalizeDateInput(adjusted.format('YYYY-MM-DD'))
        }
      } finally {
        reminderAutofillGuard = false
      }
      return reminderAbsoluteIso.value
    }
    return local.utc().toISOString()
  } catch {
    return iso
  }
}

/* ---------------- Close ---------------- */
function closeDialog() {
  logTimeBrainDialog('close-dialog', { inputLength: getInputText().length })
  emit('close')
}

/* ---------------- Channel Toggles ---------------- */
function isChannelSelected(id) {
  return allowedReminderChannels.value.includes(id)
}

function toggleChannel(id) {
  if (!setReminder.value || props.readonly || props.disableReminder) return
  if (!channelOptionIds.includes(id)) return
  logTimeBrainDialog('toggle-channel', { id })

  const current = new Set(allowedReminderChannels.value)
  if (current.has(id)) {
    current.delete(id)
  } else {
    const instantActive = Array.from(current).filter(ch => CREATION_CHANNELS.includes(ch)).length
    const nextIsInstant = CREATION_CHANNELS.includes(id)
    if (nextIsInstant && instantActive >= MAX_INSTANT_ALERTS) {
      ElMessage({
        type: 'warning',
        message: 'You can only enable two instant alerts at once.',
        duration: 2000,
      })
      return
    }
    current.add(id)
  }

  allowedReminderChannels.value = Array.from(current)
}

function handleTranscript(result = {}) {
  const value = typeof result?.text === 'string' ? result.text.trim() : ''
  if (!value) return
  assignText(input, value)
  if (!setReminder.value && reminderPrefs.value.enabled) setReminder.value = true
  logTimeBrainDialog('transcription:title', { length: value.length })
  plannerVoiceReset.value += 1
}

function appendDetails(result = {}) {
  const value = typeof result?.text === 'string' ? result.text.trim() : ''
  if (!value) return
  details.value = details.value ? `${details.value}\n${value}` : value
  logTimeBrainDialog('transcription:details', { length: value.length })
  detailsVoiceReset.value += 1
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

.planner-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.planner-card {
  padding: 1.1rem;
  background: rgba(5, 8, 22, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.card-heading {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 0.85rem;
}

.card-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.8);
  margin: 0 0 0.2rem;
}

.card-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #f8fafc;
}

.card-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(226, 232, 240, 0.75);
}

.card-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.85);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.card-toggle:hover {
  border-color: rgba(255, 255, 255, 0.4);
  color: #f8fafc;
}

.card-toggle__icon {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.reminder-card--collapsed .card-toggle__icon {
  transform: rotate(-90deg);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.field-label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.35rem;
  color: rgba(226, 232, 240, 0.9);
}

.planner-voice-row {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  flex-wrap: wrap;
}

.planner-voice {
  flex: 1 1 260px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.planner-voice :deep(.voice-controller) {
  width: 100%;
}

.generate-btn {
  min-width: 180px;
  border-radius: 0.75rem;
  font-weight: 600;
  box-shadow: 0 15px 35px rgba(79, 70, 229, 0.35);
  background: linear-gradient(120deg, #7c3aed, #0ea5e9);
  border: none;
  color: #fdf4ff;
}

.generate-btn:disabled {
  opacity: 0.5;
  box-shadow: none;
}

.generate-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 38px rgba(79, 70, 229, 0.45);
}

.reminder-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reminder-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.reminder-toggle--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reminder-toggle__label {
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.9);
}

.channel-icons {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.channel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(17, 24, 39, 0.45);
  color: rgba(226, 232, 240, 0.9);
  font-size: 1.1rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.channel-icon--active {
  border-color: rgba(147, 197, 253, 0.8);
  background: rgba(59, 130, 246, 0.25);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.35);
}

.channel-icon:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.channel-icon:not(:disabled):hover {
  transform: translateY(-1px);
  border-color: rgba(147, 197, 253, 0.9);
}

.hint {
  margin: 0;
  font-size: 0.78rem;
  color: rgba(148, 163, 184, 0.85);
}

.reminder-collapse-enter-active,
.reminder-collapse-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.reminder-collapse-enter-from,
.reminder-collapse-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.link-field {
  margin-top: 1rem;
}

.link-preview {
  margin-top: 0.4rem;
  font-size: 0.85rem;
}
</style>

<style lang="scss">
.planner-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(10, 10, 20, 0.6);
  backdrop-filter: blur(6px);
  z-index: 2000;
}

.planner-overlay .el-overlay-dialog {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.planner-overlay .el-dialog {
  margin: 0 !important;
}

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
