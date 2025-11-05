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

    <div class="mb-4">
      <div class="flex items-center gap-3 mb-2">
        <el-switch
          v-model="setReminder"
          active-text="Set reminder"
          :disabled="props.readonly || props.disableReminder"
        ></el-switch>
        <span class="text-xs text-slate-300">Choose up to two instant alerts; email/SMS/voice are for scheduled reminders.</span>
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
              'channel-toggle--disabled': !setReminder || props.readonly || props.disableReminder
            }"
            @click="toggleChannel(option.id)"
          >
            <span class="text-lg leading-none">{{ option.icon }}</span>
          </button>
        </el-tooltip>
      </div>
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
  <!-- Local notification setup prompt -->
  <NotificationPrompt v-model="notifPromptOpen" />
</template>



<script setup>
import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { ElNotification, ElMessage } from 'element-plus'
import api from '@/services/api'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { generateTasksFromText, extractReminderTime } from '@/services/aiService'
import { addTaskToFirebase } from '@/services/firebaseService'
import { useAuthStore } from '@/stores/authStore'
import { getPreferences as getUserPreferences, getReminderPreferences } from '@/services/settingsService'
import { scheduleReminder, getReminderStatus } from '@/services/reminderService'
import { useTasks } from '@/composables/useTasks'
import { toLocalDateKey, parseLocalDateKey } from '@/utils/dateHelper'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { isFeatureAllowed } from '@/services/planService'
import { hasNotificationSetup } from '@/utils/notificationCheck'
import NotificationPrompt from '@/components/NotificationPrompt.vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { toLocal } from '@/utils/timezone'  // add this at top if not imported
import { toUtcIso, toLocalHHMM, getUserTimezone } from '@/utils/time'


dayjs.extend(utc)
dayjs.extend(timezone)

const DURATION_HINTS = {
  class: 75,
  lecture: 60,
  exam: 120,
  study: 45,
  homework: 40,
  assignment: 40,
  gym: 60,
  workout: 60,
  run: 45,
  dinner: 45,
  lunch: 40,
  breakfast: 20,
  meeting: 30,
  call: 20,
  sleep: 480,
}

const REMINDER_CHANNEL_ALLOW_LIST = ['pwa', 'whatsapp', 'email', 'sms', 'voice_call']
const CREATION_CHANNELS = ['pwa', 'whatsapp']
const channelOptions = [
  { id: 'pwa', label: 'PWA Push (browser)', icon: '📳' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'sms', label: 'SMS', icon: '📲' },
  { id: 'voice_call', label: 'Voice Call', icon: '📞' },
]
const channelOptionIds = channelOptions.map((option) => option.id)
const RELATIVE_HINT_PATTERN = /\b(in\s+\d+|after\b|before\b|later\b|then\b|next\b|from now\b|soon\b)/i

function inferDuration(title, fallback = 30) {
  try {
    const key = String(title || '').toLowerCase()
    for (const [k, mins] of Object.entries(DURATION_HINTS)) {
      if (key.includes(k)) return mins
    }
  } catch {}
  return fallback
}

function normalizeReminderPreferences(raw) {
  const channels = Array.isArray(raw?.channels)
    ? Array.from(
        new Set(
          raw.channels
            .map((c) => String(c || '').toLowerCase())
            .filter((c) => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
        )
      )
    : []
  const fallback = channels.length ? channels : ['pwa', 'whatsapp']
  const enabled =
    raw?.enabled !== undefined ? !!raw.enabled : fallback.length > 0
  return { enabled, channels: fallback }
}

function applyReminderDefaults(source) {
  const normalized = normalizeReminderPreferences(source || reminderPrefs.value)
  reminderPrefs.value = normalized
  setReminder.value = !!normalized.enabled
  const valid = normalized.channels.filter((ch) => channelOptionIds.includes(ch))
  allowedReminderChannels.value = valid.length ? valid : ['pwa', 'whatsapp'].filter((ch) => channelOptionIds.includes(ch))
}

function computeCreationChannels() {
  const selected = new Set(
    (allowedReminderChannels.value || []).map((c) => String(c || '').toLowerCase())
  )
  const defaults = Array.isArray(reminderPrefs.value?.channels)
    ? reminderPrefs.value.channels.map((c) => String(c || '').toLowerCase())
    : []
  const combined = CREATION_CHANNELS.filter((channel) => selected.has(channel) || defaults.includes(channel))
  return combined.slice(0, 2)
}

function computeReminderChannels() {
  const base = new Set(
    Array.isArray(reminderPrefs.value?.channels)
      ? reminderPrefs.value.channels.map((c) => String(c || '').toLowerCase())
      : []
  )
  const toggled = new Set((allowedReminderChannels.value || []).map((c) => String(c || '').toLowerCase()))
  for (const option of channelOptions) {
    if (toggled.has(option.id)) base.add(option.id)
    else base.delete(option.id)
  }
  const merged = Array.from(base).filter((c) =>
    REMINDER_CHANNEL_ALLOW_LIST.includes(c)
  )
  return merged.length ? merged : ['pwa']
}

function isChannelSelected(id) {
  const normalized = String(id || '').toLowerCase()
  return allowedReminderChannels.value.some((ch) => String(ch || '').toLowerCase() === normalized)
}

function toggleChannel(id) {
  if (props.readonly || props.disableReminder) return
  if (!setReminder.value) {
    setReminder.value = true
  }
  const normalized = String(id || '').toLowerCase()
  if (!channelOptionIds.includes(normalized)) return
  const previousOrder = (allowedReminderChannels.value || []).map((ch) => String(ch || '').toLowerCase())
  const currentSet = new Set(
    (allowedReminderChannels.value || []).map((ch) => String(ch || '').toLowerCase())
  )
  const alreadySelected = currentSet.has(normalized)
  if (alreadySelected) {
    currentSet.delete(normalized)
  } else {
    currentSet.add(normalized)
    if (CREATION_CHANNELS.includes(normalized)) {
      const creationSelected = Array.from(currentSet).filter((channelId) =>
        CREATION_CHANNELS.includes(channelId)
      )
      if (creationSelected.length > 2) {
        const orderedExisting = previousOrder.filter(
          (channelId) => CREATION_CHANNELS.includes(channelId) && channelId !== normalized
        )
        if (orderedExisting.length) {
          currentSet.delete(orderedExisting[0])
        }
      }
    }
  }
  allowedReminderChannels.value = channelOptions
    .map((opt) => opt.id)
    .filter((channelId) => currentSet.has(channelId))
}

const props = defineProps({
  open: Boolean,
  date: { type: [String, Date], default: () => toLocalDateKey(new Date()) },
  task: Object,
  editMode: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  // Optional: lock date input when reusing in Weekly/Monthly
  lockDate: { type: Boolean, default: false },
  // Optional: disable reminder edits when reusing in Weekly/Monthly
  disableReminder: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'saved'])

const { tasks } = useTasks()
const reminderPrefs = ref({ enabled: true, channels: ['pwa', 'whatsapp'] })
const reminderTime = ref(props.task ? props.task.reminderTime || '' : '')
const setReminder = ref(false)
const allowedReminderChannels = ref([])
const subStore = useSubscriptionStore()

const internalOpen = ref(props.open)
const input = ref('')
const details = ref('')
const link = ref('')
const selectedDate = ref(typeof props.date === 'string' ? props.date : toLocalDateKey(props.date))
const loading = ref(false)
const transcribing = ref(false)
const notifPromptOpen = ref(false)
const suppressAutoClose = ref(false)

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
    setReminder.value = !!task.reminderTime
    allowedReminderChannels.value = reminderPrefs.value.channels.filter((ch) =>
      CREATION_CHANNELS.includes(ch)
    )
    // If reminderTime missing but task exists, try to prefill from reminder status
    tryPrefillReminder(task)
  } else {
    input.value = ""
    details.value = ""
    link.value = ""
    selectedDate.value = props.date || ""
    reminderTime.value = ""
    applyReminderDefaults()
  }
}, { immediate: true })

watch(() => props.open, (val) => {
  internalOpen.value = val
  if (val && !props.task) applyReminderDefaults(reminderPrefs.value)
})
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
      try {
        const reminderData = await getReminderPreferences(uid)
        const normalized = normalizeReminderPreferences(reminderData)
        reminderPrefs.value = normalized
        if (!props.task) applyReminderDefaults(normalized)
        else {
          const valid = normalized.channels.filter((ch) => channelOptionIds.includes(ch))
          allowedReminderChannels.value = valid.length ? valid : ['pwa', 'whatsapp'].filter((ch) => channelOptionIds.includes(ch))
        }
      } catch (prefErr) {
        console.warn('Failed to load reminder preferences', prefErr)
        if (!props.task) applyReminderDefaults(reminderPrefs.value)
      }
    }
  } catch {}
  // Attempt prefill when opening in edit mode
  if (props.task) tryPrefillReminder(props.task)
})

// Enforce read-only/locked states for date and reminder when reused across views
watch(selectedDate, (val) => {
  try {
    if (props.lockDate && props?.task?.date && val !== props.task.date) {
      selectedDate.value = props.task.date
    }
  } catch {}
})

watch(reminderTime, (val) => {
  try {
    if (
      props.disableReminder &&
      typeof props?.task?.reminderTime !== 'undefined' &&
      val !== (props.task.reminderTime || '')
    ) {
      reminderTime.value = props.task.reminderTime || ''
    }
  } catch {}
})

watch(setReminder, (enabled) => {
  if (!enabled) return
  if (!allowedReminderChannels.value.length) {
    const defaults = Array.isArray(reminderPrefs.value.channels)
      ? reminderPrefs.value.channels.filter((ch) => channelOptionIds.includes(ch))
      : []
    allowedReminderChannels.value = defaults.length
      ? defaults
      : ['pwa', 'whatsapp'].filter((ch) => channelOptionIds.includes(ch))
  }
})

// Close planner once prompt dismissed (if we deferred auto-close)
watch(notifPromptOpen, (open) => {
  try {
    if (!open && suppressAutoClose.value) {
      suppressAutoClose.value = false
      setTimeout(() => closeDialog(), 50)
    }
  } catch {}
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
    const tz = getUserTimezone()
    return toUtcIso(String(ymd || ''), String(hhmm || '00:00'), tz)
  } catch {
    return new Date().toISOString()
  }
}

async function generateTasks() {
  if (!input.value.trim()) return
  loading.value = true
  try {
    const result = await generateTasksFromText(input.value)
    const rawList = Array.isArray(result?.items) && result.items.length
      ? result.items
      : Array.isArray(result?.tasks)
        ? result.tasks
        : []

    const tz = getUserTimezone()
    const todayKey = toLocalDateKey(new Date())
    const selectedKey = (() => {
      if (typeof selectedDate.value === 'string' && selectedDate.value) return selectedDate.value
      try {
        return toLocalDateKey(parseLocalDateKey(selectedDate.value))
      } catch {
        return todayKey
      }
    })()

    const nowIso = dayjs().tz(tz).toISOString()
    const nowAnchor = dayjs().tz(tz)
    const nowIso = nowAnchor.format('YYYY-MM-DDTHH:mm:ssZ')
    const parsedHints = await Promise.all(
      rawList.map(async (task) => {
        const base = typeof task === 'string' ? null : (task || {})
        if (!base) return null
        if (base.scheduledTime || base.scheduled_time) return null
        const rawHint = base.timeHint ?? base.time_hint ?? null
        if (!rawHint || typeof rawHint !== 'string') return null
        const hint = rawHint.trim()
        if (!hint) return null
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(hint)) return hint
        try {
          const isRelative = RELATIVE_HINT_PATTERN.test(hint)
          const containsExplicitClock = /(\d{1,2}:\d{2})|(\d{1,2}\s?(am|pm))|(\d{4}-\d{2}-\d{2})/i.test(hint)
          const query = isRelative && !containsExplicitClock
            ? hint
            : `Plan date: ${selectedKey}. ${hint}`
          const iso = await extractReminderTime(query, { now: nowIso, timezone: tz })
          try {
            console.log('[TimeFlow] planner.hintParse', { hint, query, now: nowIso, timezone: tz, iso })
          } catch {}
          if (!iso) return null
          const parsed = dayjs(iso)
          if (!parsed.isValid()) return iso
          const parsedInTz = parsed.tz(tz)
          if (
            selectedKey &&
            parsedInTz.isValid() &&
            parsedInTz.format('YYYY-MM-DD') !== selectedKey &&
            !/\d{4}-\d{2}-\d{2}/.test(hint)
          ) {
            const adjusted = dayjs.tz(`${selectedKey}T${parsedInTz.format('HH:mm')}`, tz, true)
            if (adjusted.isValid()) return adjusted.utc().toISOString()
          }
          return parsed.utc().toISOString()
        } catch {
          return null
        }
      })
    )

    const earliestStart = (() => {
      try {
        const candidate = dayjs.tz(`${selectedKey}T06:00`, tz)
        return candidate.isValid() ? candidate : dayjs().tz(tz)
      } catch {
        return dayjs().tz(tz)
      }
    })()

    const computeCursorStart = () => {
      try {
        const now = dayjs().tz(tz)
        let base = dayjs.tz(`${selectedKey}T09:00`, tz)
        if (!base.isValid()) base = dayjs.tz(selectedKey, tz)
        if (!base.isValid()) base = now
        if (selectedKey === todayKey && now.isAfter(base)) {
          base = now.add(15, 'minute')
        }
        if (base.isBefore(earliestStart)) base = earliestStart.clone()
        return base.startOf('minute')
      } catch {
        return dayjs().tz(tz)
      }
    }

    let cursor = computeCursorStart()
    let lastStart = null
    let lastEnd = null

    const normalizeTask = (task, idx) => {
      const base = typeof task === 'string' ? { title: task } : (task || {})
      const title = String(base.title || base.name || '').trim()
      if (!title) return null

      const estimateRaw = base.estimate_minutes ?? base.estimateMinutes ?? base.duration ?? base.durationMinutes
      const estimate = Number.isFinite(Number(estimateRaw)) && Number(estimateRaw) > 0
        ? Math.round(Number(estimateRaw))
        : inferDuration(title)
      const blockMinutes = Math.max(estimate, 30)

      const toDayjs = (value) => {
        try {
          if (!value) return null
          if (value instanceof Date) {
            const d = dayjs(value).tz(tz)
            return d.isValid() ? d : null
          }
          if (typeof value === 'string') {
            const trimmed = value.trim()
            if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
              const [h, m] = trimmed.split(':')
              const hh = String(h).padStart(2, '0')
              const mm = String(m).padStart(2, '0')
              const candidate = dayjs.tz(`${selectedKey}T${hh}:${mm}`, tz)
              return candidate.isValid() ? candidate : null
            }
            const candidate = dayjs(trimmed)
            return candidate.isValid() ? candidate.tz(tz) : null
          }
          if (typeof value === 'object') {
            if (value?.value) return toDayjs(value.value)
            if (value?.time) return toDayjs(value.time)
          }
        } catch {}
        return null
      }

      let scheduled = null
      let isAbsolute = false
      const relationType = String(base.relation || '').toLowerCase()
      const gapMinutes = Number.isFinite(Number(base.gapMinutes))
        ? Math.min(Math.max(Number(base.gapMinutes), 5), 120)
        : 15

      const directSchedule = toDayjs(base.scheduledTime || base.scheduled_time || null)
      if (directSchedule) {
        scheduled = directSchedule
        isAbsolute = true
      } else {
        const fromTimeField = toDayjs(base.time)
        if (fromTimeField) {
          scheduled = fromTimeField
          isAbsolute = true
        }
      }

      const parsedHintIso = parsedHints[idx] || null
      if (!scheduled || !scheduled.isValid()) {
        if (parsedHintIso) {
          const hinted = toDayjs(parsedHintIso)
          if (hinted && hinted.isValid()) {
            scheduled = hinted
            isAbsolute = true
          }
        } else if (base.timeHint) {
          const hinted = toDayjs(base.timeHint)
          if (hinted && hinted.isValid()) {
            scheduled = hinted
            isAbsolute = true
          }
        }
      }

      if (!scheduled || !scheduled.isValid()) {
        if (relationType === 'after_previous' && lastEnd && lastEnd.isValid()) {
          scheduled = lastEnd.clone().add(gapMinutes, 'minute')
          isAbsolute = true
        } else if (relationType === 'same_time_previous' && lastStart && lastStart.isValid()) {
          scheduled = lastStart.clone()
          isAbsolute = true
        }
      }

      if (!scheduled || !scheduled.isValid()) {
        if (!cursor || !cursor.isValid()) cursor = computeCursorStart()
        scheduled = cursor
        isAbsolute = false
      }

      if (scheduled.isBefore(earliestStart)) {
        scheduled = earliestStart.clone()
      }

      const next = scheduled.add(blockMinutes, 'minute')
      if (relationType === 'after_previous') {
        cursor = next
      } else if (relationType === 'same_time_previous') {
        if (!cursor || !cursor.isValid() || next.isAfter(cursor)) {
          cursor = next
        }
      } else if (!cursor || !cursor.isValid() || next.isAfter(cursor)) {
        cursor = next
      } else if (!isAbsolute) {
        cursor = cursor.add(blockMinutes, 'minute')
      }

      const scheduledUtc = scheduled.clone().utc().toISOString()
      lastStart = scheduled.clone()
      lastEnd = scheduled.clone().add(blockMinutes, 'minute')

      try {
        console.log('[TimeFlow] planner.normalizeTask', {
          title,
          relationType,
          timeHint: base.timeHint ?? null,
          parsedHintIso,
          scheduledUtc,
        })
      } catch {}

      return {
        title,
        details: base.details || '',
        link: base.link || '',
        estimate_minutes: blockMinutes,
        scheduledTime: scheduledUtc,
        time: base.time && typeof base.time === 'object'
          ? { ...base.time }
          : {
              type: isAbsolute ? 'absolute' : 'derived',
              value: isAbsolute ? scheduled.format('HH:mm') : null,
            },
        timezone: tz,
        source: 'planner',
      }
    }

    const preparedTasks = rawList.map((task, idx) => normalizeTask(task, idx)).filter(Boolean)
    if (!preparedTasks.length) {
      throw new Error('No tasks generated from input')
    }

    const uid = authStore?.user?.uid
    const orderBase = tasks.value?.length || 0
    const dateKey = selectedKey || todayKey

    const savedItems = await Promise.all(
      preparedTasks.map(async (task, idx) => {
        const payload = {
          title: task.title ?? `Task ${idx + 1}`,
          details: task.details ?? '',
          link: task.link ?? '',
          completed: false,
          date: dateKey,
          order: orderBase + idx,
          logs: [],
          estimate_minutes: task.estimate_minutes ?? inferDuration(task.title),
          reminderTime: task.time?.value || null,
          scheduledTime: task.scheduledTime ?? null,
          time: task.time ?? { type: 'derived', value: null },
          timezone: tz,
          source: 'planner',
        }
        return await addTaskToFirebase(payload)
      })
    )

    try {
      const taskIds = savedItems.map((item) => item?.id).filter(Boolean)
      if (uid && taskIds.length) {
        const creationChannels = computeCreationChannels()
        if (creationChannels.length) {
          await api.post('/notify/task-created', {
            userId: uid,
            taskIds,
            channels: creationChannels,
          })
        }
      }
    } catch (e) {
      console.warn('creation ping failed (non-blocking)', e?.message || e)
    }

    if (setReminder.value && uid) {
      const prefs = userPrefs.value?.notifications || {}
      if (!hasNotificationSetup(prefs)) {
        notifPromptOpen.value = true
        suppressAutoClose.value = true
      }

      const reminderChannels = computeReminderChannels()

      const reminders = savedItems
        .map((saved, index) => {
          const task = preparedTasks[index]
          if (!saved?.id || !task?.scheduledTime) return null
          return {
            taskId: saved.id,
            text: task.title,
            scheduledTime: task.scheduledTime,
            timezone: tz,
            channels: reminderChannels,
          }
        })
        .filter(Boolean)

      if (reminders.length) {
        try {
          const resp = await api.post('/reminders/batch', { userId: uid, reminders })
          const warn = resp?.headers?.['x-plan-warning'] || resp?.headers?.['X-Plan-Warning']
          if (warn) ElMessage({ message: warn, type: 'warning', duration: 5000 })
          try { window.dispatchEvent(new CustomEvent('usage-refresh')) } catch {}
        } catch (err) {
          console.warn('Batch reminder schedule failed; falling back', err?.response?.data || err?.message || err)
          if (err?.response?.status === 403) {
            const msg = err?.response?.data?.error || 'Daily reminder limit reached. Upgrade to Pro for unlimited reminders.'
            ElMessage({ message: msg, type: 'warning', duration: 6000 })
          }
          const fallbackPrefs = reminderChannels.reduce((acc, ch) => {
            acc[ch] = true
            return acc
          }, {})
          for (const reminder of reminders) {
            try {
              await scheduleReminder(uid, reminder.taskId, reminder.text, reminder.scheduledTime, fallbackPrefs)
            } catch (e) {
              console.warn('Fallback reminder schedule failed', e?.message || e)
            }
          }
          try { window.dispatchEvent(new CustomEvent('usage-refresh')) } catch {}
        }
      }
    }

    ElNotification({ title: 'Success', message: `${savedItems.length} task${savedItems.length > 1 ? 's' : ''} generated`, type: 'success', duration: 2500 })
    emit('saved', savedItems)
    if (!notifPromptOpen.value) closeDialog()
  } catch (err) {
    const status = err?.response?.status
    if (status === 403) {
      const msg = err?.response?.data?.error || 'Daily AI limit reached. Upgrade to Pro to continue.'
      ElNotification({ title: 'Upgrade Required', message: msg, type: 'warning', duration: 3500 })
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('upgrade-required', { detail: { source: 'ai-split' } })) } catch {}
    } else if (err?.message === 'No tasks generated from input') {
      ElNotification({ title: 'No Tasks', message: 'I could not find tasks to create. Try adding more details.', type: 'warning', duration: 3000 })
    } else {
      console.error(err)
      ElNotification({ title: 'Error', message: 'Task generation failed. Please try again.', type: 'error', duration: 3000 })
    }
  } finally {
    loading.value = false
    input.value = ''
    reminderTime.value = ''
    setReminder.value = false
    allowedReminderChannels.value = []
  }
}

function save() {
  if (props.task) {
    const dateToSave = props.lockDate && props?.task?.date ? props.task.date : selectedDate.value
    const reminderToSave = props.disableReminder && typeof props?.task?.reminderTime !== 'undefined'
      ? (props.task.reminderTime ?? null)
      : (reminderTime.value || null)
    emit("saved", { ...props.task, title: input.value, details: details.value, link: link.value, date: dateToSave, reminderTime: reminderToSave })
    ElNotification({ title: 'Success', message: 'Task updated successfully', type: 'success', duration: 2000 })
  } else {
    // Soft prompt if creating with reminder time and no channels configured
    try {
      if ((reminderTime.value || '').trim()) {
        const prefs = userPrefs.value?.notifications || {}
        if (!hasNotificationSetup(prefs)) {
          notifPromptOpen.value = true
          suppressAutoClose.value = true
        }
      }
    } catch {}
    emit("saved", { title: input.value, details: details.value, link: link.value, date: selectedDate.value, reminderTime: reminderTime.value || null })
    ElNotification({ title: 'Success', message: 'Task saved successfully', type: 'success', duration: 2000 })
  }
  if (!notifPromptOpen.value) closeDialog()
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
