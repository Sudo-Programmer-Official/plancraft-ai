<template>
  <el-dialog
    v-model="internalOpen"
    :title="task ? `✏️ Edit Task` : `📅 Plan for ${formattedDate}`"
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

    <!-- Title Input -->
    <el-input
      v-model="input"
      type="textarea"
      :rows="3"
      placeholder="Speak or type your task..."
      resize="none"
      class="mb-5"
    />

    <!-- Reminder Time -->
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

    <!-- Reminder Channels -->
    <div class="mb-4">
      <div class="flex items-center gap-3 mb-2">
        <el-switch
          v-model="setReminder"
          active-text="Set reminder"
          :disabled="props.readonly || props.disableReminder"
        />
        <span class="text-xs text-slate-300">
          Choose up to two instant alerts; email/SMS/voice are for scheduled reminders.
        </span>
      </div>
      <div class="channel-toggle-grid">
        <el-tooltip
          v-for="option in channelOptions"
          :key="option.id"
          effect="dark"
          placement="top"
          :content="option.label"
        >
          <button
            class="channel-toggle"
            type="button"
            :disabled="props.readonly || props.disableReminder"
            :class="{
              'channel-toggle--active': isChannelSelected(option.id),
              'channel-toggle--inactive': !isChannelSelected(option.id),
              'channel-toggle--disabled': !setReminder
            }"
            @click="toggleChannel(option.id)"
          >
            <span class="text-lg leading-none">{{ option.icon }}</span>
          </button>
        </el-tooltip>
      </div>
    </div>

    <!-- Edit Mode: Details + Link -->
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
        <VoiceRecorder @transcribed="appendDetails" />
      </div>

      <div>
        <label class="block text-sm text-slate-300 mb-1">Optional Link</label>
        <el-input v-model="link" type="text" placeholder="https://example.com" clearable />
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

    <!-- New Task: Voice + Generate -->
    <div v-if="!props.task" class="flex gap-4 mb-6">
      <VoiceRecorder @transcribed="handleTranscript" />
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
        {{ loading ? '⏳ Generating...' : '+ Generate Tasks' }}
      </el-button>
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
  { id: 'pwa', label: 'PWA Push (browser)', icon: '📳' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'sms', label: 'SMS', icon: '📲' },
  { id: 'voice_call', label: 'Voice Call', icon: '📞' },
]
const MAX_INSTANT_ALERTS = 2

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
    // eslint-disable-next-line no-console
    console.log(`[TimeBrain][Dialog] ${event}`, payload)
  } catch {
    /* noop */
  }
}

const internalOpen = ref(props.open)

watch(() => props.open, (val) => {
  internalOpen.value = val
})
watch(internalOpen, (val) => {
  if (!val) emit('close')
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
  const fallback = channels.length ? channels : ['pwa', 'whatsapp']
  const enabled = raw?.enabled !== undefined ? !!raw.enabled : fallback.length > 0
  return { enabled, channels: fallback }
}

function applyReminderDefaults(source) {
  const normalized = normalizeReminderPreferences(source)
  reminderPrefs.value = normalized
  setReminder.value = !!normalized.enabled
  const valid = normalized.channels.filter(ch => channelOptionIds.includes(ch))
  allowedReminderChannels.value = valid.length
    ? valid
    : ['pwa', 'whatsapp'].filter(ch => channelOptionIds.includes(ch))
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
const reminderPrefs = ref({ enabled: true, channels: ['pwa', 'whatsapp'] })
const allowedReminderChannels = ref([])
const reminderTime = ref('')
const setReminder = ref(false)
const input = ref('')
const details = ref('')
const link = ref('')
const selectedDate = ref(normalizeDateInput(props.date))
const loading = ref(false)
const notifPromptOpen = ref(false)
const suppressAutoClose = ref(false)
const reminderPrefsLoaded = ref(false)
const notificationChecked = ref(false)

const formattedDate = computed(() => {
  try {
    const base = parseLocalDateKey(selectedDate.value || normalizeDateInput(new Date()))
    return dayjs(base).format('MMM D, YYYY')
  } catch {
    return selectedDate.value || ''
  }
})

const displayLink = computed(() => {
  const value = (link.value || '').trim()
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
onMounted(() => {
  const resizeHandler = () => (screenWidth.value = window.innerWidth)
  window.addEventListener('resize', resizeHandler)
  onBeforeUnmount(() => window.removeEventListener('resize', resizeHandler))
})
const dialogWidth = computed(() => (screenWidth.value < 640 ? '90%' : '520px'))

/* ---------------- Watchers ---------------- */
watch(
  () => props.open,
  async (val) => {
    logTimeBrainDialog('visibility-change', { open: val })
    if (!val) {
      suppressAutoClose.value = false
      return
    }
    await ensureReminderPreferences()
    await ensureNotificationPrompt()
    if (!task.value) {
      applyReminderDefaults(reminderPrefs.value)
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
})
watch(reminderTime, val => {
  logTimeBrainDialog('reminder-time-change', { value: val, lock: props.disableReminder })
  if (props.disableReminder && props.task?.reminderTime && val !== props.task.reminderTime)
    reminderTime.value = props.task.reminderTime
})
watch(setReminder, enabled => {
  logTimeBrainDialog('set-reminder-toggle', { enabled })
  if (enabled && !allowedReminderChannels.value.length)
    allowedReminderChannels.value = ['pwa', 'whatsapp']
  reminderPrefs.value = {
    ...reminderPrefs.value,
    enabled,
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
  reminderPrefs.value = {
    ...reminderPrefs.value,
    channels: normalized,
  }
})

async function ensureReminderPreferences() {
  try {
    if (reminderPrefsLoaded.value) return
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
  input.value = ''
  details.value = ''
  link.value = ''
  reminderTime.value = ''
  if (!props.lockDate) selectedDate.value = normalizeDateInput(props.date)
  setReminder.value = !!reminderPrefs.value.enabled
  if (!allowedReminderChannels.value.length && reminderPrefs.value.channels.length) {
    allowedReminderChannels.value = reminderPrefs.value.channels.filter(ch => channelOptionIds.includes(ch))
  }
}

function hydrateFromTask(current) {
  logTimeBrainDialog('hydrate-task', { id: current?.id, title: current?.title })
  input.value = current.title || ''
  details.value = current.details || ''
  link.value = current.link || ''

  if (current.date) selectedDate.value = normalizeDateInput(current.date)
  reminderTime.value = current.reminderTime || ''

  const existingChannels = Array.isArray(current.reminderChannels)
    ? current.reminderChannels
    : Array.isArray(current.channels)
      ? current.channels
      : []
  if (existingChannels.length) {
    allowedReminderChannels.value = existingChannels.filter(ch => channelOptionIds.includes(ch))
  }

  setReminder.value = existingChannels.length > 0 || !!current.reminderTime
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
    const local = dayjs.utc(iso).tz(userTz)
    reminderTime.value = local.format('HH:mm')
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
    const iso = toLocalDateTimeIso(normalizeDateInput(dateKey, zone), task.reminderTime, zone)
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
  const normalizedDate = normalizeDateInput(dateStr, tz)
  return tasks.value
    .filter(t => normalizeDateInput(t?.date || normalizedDate, tz) === normalizedDate)
    .map(t => {
      const endsAt = resolveTaskLocalEnd(t, tz, normalizedDate)
      return {
        id: t.id,
        title: t.title,
        date: normalizeDateInput(t?.date || normalizedDate, tz),
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

/* ---------------- Main Generator ---------------- */
async function generateTasks() {
  if (!input.value.trim()) return
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

    const result = await generateTasksFromText(input.value, {
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

      const scheduledUtc = parsedLocal ? dayjs(parsedLocal).utc().toISOString() : null
      resolved.push({
        ...item,
        parsedTimeLocal: parsedLocal,
        scheduledTime: scheduledUtc,
        timezone: tz,
        reminderTime: parsedLocal ? dayjs(parsedLocal).tz(tz).format('HH:mm') : null,
      })
    }

    if (!resolved.length) {
      logTimeBrainDialog('generate:empty', { reason: 'no-tasks-returned' })
      ElNotification({
        title: 'No Tasks Generated',
        message: 'Try adding more detail or different phrasing.',
        type: 'warning',
        duration: 2500,
      })
      return
    }

    const prepared = resolved.map((task, idx) => ({
      title: task.title || `Task ${idx + 1}`,
      details: task.details || '',
      scheduledTime: task.scheduledTime,
      timezone: tz,
      reminderTime: task.reminderTime,
      timeHint: task.timeHint,
      relation: task.relation,
      gapMinutes: task.gapMinutes,
      confidence: task.confidence,
      meta: task.meta,
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
  } catch (err) {
    console.error('Generate failed', err)
    ElNotification({ title: 'Error', message: 'Task generation failed', type: 'error' })
  } finally {
    loading.value = false
  }
}

/* ---------------- Save Handler ---------------- */
function save() {
  const dateToSave = props.lockDate && props.task?.date ? props.task.date : selectedDate.value
  const reminderToSave = props.disableReminder
    ? props.task?.reminderTime
    : reminderTime.value || null

  emit('saved', {
    ...props.task,
    title: input.value,
    details: details.value,
    date: dateToSave,
    reminderTime: reminderToSave,
  })
  ElNotification({ title: 'Success', message: 'Task saved', type: 'success' })
  closeDialog()
}

/* ---------------- Close ---------------- */
function closeDialog() {
  logTimeBrainDialog('close-dialog', { inputLength: input.value.length })
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

function handleTranscript(text) {
  const value = typeof text === 'string' ? text.trim() : ''
  if (!value) return
  input.value = value
  if (!setReminder.value && reminderPrefs.value.enabled) setReminder.value = true
  logTimeBrainDialog('transcription:title', { length: value.length })
}

function appendDetails(text) {
  const value = typeof text === 'string' ? text.trim() : ''
  if (!value) return
  details.value = details.value ? `${details.value}\n${value}` : value
  logTimeBrainDialog('transcription:details', { length: value.length })
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

.channel-toggle-grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.channel-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(15, 23, 42, 0.4);
  transition: all 0.2s ease;
  cursor: pointer;
}

.channel-toggle--active {
  background: rgba(59, 130, 246, 0.25);
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
}

.channel-toggle--inactive {
  opacity: 0.75;
}

.channel-toggle--disabled {
  opacity: 0.4;
  cursor: not-allowed;
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
