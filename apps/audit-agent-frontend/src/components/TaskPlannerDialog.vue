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
        backdropFilter: 'blur(12px)',
      }"
      @close="closeDialog"
    >
      <div class="planner-stack planner-stack--mobile-order">
        <section class="planner-card section-date">
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
          <div class="quick-repeat-block">
            <div class="field">
              <label class="field-label">Repeat</label>
              <div class="repeat-preset-row">
                <button
                  v-for="option in repeatPresetOptions"
                  :key="option.value"
                  type="button"
                  class="repeat-preset"
                  :class="{ 'repeat-preset--active': activeRepeatSelection === option.value }"
                  :disabled="props.readonly"
                  @click="setRepeatOption(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
              <div v-if="repeatEnabled && repeatType === 'custom'" class="repeat-custom-inline">
                <label class="field-label">Every</label>
                <el-input-number
                  v-model="repeatIntervalDays"
                  :min="1"
                  :max="365"
                  :disabled="props.readonly"
                  class="w-full planner-dark-number"
                />
                <span class="repeat-custom-inline__suffix">days</span>
              </div>
              <p class="field-help repeat-inline-help">
                {{ repeatHelperText }}
              </p>
            </div>
          </div>
        </section>

        <section class="planner-card section-task">
          <div class="card-heading">
            <div>
              <p class="card-eyebrow">Task idea</p>
              <h3 class="card-title">What should we plan?</h3>
            </div>
          </div>
          <el-input
            v-model="input"
            type="textarea"
            :rows="textareaRows"
            placeholder="Speak or type your task..."
            resize="none"
            class="task-textarea"
          />
          <p class="datetime-hint">
            Date and time can be detected automatically from what you type.
          </p>
          <div class="assistive-bar">
            <div class="assistive-actions">
              <div>
                <el-button
                  v-if="imageTasksEnabled"
                  size="small"
                  class="icon-btn attach-btn"
                  :disabled="loading || attachmentUploading"
                  :loading="attachmentUploading"
                  @click="openAttachmentPicker"
                  title="Attach image or PDF"
                >
                  <span class="attach-svg" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path
                        d="M8.5 12.5l5.8-5.8a3 3 0 1 1 4.3 4.2l-7.1 7.1a4.5 4.5 0 0 1-6.4 0 4.5 4.5 0 0 1 0-6.4l7.6-7.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                </el-button>
              </div>
              <div>
                <button
                  type="button"
                  class="icon-btn mic-btn"
                  :class="{
                    'mic-btn--active': loading || plannerVoiceState === 'recording',
                    'mic-btn--processing': plannerVoiceState === 'transcribing',
                  }"
                  :title="plannerVoiceButtonLabel"
                  :aria-label="plannerVoiceButtonLabel"
                >
                  <VoiceRecorder
                    :autoCommit="true"
                    :disabled="loading"
                    :reset-trigger="plannerVoiceReset"
                    @transcribed="handleTranscript"
                    @state-change="onPlannerVoiceStateChange"
                  />
                  <span class="mic-visual" aria-hidden="true"></span>
                </button>
              </div>
              <div>
                <el-button
                  size="small"
                  class="save-draft-btn"
                  :disabled="!getInputText().trim() || draftSaving"
                  :loading="draftSaving"
                  @click="saveDraftToNapkin"
                >
                  Save Draft
                </el-button>
              </div>
            </div>
            <el-button @click="generateTasks" :disabled="generateDisabled" class="generate-btn">
              <span class="generate-inner">
                <span class="generate-icon" aria-hidden="true">
                  <span v-if="generateState === 'idle'">+</span>
                  <span v-else-if="generateState === 'loading'" class="spinner"></span>
                  <span v-else>✔</span>
                </span>
                <span class="generate-text">{{ generateButtonLabel }}</span>
              </span>
            </el-button>
          </div>
          <div v-if="imageTasksEnabled" class="attachment-block">
            <input
              ref="attachmentInput"
              type="file"
              class="hidden"
              accept="image/png,image/jpeg,image/jpg,application/pdf"
              @change="onAttachmentChange"
            />
            <div v-if="attachmentUploading || visionStatus" class="attachment-status">
              {{ visionStatus || 'Analyzing image…' }}
            </div>
            <div v-if="attachments.length" class="attachment-previews">
              <div
                v-for="(file, idx) in attachments"
                :key="file.url || idx"
                class="attachment-card compact"
              >
                <div class="attachment-thumb-wrap">
                  <img
                    v-if="!isPdf(file)"
                    :src="file.url"
                    alt="Attachment preview"
                    class="attachment-thumb"
                  />
                  <div v-else class="attachment-thumb attachment-thumb--pdf">📄</div>
                </div>
                <div class="attachment-meta">
                  <p class="attachment-name">{{ file.name || 'Attachment' }}</p>
                  <p class="attachment-source">From image</p>
                </div>
                <button type="button" class="attachment-remove" @click="removeAttachment(idx)">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </section>

        <section v-if="pendingGeneratedTasks.length" class="planner-card">
          <div class="card-heading">
            <div>
              <p class="card-eyebrow">Review</p>
              <h3 class="card-title">Confirm generated tasks</h3>
            </div>
          </div>
          <div class="generated-preview">
            <div
              v-for="task in pendingGeneratedTasks"
              :key="task.title"
              class="generated-preview__item"
            >
              <div class="generated-preview__title">{{ task.title }}</div>
              <div v-if="task.details" class="generated-preview__details">{{ task.details }}</div>
              <div v-if="task.attachments?.length" class="generated-preview__badge">
                📎 From image
              </div>
            </div>
          </div>
          <div class="preview-actions">
            <el-button size="small" @click="clearGeneratedPreview">Discard</el-button>
            <el-button
              type="primary"
              size="small"
              :loading="loading"
              @click="confirmGeneratedTasks"
            >
              Save tasks
            </el-button>
          </div>
        </section>

        <div class="section-divider" />
        <section
          class="planner-card reminder-card section-reminder"
          :class="{ 'reminder-card--collapsed': !reminderOptionsVisible }"
        >
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
              <label
                class="reminder-toggle"
                :class="{ 'reminder-toggle--disabled': props.readonly || props.disableReminder }"
              >
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
              <p v-if="setReminder && !(props.readonly || props.disableReminder)" class="hint">
                We’ll match your notification preferences. Calls only ring when it’s reminder time.
              </p>
              <div v-if="voiceReminderSummaryLines.length" class="reminder-auto-summary">
                <p class="reminder-auto-summary__title">{{ voiceReminderSummaryTitle }}</p>
                <div class="reminder-auto-summary__items">
                  <span
                    v-for="line in voiceReminderSummaryLines"
                    :key="line"
                    class="reminder-auto-summary__item"
                  >
                    ✓ {{ line }}
                  </span>
                </div>
              </div>

              <div v-if="setReminder" class="field-grid repeat-grid repeat-grid--offset">
                <div class="field">
                  <label class="field-label">Notify me before due date</label>
                  <el-input-number
                    v-model="reminderOffsetDays"
                    :min="0"
                    :max="365"
                    :disabled="props.readonly || props.disableReminder || !setReminder"
                    class="w-full planner-dark-number"
                  />
                  <p class="field-help">
                    0 means the same day. 2 means two days before the task is due.
                  </p>
                </div>
              </div>

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
            class="planner-cancel-btn flex-1 px-4 py-2 rounded-lg font-medium"
          >
            Cancel
          </el-button>
          <el-button
            type="primary"
            @click="save"
            class="flex-1 px-4 ml-0-custom py-2 rounded-lg text-white font-medium shadow-md bg-gradient-to-r from-emerald-700 via-teal-800 to-cyan-700 hover:from-emerald-800 hover:via-teal-900 hover:to-cyan-800 transition-all duration-300"
          >
            {{ props.task ? 'Update Task' : 'Save Task' }}
          </el-button>
        </div>
        <div v-else-if="isMobile" class="w-full">
          <el-button
            @click="closeDialog"
            class="planner-cancel-btn planner-mobile-cancel-btn w-full ml-0-custom"
          >
            Cancel
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
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import NotificationPrompt from '@/components/NotificationPrompt.vue'
import { useAuthStore } from '@/stores/authStore'
import { useAccessStore } from '@/stores/accessStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { useTasks } from '@/composables/useTasks'
import { useWorkspaceStore } from '@/stores/workspaceStore'

/* ---------------- Services ---------------- */
import { generateTasksFromText, extractReminderTime } from '@/services/aiService'
import { addTaskToFirebase } from '@/services/firebaseService'
import {
  getPreferences as getUserPreferences,
  getReminderPreferences,
} from '@/services/settingsService'
import { getReminderStatus } from '@/services/reminderService'
import { createNapkinItem } from '@/services/napkinService'
import { isFeatureAllowed } from '@/services/planService'
import { hasNotificationSetup } from '@/utils/notificationCheck'
import { areImageTasksEnabled } from '@/utils/imageTasksAccess'

/* ---------------- Utilities ---------------- */
import { toLocalDateKey, parseLocalDateKey } from '@/utils/dateHelper'
import { toUtcIso, getUserTimezone } from '@/utils/time'
import {
  computeReminderScheduleIso,
  normalizeReminderOffsetDays,
  normalizeTaskRepeat,
} from '@/utils/taskRecurrence'
import { parseVoiceTaskIntent } from '@/utils/taskVoiceParser'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/* ---------------- Constants ---------------- */
const RELATIVE_HINT_PATTERN =
  /\b(in\s+\d+\s+\w+|after\s+\w+|before\s+\w+|later|then|next|from now|soon)\b/i
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
const repeatPresetOptions = [
  { value: 'off', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
]

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

watch(
  () => props.open,
  (val) => {
    internalOpen.value = val
  },
)
watch(internalOpen, (val) => {
  setBodyScrollLocked(val)
  if (!val) emit('close')
})
onBeforeUnmount(() => setBodyScrollLocked(false))
onMounted(() => {
  if (internalOpen.value) setBodyScrollLocked(true)
})
const channelOptionIds = channelOptions.map((o) => o.id)

/* ---------------- Helper Functions ---------------- */
function normalizeDateInput(value) {
  if (!value) return toLocalDateKey(new Date())
  return typeof value === 'string' ? value : toLocalDateKey(value)
}

function normalizeReminderPreferences(raw) {
  const channels = Array.isArray(raw?.channels)
    ? Array.from(
        new Set(
          raw.channels
            .map((c) => String(c || '').toLowerCase())
            .filter((c) => REMINDER_CHANNEL_ALLOW_LIST.includes(c)),
        ),
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
  const valid = normalized.channels.filter((ch) => channelOptionIds.includes(ch))
  if (!normalized.enabled) {
    allowedReminderChannels.value = []
  } else if (valid.length) {
    allowedReminderChannels.value = valid
  } else {
    allowedReminderChannels.value = DEFAULT_REMINDER_CHANNELS.filter((ch) =>
      channelOptionIds.includes(ch),
    )
  }
}

function computeReminderChannels() {
  const base = new Set(reminderPrefs.value.channels.map((c) => c.toLowerCase()))
  const toggled = new Set(allowedReminderChannels.value.map((c) => c.toLowerCase()))
  for (const opt of channelOptions) {
    if (toggled.has(opt.id)) base.add(opt.id)
    else base.delete(opt.id)
  }
  const merged = Array.from(base).filter((c) => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
  return merged.length ? merged : ['pwa']
}

function normalizeReminderConfig(value, fallback = {}) {
  if (!value || typeof value !== 'object') return fallback || null
  const includeOnDue = value.includeOnDue !== false
  const offsetDays = normalizeReminderOffsetDays(value.offsetDays, { fallback: null })
  const next = { includeOnDue }
  if (offsetDays && offsetDays > 0) next.offsetDays = offsetDays
  return next
}

function buildReminderConfig({ includeOnDue = true, offsetDays = null } = {}) {
  const next = { includeOnDue: includeOnDue !== false }
  const normalizedOffset = normalizeReminderOffsetDays(offsetDays, { fallback: null })
  if (normalizedOffset && normalizedOffset > 0) next.offsetDays = normalizedOffset
  return next
}

function isWeekendDate(value) {
  const parsed = parseLocalDateKey(normalizeDateInput(value))
  const dayOfWeek = parsed.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

function weekendDayLabel(value) {
  const parsed = parseLocalDateKey(normalizeDateInput(value))
  return parsed.getDay() === 0 ? 'Sunday' : 'Saturday'
}

function alignDateToWeekend(value) {
  const parsed = parseLocalDateKey(normalizeDateInput(value))
  const dayOfWeek = parsed.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) return toLocalDateKey(parsed)
  parsed.setDate(parsed.getDate() + (6 - dayOfWeek))
  return toLocalDateKey(parsed)
}

function syncSelectedDateToWeekend(value = selectedDate.value) {
  if (props.lockDate) return
  const normalized = normalizeDateInput(value)
  const weekendDate = alignDateToWeekend(normalized)
  if (weekendDate === normalized) return
  repeatWeekendCoercionGuard = true
  selectedDate.value = weekendDate
  repeatWeekendCoercionGuard = false
}

function setRepeatOption(value) {
  if (props.readonly) return
  if (value === 'off') {
    repeatEnabled.value = false
    return
  }
  repeatEnabled.value = true
  repeatType.value = value
  if (value === 'custom' && (!Number.isFinite(Number(repeatIntervalDays.value)) || Number(repeatIntervalDays.value) < 1)) {
    repeatIntervalDays.value = 30
  }
  if (value === 'weekend') {
    syncSelectedDateToWeekend()
  }
}

/* ---------------- Refs ---------------- */
const { tasks: taskStore } = useTasks()
const tasks = computed(() => {
  const value = taskStore?.value
  return Array.isArray(value) ? value : []
})
const workspaceStore = useWorkspaceStore()
const activeWorkspaceId = computed(() => {
  try {
    return workspaceStore.activeWorkspaceId || localStorage.getItem('activeWorkspaceId') || null
  } catch {
    return workspaceStore.activeWorkspaceId || null
  }
})

const imageTasksEnabled = areImageTasksEnabled()
const attachments = ref([])
const attachmentUploading = ref(false)
const attachmentInput = ref(null)
const visionStatus = ref('')
const pendingGeneratedTasks = ref([])
const allowedAttachmentTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
const generationMode = ref('idle') // idle | textGenerating | imageUploading | imageAnalyzing | preview
let visionUploadLoader = null

async function getVisionUploader() {
  if (!imageTasksEnabled) throw new Error('Image tasks are disabled')
  if (!visionUploadLoader) {
    visionUploadLoader = import('@/services/visionUploadService')
      .then((mod) => mod.uploadImageForVision)
      .catch((err) => {
        visionUploadLoader = null
        throw err
      })
  }
  return visionUploadLoader
}

const authStore = useAuthStore()
const subStore = useSubscriptionStore()
const reminderPrefs = ref({ enabled: true, channels: [...DEFAULT_REMINDER_CHANNELS] })
const allowedReminderChannels = ref([])
const reminderTime = ref('')
const reminderManuallyEdited = ref(false)
const reminderAbsoluteIso = ref(null)
const setReminder = ref(false)
const reminderOffsetDays = ref(0)
const includeOnDue = ref(true)
const reminderOptionsVisible = ref(false)
const repeatEnabled = ref(false)
const repeatType = ref('daily')
const repeatIntervalDays = ref(30)
const voiceParsedIntent = ref(null)
const plannerVoiceReset = ref(0)
const plannerVoiceState = ref('idle')
const detailsVoiceReset = ref(0)
const input = ref('')
const details = ref('')
const link = ref('')
const selectedDate = ref(normalizeDateInput(props.date))
let repeatWeekendCoercionGuard = false
const loading = ref(false)
const notifPromptOpen = ref(false)
const suppressAutoClose = ref(false)
const reminderPrefsLoaded = ref(false)
const notificationChecked = ref(false)

function getInputText() {
  return coerceText(input.value)
}

const hasAttachmentsComputed = computed(() => imageTasksEnabled && attachments.value.length > 0)
const activeRepeatSelection = computed(() => (repeatEnabled.value ? repeatType.value : 'off'))
const repeatHelperText = computed(() => {
  if (!repeatEnabled.value) {
    return 'Optional for routines like beard trimming, supplements, or hair care.'
  }
  if (repeatType.value === 'weekend') {
    return isWeekendDate(selectedDate.value)
      ? `Repeats every ${weekendDayLabel(selectedDate.value)} after you complete it.`
      : 'Weekend tasks are scheduled for Saturday or Sunday. Weekday picks move to Saturday.'
  }
  if (repeatType.value === 'custom') {
    return `Creates the next task ${Math.max(1, Number(repeatIntervalDays.value) || 1)} day(s) after completion.`
  }
  return 'When you complete this task, PlanCraft creates the next occurrence automatically.'
})
const accessStore = useAccessStore()
const featureAllowed = computed(() => {
  const access = accessStore.access
  if (access?.entitlements) {
  return isFeatureAllowed(access, 'aiSplit')
  }
  return isFeatureAllowed({ plan: subStore.subscription.plan, role: authStore?.user?.role }, 'aiSplit')
})
const generateDisabled = computed(() => {
  // Keep image-only flow valid: allow submit when attachments exist even if text is empty
  if (!featureAllowed.value) return true
  if (plannerVoiceState.value === 'transcribing') return true
  if (loading.value || attachmentUploading.value) return true
  if (generationMode.value === 'imageAnalyzing' || generationMode.value === 'imageUploading')
    return true
  const hasText = !!getInputText().trim()
  if (hasAttachmentsComputed.value) return false
  return !hasText
})
const generateButtonLabel = computed(() => {
  if (attachmentUploading.value) return 'Uploading…'
  if (generationMode.value === 'imageAnalyzing') return 'Analyzing image…'
  if (loading.value) return 'Generating…'
  if (pendingGeneratedTasks.value.length) return 'Review Tasks'
  return 'Generate Tasks'
})
const generateState = computed(() => {
  if (pendingGeneratedTasks.value.length) return 'review'
  if (loading.value || generationMode.value === 'imageAnalyzing' || attachmentUploading.value)
    return 'loading'
  return 'idle'
})
const plannerVoiceButtonLabel = computed(() => {
  if (plannerVoiceState.value === 'transcribing') return 'Transcribing audio'
  if (plannerVoiceState.value === 'recording') return 'Stop recording'
  return 'Start voice input'
})

const voiceReminderSummaryTitle = computed(() => {
  if (!voiceParsedIntent.value?.reminder) return ''
  return voiceParsedIntent.value?.meta?.appliedDefaultReminder ? 'Reminders (auto)' : 'Reminders from voice'
})

const voiceReminderSummaryLines = computed(() => {
  if (!setReminder.value || !voiceParsedIntent.value?.reminder) return []
  const lines = []
  const offsetDays = normalizeReminderOffsetDays(reminderOffsetDays.value, { fallback: null })
  if (offsetDays && offsetDays > 0) {
    lines.push(`${offsetDays} day${offsetDays === 1 ? '' : 's'} before`)
  }
  if (includeOnDue.value) {
    lines.push('On due date')
  }
  return lines
})

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

function openAttachmentPicker() {
  if (!imageTasksEnabled) return
  try {
    attachmentInput.value?.click?.()
  } catch {
    /* noop */
  }
}

function isPdf(file) {
  return String(file?.mime || '')
    .toLowerCase()
    .includes('pdf')
}

function removeAttachment(index) {
  attachments.value = attachments.value.filter((_, idx) => idx !== index)
}

async function onAttachmentChange(event) {
  if (!imageTasksEnabled) return
  const file = event?.target?.files?.[0]
  if (!file) return
  generationMode.value = 'imageUploading'
  const mime = file.type || ''
  if (allowedAttachmentTypes.length && !allowedAttachmentTypes.includes(mime)) {
    ElMessage.error('Unsupported file type. Use PNG, JPG, or PDF.')
    if (event?.target) event.target.value = ''
    return
  }
  attachmentUploading.value = true
  visionStatus.value = 'Analyzing image…'
  try {
    const uploadImageForVision = await getVisionUploader()
    const { imageUrl, path } = await uploadImageForVision(file)
    attachments.value = [
      {
        type: 'image',
        url: imageUrl,
        mime,
        path,
        name: file.name || 'attachment',
      },
    ]
    generationMode.value = 'imageAnalyzing'
    // Auto-trigger generation from image so the user sees a preview without extra clicks
    await generateTasks({ origin: 'auto-vision' })
  } catch (err) {
    console.error('Attachment upload failed', err)
    ElMessage.error('Upload failed. You can still plan with text.')
    generationMode.value = 'idle'
  } finally {
    attachmentUploading.value = false
    visionStatus.value = ''
    if (event?.target) event.target.value = ''
  }
}

/* ---------------- Screen Size Reactive ---------------- */
const screenWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
let resizeHandler = null
onMounted(() => {
  if (typeof window !== 'undefined') {
    resizeHandler = () => (screenWidth.value = window.innerWidth)
    window.addEventListener('resize', resizeHandler)
  }
})
onBeforeUnmount(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
})
const dialogWidth = computed(() => (screenWidth.value < 768 ? '92vw' : '520px'))
const isMobile = computed(() => screenWidth.value < 768)
const textareaRows = computed(() => (isMobile.value ? 2 : 3))

const draftSaving = ref(false)
async function saveDraftToNapkin() {
  const text = getInputText().trim()
  if (!text) return
  draftSaving.value = true
  try {
    await createNapkinItem({ text, source: 'draft' })
    ElMessage.success('Saved. You can find this in Napkin.')
  } catch (err) {
    console.warn('Save draft to Napkin failed', err)
    ElMessage.error('Could not save draft. Try again.')
  } finally {
    draftSaving.value = false
  }
}

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
  },
)
watch(
  () => props.date,
  (val) => {
    logTimeBrainDialog('date-prop-change', { value: val })
    if (task.value && props.lockDate) return
    selectedDate.value = normalizeDateInput(val)
  },
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
  { immediate: true },
)
watch(selectedDate, (val) => {
  logTimeBrainDialog('selected-date-change', { value: val })
  if (props.lockDate && props?.task?.date && val !== props.task.date)
    selectedDate.value = props.task.date
  if (!repeatWeekendCoercionGuard && repeatEnabled.value && repeatType.value === 'weekend' && !props.lockDate) {
    syncSelectedDateToWeekend(val)
  }
  if (!reminderAutofillGuard) {
    reminderAbsoluteIso.value = null
  }
})
watch(
  [repeatEnabled, repeatType],
  ([enabled, type], [previousEnabled, previousType]) => {
    if (!enabled || type !== 'weekend') return
    if (!previousEnabled || previousType !== 'weekend' || !isWeekendDate(selectedDate.value)) {
      syncSelectedDateToWeekend()
    }
  },
)
watch(reminderTime, (val) => {
  logTimeBrainDialog('reminder-time-change', { value: val, lock: props.disableReminder })
  if (props.disableReminder && props.task?.reminderTime && val !== props.task.reminderTime)
    reminderTime.value = props.task.reminderTime
  if (!reminderAutofillGuard) {
    reminderAbsoluteIso.value = null
  }
})
watch(setReminder, (enabled) => {
  logTimeBrainDialog('set-reminder-toggle', { enabled })
  const defaults = DEFAULT_REMINDER_CHANNELS.filter((ch) => channelOptionIds.includes(ch))
  if (enabled && !allowedReminderChannels.value.length) allowedReminderChannels.value = defaults
  if (!enabled && allowedReminderChannels.value.length) allowedReminderChannels.value = []
  reminderPrefs.value = {
    ...reminderPrefs.value,
    enabled,
  }
  if (!enabled) {
    reminderAbsoluteIso.value = null
  }
})
watch(allowedReminderChannels, (channels) => {
  logTimeBrainDialog('channel-change', { channels })
  const normalized = Array.from(
    new Set(
      channels
        .map((ch) => String(ch || '').toLowerCase())
        .filter((ch) => channelOptionIds.includes(ch)),
    ),
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
  reminderOffsetDays.value = 0
  includeOnDue.value = true
  if (!props.lockDate) selectedDate.value = normalizeDateInput(props.date)
  setReminder.value = !!reminderPrefs.value.enabled
  reminderOptionsVisible.value = false
  repeatEnabled.value = false
  repeatType.value = 'daily'
  repeatIntervalDays.value = 30
  voiceParsedIntent.value = null
  plannerVoiceReset.value += 1
  plannerVoiceState.value = 'idle'
  if (!allowedReminderChannels.value.length && reminderPrefs.value.channels.length) {
    allowedReminderChannels.value = reminderPrefs.value.channels.filter((ch) =>
      channelOptionIds.includes(ch),
    )
  }
  attachments.value = []
  pendingGeneratedTasks.value = []
  visionStatus.value = ''
  generationMode.value = 'idle'
}

function hydrateFromTask(current) {
  logTimeBrainDialog('hydrate-task', { id: current?.id, title: current?.title })
  assignText(input, current.title || '')
  assignText(details, current.details || '')
  assignText(link, current.link || '')
  reminderManuallyEdited.value = false
  plannerVoiceReset.value += 1
  plannerVoiceState.value = 'idle'
  detailsVoiceReset.value += 1

  if (current.date) selectedDate.value = normalizeDateInput(current.date)
  const repeatRule = normalizeTaskRepeat(current.repeat)
  repeatEnabled.value = !!repeatRule
  repeatType.value = repeatRule?.type || 'daily'
  repeatIntervalDays.value = repeatRule?.intervalDays || 30
  reminderOffsetDays.value = normalizeReminderOffsetDays(current.reminderOffsetDays, { fallback: 0 }) || 0
  const reminderConfig = normalizeReminderConfig(current.reminder, null)
  includeOnDue.value = reminderConfig?.includeOnDue !== false
  if (reminderConfig && reminderConfig.offsetDays && reminderOffsetDays.value <= 0) {
    reminderOffsetDays.value = reminderConfig.offsetDays
  }
  voiceParsedIntent.value = null
  let reminderHydrated = false
  if (current.scheduledTime) {
    reminderHydrated = applyReminderIso(current.scheduledTime, {
      allowDateChange: false,
      timezoneOverride: current.timezone,
    })
  }
  attachments.value = Array.isArray(current.attachments) ? current.attachments : []
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
    allowedReminderChannels.value = existingChannels.filter((ch) => channelOptionIds.includes(ch))
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

    const toJSDate = (v) => {
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

    const scheduled = items.filter(
      (i) => String(i.status).toLowerCase() === 'scheduled' && !i.sentAt,
    )
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
  let tz =
    typeof tzCandidate === 'string' && tzCandidate.includes('/')
      ? tzCandidate
      : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return toUtcIso(String(ymd || ''), String(hhmm || '00:00'), tz)
}

function applyReminderIso(isoInput, options = {}) {
  const { allowDateChange = !props.lockDate, timezoneOverride } = options
  if (!isoInput) return false
  try {
    const tzCandidate = timezoneOverride || getUserTimezone()
    const tz =
      typeof tzCandidate === 'string' && tzCandidate.includes('/')
        ? tzCandidate
        : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const sourceValue = (() => {
      if (!isoInput && isoInput !== 0) return null
      if (typeof isoInput?.toDate === 'function') {
        try {
          return isoInput.toDate()
        } catch {
          return null
        }
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
    } catch {
      /* noop */
    }
  }

  if (task?.reminderTime && dateKey) {
    const iso = toLocalDateTimeIso(normalizeDateInput(dateKey), task.reminderTime, zone)
    if (iso) return iso
  }

  if (task?.scheduledTime) {
    try {
      const parsed = dayjs(task.scheduledTime).tz(zone)
      if (parsed.isValid()) return parsed.format('YYYY-MM-DDTHH:mm:ssZ')
    } catch {
      /* noop */
    }
  }

  return null
}

function collectContextTasks(dateStr, tz) {
  const normalizedDate = normalizeDateInput(dateStr)
  return tasks.value
    .filter((t) => normalizeDateInput(t?.date || normalizedDate) === normalizedDate)
    .map((t) => {
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
    .map((t) => (t.ends_at ? { ...t, ends_at: dayjs(t.ends_at).tz(t.timezone || tz) } : null))
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
    const tz =
      typeof tzCandidate === 'string' && tzCandidate.includes('/')
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
      planDateKey === todayKey ? now : dayjs.tz(`${planDateKey}T12:00:00`, tz).toDate()

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

  const candidateList = [displayTitle, baseTitle, rawPhrase]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)

  let chosen = candidateList[0] || ''

  if (chosen.split(/\s+/).length <= 1) {
    const alt = candidateList.find((v) => v.split(/\s+/).length > 1)
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
  const hasAttachments = hasAttachmentsComputed.value
  if (!currentInput.trim() && !hasAttachments) return
  loading.value = true
  generationMode.value = hasAttachments ? 'imageAnalyzing' : 'textGenerating'
  const attachmentPayload = hasAttachments
    ? attachments.value
        .map((file) => ({
          type: 'image',
          url: file?.url,
          mime: file?.mime,
          name: file?.name,
          path: file?.path,
        }))
        .filter((file) => file.url)
    : []
  if (hasAttachments) {
    visionStatus.value = 'Analyzing image…'
  }

  const tzCandidate = getUserTimezone()
  const tz =
    typeof tzCandidate === 'string' && tzCandidate.includes('/')
      ? tzCandidate
      : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const contextTasks = collectContextTasks(selectedDate.value, tz)
  const lastTaskEnd = computeLastTaskEndIso(contextTasks, tz)

  try {
    if (!activeWorkspaceId.value) {
      try {
        await workspaceStore.init()
      } catch {
        /* noop */
      }
    }
    const workspaceId = activeWorkspaceId.value
    if (!workspaceId) {
      ElNotification({
        title: 'Workspace Not Ready',
        message: 'Please wait a moment and try again.',
        type: 'warning',
        duration: 2500,
      })
      return
    }

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
      attachments: attachmentPayload,
      workspaceId,
      reminderTime: reminderTime.value || null,
    })

    const contextBundle = result?.context
      ? { context: result.context, serialized: result.contextSerialized }
      : null

    const revalidationMap = new Map(
      (result?.revalidation || []).map((entry) => [entry.task.sourceIndex, entry]),
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
          scheduledUtc = coerceFutureReminderIso(localMoment.utc().toISOString(), { timezoneOverride: tz })
          const scheduledMoment = dayjs.utc(scheduledUtc).tz(tz)
          if (!autoPlanDate) autoPlanDate = scheduledMoment.format('YYYY-MM-DD')
          if (!autoReminderTime) autoReminderTime = scheduledMoment.format('HH:mm')
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
        message: hasAttachments
          ? 'No clear actions — add manually?'
          : 'Try adding more detail or different phrasing.',
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

    const prepared = refined.map((task, idx) => {
      const perTaskAttachments =
        Array.isArray(task.attachments) && task.attachments.length
          ? task.attachments
          : attachmentPayload
      const metadata =
        perTaskAttachments.length && (task.metadata || task.metaData)
          ? { ...(task.metadata || task.metaData), attachmentUrl: perTaskAttachments[0]?.url }
          : perTaskAttachments.length
            ? { attachmentUrl: perTaskAttachments[0]?.url }
            : task.metadata || null

      const preparedTask = {
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
        source: task.source || (hasAttachments ? 'image' : 'text'),
        meta: {
          ...task.meta,
          finalTitle: task.finalTitle,
          rawPhrase: task.rawPhrase,
          displayTitle: task.displayTitle,
        },
      }

      if (perTaskAttachments.length) {
        preparedTask.attachments = perTaskAttachments
      }
      if (metadata && Object.keys(metadata || {}).length) {
        preparedTask.metadata = metadata
      }
      return preparedTask
    })

    if (hasAttachments) {
      pendingGeneratedTasks.value = prepared
      ElNotification({
        title: 'Review tasks',
        message: 'Review the generated tasks below, then save.',
        type: 'info',
        duration: 2200,
      })
      return
    }

    await persistPreparedTasks(prepared)
  } catch (err) {
    console.error('Generate failed', err)
    ElNotification({ title: 'Error', message: 'Task generation failed', type: 'error' })
  } finally {
    loading.value = false
    visionStatus.value = ''
    if (pendingGeneratedTasks.value.length) {
      generationMode.value = 'preview'
    } else {
      generationMode.value = 'idle'
    }
  }
}

async function persistPreparedTasks(prepared = []) {
  if (!prepared.length) return []
  const baseOrder = tasks.value.length
  logTimeBrainDialog('generate:persist:start', { count: prepared.length })
  const saved = await Promise.all(
    prepared.map(async (task, idx) => {
      const payload = {
        ...task,
        date: selectedDate.value,
        order: baseOrder + idx,
        completed: false,
      }
      if (!payload.attachments || !payload.attachments.length) delete payload.attachments
      if (payload.metadata && !Object.keys(payload.metadata || {}).length) delete payload.metadata
      return await addTaskToFirebase(payload, { awaitNotificationSync: false })
    }),
  )

  logTimeBrainDialog('generate:persist:completed', { saved: saved.length })
  ElNotification({
    title: 'Success',
    message: `${saved.length} task${saved.length > 1 ? 's' : ''} created`,
    type: 'success',
    duration: 2500,
  })
  emit('saved', saved)
  logTimeBrainDialog('generate:completed', { saved: saved.length })
  pendingGeneratedTasks.value = []
  attachments.value = []
  if (!notifPromptOpen.value) closeDialog()
  generationMode.value = 'idle'
  return saved
}

async function confirmGeneratedTasks() {
  if (!pendingGeneratedTasks.value.length) return
  loading.value = true
  try {
    await persistPreparedTasks(pendingGeneratedTasks.value)
  } catch (err) {
    console.error('Failed to save generated tasks', err)
    ElNotification({ title: 'Error', message: 'Could not save generated tasks', type: 'error' })
  } finally {
    loading.value = false
  }
}

function clearGeneratedPreview() {
  pendingGeneratedTasks.value = []
  generationMode.value = 'idle'
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

  let dateToSave = props.lockDate && props.task?.date ? props.task.date : selectedDate.value
  const repeatToSave = repeatEnabled.value
    ? normalizeTaskRepeat({ type: repeatType.value, intervalDays: repeatIntervalDays.value })
    : null
  if (repeatEnabled.value && !repeatToSave) {
    ElMessage({
      type: 'warning',
      message: 'Choose a valid repeat schedule before saving.',
      duration: 3500,
    })
    return
  }
  if (repeatToSave?.type === 'weekend' && !isWeekendDate(dateToSave)) {
    if (props.lockDate) {
      ElMessage({
        type: 'warning',
        message: 'Weekend repeats need a Saturday or Sunday date.',
        duration: 3500,
      })
      return
    }
    dateToSave = alignDateToWeekend(dateToSave)
    selectedDate.value = dateToSave
  }
  let reminderToSave = null
  let reminderOffsetToSave = null
  let reminderConfigToSave = null
  if (props.disableReminder) {
    reminderToSave = props.task?.reminderTime ?? null
    reminderOffsetToSave = normalizeReminderOffsetDays(props.task?.reminderOffsetDays, { fallback: null })
    reminderConfigToSave = normalizeReminderConfig(props.task?.reminder, null)
  } else if (setReminder.value) {
    reminderToSave = reminderTime.value || null
    reminderOffsetToSave = normalizeReminderOffsetDays(reminderOffsetDays.value, { fallback: 0 })
    reminderConfigToSave = buildReminderConfig({
      includeOnDue: includeOnDue.value,
      offsetDays: reminderOffsetToSave,
    })
  }

  const tzCandidate = getUserTimezone()
  const reminderTimezone =
    typeof tzCandidate === 'string' && tzCandidate.includes('/')
      ? tzCandidate
      : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const baseIso = reminderToSave
    ? computeReminderScheduleIso({
        date: dateToSave,
        reminderTime: reminderToSave,
        timezone: reminderTimezone,
        reminderOffsetDays: reminderOffsetToSave || 0,
      }) || buildLocalIso(dateToSave, reminderToSave)
    : null
  const scheduledIso = baseIso
    ? enforceFutureReminder(baseIso, { allowDateChange: !props.lockDate })
    : null

  const channelsToSave = setReminder.value ? computeReminderChannels() : []

  const safeTitle = getInputText() || props.task?.title || 'Untitled Task'

  emit('saved', {
    ...props.task,
    title: safeTitle,
    details: details.value,
    date: dateToSave,
    reminderTime: reminderToSave,
    reminderOffsetDays: reminderOffsetToSave,
    ...(reminderConfigToSave !== null || (props.task && 'reminder' in props.task)
      ? { reminder: reminderConfigToSave }
      : {}),
    scheduledTime: scheduledIso,
    reminderChannels: channelsToSave,
    channels: channelsToSave,
    repeat: repeatToSave,
    attachments: attachments.value.length ? attachments.value : props.task?.attachments,
  })
  ElNotification({ title: 'Success', message: 'Task saved', type: 'success' })
  closeDialog()
}

function enforceFutureReminder(iso, { allowDateChange = true } = {}) {
  if (!iso) return null
  try {
    const tzCandidate = getUserTimezone()
    const tz =
      typeof tzCandidate === 'string' && tzCandidate.includes('/')
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

function coerceFutureReminderIso(isoInput, { timezoneOverride } = {}) {
  if (!isoInput) return null
  try {
    const tzCandidate = timezoneOverride || getUserTimezone()
    const tz =
      typeof tzCandidate === 'string' && tzCandidate.includes('/')
        ? tzCandidate
        : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

    const local = dayjs(isoInput).tz(tz)
    if (!local.isValid()) return isoInput

    const minFuture = dayjs().tz(tz).add(2, 'minute')
    if (local.isBefore(minFuture)) {
      return minFuture.utc().toISOString()
    }
    return local.utc().toISOString()
  } catch {
    return isoInput
  }
}

/* ---------------- Close ---------------- */
function closeDialog() {
  logTimeBrainDialog('close-dialog', { inputLength: getInputText().length })
  pendingGeneratedTasks.value = []
  visionStatus.value = ''
  plannerVoiceState.value = 'idle'
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
    const instantActive = Array.from(current).filter((ch) => CREATION_CHANNELS.includes(ch)).length
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

function extractTranscriptText(result = {}) {
  const rawValue =
    typeof result === 'string'
      ? result.trim()
      : typeof result?.text === 'string'
        ? result.text.trim()
        : ''
  return rawValue.replace(/[^\p{L}\p{N}\s]+/gu, '').trim() ? rawValue : ''
}

async function resolveVoiceTaskIntent(rawValue) {
  const parsed = parseVoiceTaskIntent(rawValue, { now: new Date() })
  const needsAiFallback = !parsed?.repeat && !parsed?.meta?.hasClearTitle
  if (!needsAiFallback) return parsed

  try {
    const tzCandidate = getUserTimezone()
    const tz =
      typeof tzCandidate === 'string' && tzCandidate.includes('/')
        ? tzCandidate
        : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const result = await generateTasksFromText(rawValue, {
      planDate: selectedDate.value,
      timezone: tz,
      maxItems: 1,
      debugLabel: 'TaskPlannerDialog:voice-parser-fallback',
      reminderTime: reminderTime.value || null,
    })
    const first = Array.isArray(result?.items) ? result.items[0] : null
    const aiTitle = coerceText(first?.displayTitle || first?.title, '').trim()
    if (!aiTitle) return parsed
    return {
      ...parsed,
      title: enrichTitle({
        title: aiTitle,
        rawPhrase: rawValue,
        displayTitle: coerceText(first?.displayTitle, aiTitle),
      }),
      confidence: 'low',
      meta: {
        ...parsed.meta,
        hasClearTitle: true,
        usedAiFallback: true,
      },
    }
  } catch (err) {
    console.warn('[TaskPlannerDialog] voice parser fallback failed', err?.message || err)
    return parsed
  }
}

function applyParsedTask(parsed, rawValue) {
  const safeParsed = parsed && typeof parsed === 'object' ? parsed : null
  const nextTranscript = coerceText(rawValue, '').trim()
  const nextTitle = safeParsed?.meta?.hasClearTitle ? safeParsed.title : nextTranscript

  // Keep the full spoken sentence visible in the planner field.
  // Parsed intent still drives date/repeat/reminder autofill below.
  assignText(input, nextTranscript || nextTitle)

  if (safeParsed?.dueDate && !props.lockDate) {
    selectedDate.value = normalizeDateInput(safeParsed.dueDate)
  }

  if (safeParsed?.repeat) {
    repeatEnabled.value = true
    repeatType.value = safeParsed.repeat.type || 'daily'
    repeatIntervalDays.value = safeParsed.repeat.intervalDays || 30
  }

  if (!props.disableReminder && safeParsed?.reminder) {
    setReminder.value = true
    reminderOptionsVisible.value = true
    includeOnDue.value = safeParsed.reminder.includeOnDue !== false
    if (Number.isFinite(safeParsed.reminder.offsetDays)) {
      reminderOffsetDays.value =
        normalizeReminderOffsetDays(safeParsed.reminder.offsetDays, { fallback: 0 }) || 0
    } else if (safeParsed?.meta?.explicitDueDayOnly) {
      reminderOffsetDays.value = 0
    }
  } else if (!safeParsed?.reminder) {
    includeOnDue.value = true
  }

  voiceParsedIntent.value = safeParsed?.reminder ? safeParsed : null
}

async function handleTranscript(result = {}) {
  const rawValue = extractTranscriptText(result)
  if (!rawValue) return
  const parsed = await resolveVoiceTaskIntent(rawValue)
  applyParsedTask(parsed, rawValue)
  console.log('Parsed task intent:', parsed)
  logTimeBrainDialog('transcription:title', {
    length: rawValue.length,
    repeat: parsed?.repeat?.type || null,
    hasReminder: !!parsed?.reminder,
    confidence: parsed?.confidence || 'low',
    usedAiFallback: !!parsed?.meta?.usedAiFallback,
  })
  plannerVoiceReset.value += 1
}

function onPlannerVoiceStateChange(nextState) {
  plannerVoiceState.value = typeof nextState === 'string' ? nextState : 'idle'
}

function appendDetails(result = {}) {
  const value = extractTranscriptText(result)
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
  gap: 1.1rem;
  flex: 1 1 auto;
  min-height: 0;
}

.planner-card {
  padding: 1.15rem;
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
  color: rgba(148, 163, 184, 0.65);
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
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
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
  column-gap: 1rem;
  row-gap: 1.1rem;
  margin-bottom: 0.5rem;
}

.field-label {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.35rem;
  color: rgba(226, 232, 240, 0.8);
}

.field-help {
  margin: 0.45rem 0 0;
  font-size: 0.8rem;
  color: rgba(148, 163, 184, 0.78);
}

.quick-repeat-block {
  margin-top: 0.75rem;
}

.repeat-preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.repeat-preset {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  padding: 0.5rem 0.85rem;
  background: rgba(15, 23, 42, 0.42);
  color: rgba(226, 232, 240, 0.9);
  font-size: 0.83rem;
  font-weight: 600;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.repeat-preset:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(129, 140, 248, 0.55);
  color: #f8fafc;
}

.repeat-preset--active {
  border-color: rgba(129, 140, 248, 0.9);
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.35), rgba(14, 165, 233, 0.22));
  color: #f8fafc;
  box-shadow: inset 0 0 0 1px rgba(129, 140, 248, 0.22);
}

.repeat-preset:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.repeat-custom-inline {
  margin-top: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.repeat-custom-inline .field-label {
  margin: 0;
}

.repeat-custom-inline :deep(.planner-dark-number) {
  max-width: 180px;
}

.repeat-custom-inline__suffix {
  font-size: 0.84rem;
  color: rgba(226, 232, 240, 0.78);
}

.repeat-inline-help {
  margin-top: 0.65rem;
}

/* assistive bar */
.assistive-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.assistive-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.65rem;
}

.icon-btn {
  width: 52px;
  height: 52px;
  padding: 0;
  border-radius: 999px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: radial-gradient(
    circle at 30% 30%,
    rgba(255, 255, 255, 0.06),
    rgba(255, 255, 255, 0.02)
  );
  color: #f8fafc;
}

.mic-btn {
  border: none;
  padding: 0;
  background: transparent;
  position: relative;
  overflow: visible;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.mic-btn--active {
  box-shadow:
    0 0 0 6px rgba(79, 70, 229, 0.12),
    0 10px 25px rgba(14, 165, 233, 0.2);
}

.mic-btn--processing {
  box-shadow:
    0 0 0 7px rgba(129, 140, 248, 0.16),
    0 14px 30px rgba(59, 130, 246, 0.28);
}

.mic-btn:focus-visible {
  outline: 2px solid rgba(125, 211, 252, 0.8);
  outline-offset: 2px;
}

.task-textarea :deep(textarea.el-textarea__inner) {
  padding-top: 1rem;
  padding-bottom: 1rem;
  border-color: rgba(255, 255, 255, 0.12);
}

.mic-btn :deep(.voice-controller) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: auto;
}

.mic-visual {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(79, 70, 229, 0.35), rgba(14, 165, 233, 0.15));
  box-shadow: 0 6px 18px rgba(14, 165, 233, 0.2);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
  pointer-events: none;
}

.mic-visual::before {
  content: '';
  width: 20px;
  height: 20px;
  background: linear-gradient(180deg, #f8fafc, #c7d2fe);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a1 1 0 1 0-2 0 3 3 0 1 1-6 0 1 1 0 1 0-2 0 5 5 0 0 0 4 4.9V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.1A5 5 0 0 0 17 11Z'/%3E%3C/svg%3E")
    center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a1 1 0 1 0-2 0 3 3 0 1 1-6 0 1 1 0 1 0-2 0 5 5 0 0 0 4 4.9V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.1A5 5 0 0 0 17 11Z'/%3E%3C/svg%3E")
    center / contain no-repeat;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.mic-btn :deep(.voice-controller--recording) ~ .mic-visual {
  animation: mic-pulse 1.1s ease-in-out infinite;
  box-shadow:
    0 0 0 8px rgba(79, 70, 229, 0.18),
    0 12px 28px rgba(14, 165, 233, 0.3);
  transform: scale(1.05);
  border: 1px solid rgba(125, 211, 252, 0.9);
}

.mic-btn :deep(.voice-controller--recording) ~ .mic-visual::before {
  background: linear-gradient(180deg, #fee2e2, #fda4af);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 7h2.75v10H9V7Zm4.25 0H16v10h-2.75V7Z'/%3E%3C/svg%3E")
    center / 17px 17px no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 7h2.75v10H9V7Zm4.25 0H16v10h-2.75V7Z'/%3E%3C/svg%3E")
    center / 17px 17px no-repeat;
  animation: mic-icon-breathe 0.95s ease-in-out infinite;
}

.mic-btn :deep(.voice-controller--transcribing) ~ .mic-visual {
  animation: mic-processing 0.95s ease-in-out infinite;
  box-shadow:
    0 0 0 8px rgba(99, 102, 241, 0.2),
    0 12px 28px rgba(59, 130, 246, 0.3);
  border: 1px solid rgba(165, 180, 252, 0.95);
}

.mic-btn :deep(.voice-controller--transcribing) ~ .mic-visual::before {
  background: linear-gradient(180deg, #e0e7ff, #a5b4fc);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 12 6v2.2l3.4-3.2L12 1.8V4Z'/%3E%3C/svg%3E")
    center / 18px 18px no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 12 6v2.2l3.4-3.2L12 1.8V4Z'/%3E%3C/svg%3E")
    center / 18px 18px no-repeat;
  animation: mic-icon-spin 0.9s linear infinite;
}

@keyframes mic-pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.25);
  }
  50% {
    transform: scale(1.03);
    box-shadow: 0 0 0 8px rgba(79, 70, 229, 0.08);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.02);
  }
}

@keyframes mic-processing {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.35);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(99, 102, 241, 0.08);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.02);
  }
}

@keyframes mic-icon-breathe {
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
}

@keyframes mic-icon-spin {
  to {
    transform: rotate(360deg);
  }
}

.planner-voice :deep(.voice-controller) {
  width: 100%;
}

.voice-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 32px;
}

.voice-icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 30%, rgba(79, 70, 229, 0.45), rgba(14, 165, 233, 0.25));
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.02);
}

.voice-title {
  font-weight: 600;
  color: #e2e8f0;
}

.voice-hint {
  margin-left: auto;
  font-size: 0.78rem;
  color: rgba(148, 163, 184, 0.8);
}

.generate-btn {
  min-width: 180px;
  border-radius: 0.75rem;
  font-weight: 600;
  box-shadow: 0 15px 35px rgba(79, 70, 229, 0.35);
  background: linear-gradient(120deg, #7c3aed, #0ea5e9);
  border: none;
  color: #fdf4ff;
  height: 44px;
  padding: 0 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.generate-btn:disabled {
  opacity: 0.75;
  background: linear-gradient(120deg, #4b5563, #475569);
  color: #e2e8f0;
  box-shadow: none;
  cursor: not-allowed;
}

.generate-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 38px rgba(79, 70, 229, 0.45);
}

.generate-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.generate-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
}

.generate-text {
  white-space: nowrap;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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

.repeat-grid--offset {
  margin-top: 0.9rem;
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

.reminder-auto-summary {
  margin-top: 0.85rem;
  padding: 0.8rem 0.9rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(129, 140, 248, 0.28);
  background: rgba(49, 46, 129, 0.28);
}

.reminder-auto-summary__title {
  margin: 0 0 0.45rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #c7d2fe;
}

.reminder-auto-summary__items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.reminder-auto-summary__item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.35);
  color: #e0e7ff;
  font-size: 0.78rem;
  font-weight: 600;
}

.reminder-collapse-enter-active,
.reminder-collapse-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
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

/* Attachment & voice polish */
.attachment-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.attachment-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.attachment-labels {
  display: flex;
  flex-direction: column;
}

.attachment-subtext {
  margin: 0;
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.75);
}

.attachment-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.attach-btn {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.attach-svg {
  display: inline-flex;
  width: 18px;
  height: 18px;
  color: #fff;
}

.attach-icon {
  margin-right: 6px;
}

.attachment-status {
  font-size: 0.9rem;
  color: rgba(148, 163, 184, 0.9);
}

.attachment-previews {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.attachment-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.85rem;
  background: rgba(255, 255, 255, 0.04);
}

.attachment-card.compact {
  grid-template-columns: 44px 1fr auto;
}

.attachment-thumb-wrap {
  width: 44px;
  height: 44px;
  border-radius: 0.65rem;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  display: grid;
  place-items: center;
}

.attachment-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attachment-thumb--pdf {
  font-size: 1.2rem;
}

.attachment-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.attachment-name {
  margin: 0;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-source {
  margin: 0;
  font-size: 0.82rem;
  color: rgba(148, 163, 184, 0.8);
}

.attachment-remove {
  border: none;
  background: transparent;
  color: #93c5fd;
  font-weight: 600;
  cursor: pointer;
}

.attachment-remove:hover {
  color: #bfdbfe;
}

/* Mobile-only tweaks for generate button */
@media (max-width: 640px) {
  .planner-card {
    padding: 0.85rem;
  }
  .assistive-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.65rem;
  }
  .assistive-actions {
    gap: 0.6rem;
    flex-shrink: 0;
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }
  .icon-btn {
    width: 40px;
    height: 40px;
  }
  .generate-btn {
    min-width: 0;
    height: 40px;
    padding: 0 12px;
    font-size: 0.9rem;
    background: linear-gradient(120deg, #6d28d9, #0284c7);
    box-shadow: 0 8px 16px rgba(79, 70, 229, 0.22);
    width: 100%;
  }
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
  --planner-mobile-top-gap: max(
    calc(var(--safe-area-top, env(safe-area-inset-top, 0px)) + 0.85rem),
    2rem
  );
  --planner-mobile-bottom-gap: calc(
    var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + 0.85rem
  );
  background: linear-gradient(145deg, #1e1b4b, #312e81, #4c1d95);
  color: #e2e8f0;
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
  max-height: calc(100vh - 64px);
  max-height: calc(100dvh - 64px);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
/* Title */
.task-planner-dialog .el-dialog__header {
  flex: 0 0 auto;
  flex-shrink: 0;
  margin: 0;
  padding: 1.1rem 4.25rem 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  font-weight: 600;
  .el-dialog__title {
    color: #f1f5f9 !important;
  }
}

:deep(.task-planner-dialog .el-dialog__title) {
  display: block;
  color: #f1f5f9 !important;
  font-size: clamp(1.55rem, 4vw, 2.25rem);
  line-height: 1.15;
  overflow-wrap: anywhere;
  padding-right: 0.25rem;
}

:deep(.task-planner-dialog .el-dialog__headerbtn) {
  top: 1rem;
  right: 1rem;
  width: 2.75rem;
  height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.14);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

:deep(.task-planner-dialog .el-dialog__headerbtn:hover) {
  background: rgba(129, 140, 248, 0.22);
  border-color: rgba(255, 255, 255, 0.24);
  transform: translateY(-1px);
}

:deep(.task-planner-dialog .el-dialog__headerbtn .el-dialog__close) {
  color: #f8fafc;
  font-size: 1.1rem;
}

/* Inputs */
.task-planner-dialog .el-input__inner,
.task-planner-dialog .el-textarea__inner {
  background-color: rgba(255, 255, 255, 0.1); /* semi-transparent */
  color: #f8fafc;
}

.task-planner-dialog .el-input__inner::placeholder,
.task-planner-dialog .el-textarea__inner::placeholder {
  color: #cbd5e1; /* light slate */
}

:deep(.task-planner-dialog .el-input__wrapper),
:deep(.task-planner-dialog .el-select__wrapper) {
  background: rgba(15, 23, 42, 0.42) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03) !important;
  border-radius: 0.85rem !important;
  min-height: 44px;
}

:deep(.task-planner-dialog .el-input__wrapper:hover),
:deep(.task-planner-dialog .el-select__wrapper:hover) {
  border-color: rgba(129, 140, 248, 0.4) !important;
}

:deep(.task-planner-dialog .el-input__wrapper.is-focus),
:deep(.task-planner-dialog .el-select__wrapper.is-focused) {
  border-color: rgba(129, 140, 248, 0.68) !important;
  box-shadow:
    inset 0 0 0 1px rgba(129, 140, 248, 0.2),
    0 0 0 3px rgba(99, 102, 241, 0.14) !important;
}

:deep(.task-planner-dialog .el-select__selected-item),
:deep(.task-planner-dialog .el-select__placeholder),
:deep(.task-planner-dialog .el-select__caret),
:deep(.task-planner-dialog .el-input-number .el-input__inner) {
  color: #f8fafc !important;
}

:deep(.task-planner-dialog .el-input-number) {
  width: 100%;
}

:deep(.task-planner-dialog .el-input-number .el-input__wrapper) {
  background: rgba(79, 70, 229, 0.16) !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03) !important;
}

:deep(.task-planner-dialog .el-input-number__decrease),
:deep(.task-planner-dialog .el-input-number__increase) {
  background: rgba(15, 23, 42, 0.42) !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
  color: #cbd5e1 !important;
}

:deep(.task-planner-dialog .el-input-number__decrease:hover),
:deep(.task-planner-dialog .el-input-number__increase:hover) {
  background: rgba(79, 70, 229, 0.28) !important;
  color: #f8fafc !important;
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
  flex: 0 0 auto;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
}
.task-planner-dialog .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 180px);
  max-height: calc(100dvh - 180px);
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

@media (max-width: 640px) {
  .planner-overlay {
    align-items: flex-start;
    padding-top: 1rem;
    padding-right: 0.85rem;
    padding-bottom: calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + 0.85rem);
    padding-left: 0.85rem;
  }

  .planner-overlay .el-overlay-dialog {
    align-items: flex-start;
  }

  .task-planner-dialog .el-dialog {
    width: min(100%, 560px);
    top: auto !important;
    margin: 0 auto !important;
    margin-top: var(--planner-mobile-top-gap) !important;
    max-height: calc(100dvh - var(--planner-mobile-top-gap) - var(--planner-mobile-bottom-gap));
    border-radius: 1rem;
    padding: 0.85rem;
  }

  .task-planner-dialog .el-dialog__header {
    padding: 1.1rem 4rem 0.75rem 1rem;
  }

  .task-planner-dialog .el-dialog__body {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    overflow-y: auto;
    overflow-x: hidden;
    padding-top: 0.85rem;
    padding-bottom: 0.25rem;
  }

  .task-planner-dialog .el-dialog__footer {
    padding-top: 0.75rem;
  }

  .planner-stack {
    gap: 0.9rem;
    padding-right: 0.15rem;
    padding-bottom: 0.35rem;
  }
}

/* Subtle scrollbar styling inside planner (keep scroll behavior, soften visuals) */
.task-planner-dialog .el-dialog__body::-webkit-scrollbar {
  width: 6px;
}
.task-planner-dialog .el-dialog__body::-webkit-scrollbar-track {
  background: transparent;
}
.task-planner-dialog .el-dialog__body::-webkit-scrollbar-thumb {
  background: rgba(248, 250, 252, 0.22); /* soft white */
  border-radius: 999px;
}
.task-planner-dialog .el-dialog__body {
  scrollbar-width: thin;
  scrollbar-color: rgba(248, 250, 252, 0.28) transparent;
}

 /* Mobile: safe-area offset, fixed header/footer, scrollable body */
@media (max-width: 768px) {
  .planner-overlay {
    align-items: flex-start;
    justify-content: center;
    padding-top: 1rem;
    padding-right: 0.85rem;
    padding-bottom: calc(var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)) + 0.85rem);
    padding-left: 0.85rem;
  }

  .task-planner-dialog .el-dialog {
    top: auto !important;
    display: flex;
    flex-direction: column;
    margin: 0 auto !important;
    margin-top: var(--planner-mobile-top-gap) !important;
    width: 92vw !important;
    max-width: 560px !important;
    max-height: calc(100dvh - var(--planner-mobile-top-gap) - var(--planner-mobile-bottom-gap));
  }
  .task-planner-dialog .el-dialog__header {
    flex-shrink: 0;
    padding: 1.1rem 4rem 0.75rem 1rem;
  }
  .task-planner-dialog .el-dialog__footer {
    flex-shrink: 0;
  }
  .task-planner-dialog .el-dialog__body {
    flex: 1 1 auto;
    min-height: 0;
    max-height: none;
    overflow-y: auto;
    overflow-x: hidden;
  }
  /* Reorder: task idea first, then date, then reminder */
  .task-planner-dialog .planner-stack--mobile-order {
    display: flex;
    flex-direction: column;
  }
  .task-planner-dialog .planner-stack--mobile-order .section-date {
    order: 2;
  }
  .task-planner-dialog .planner-stack--mobile-order .section-task {
    order: 1;
  }
  .task-planner-dialog .planner-stack--mobile-order .section-reminder {
    order: 3;
  }
  .task-planner-dialog .planner-stack--mobile-order .section-divider {
    order: 4;
  }
  .task-planner-dialog
    .planner-stack--mobile-order
    .planner-card:not(.section-date):not(.section-task):not(.section-reminder) {
    order: 5;
  }
  /* Tighter spacing on mobile */
  .task-planner-dialog .planner-card {
    padding: 0.75rem 1rem;
  }
  .task-planner-dialog .card-heading {
    margin-bottom: 0.5rem;
  }
  .task-planner-dialog .task-textarea textarea {
    min-height: 4rem;
  }

  :deep(.task-planner-dialog .el-dialog__title) {
    font-size: clamp(1.4rem, 5.8vw, 1.95rem);
  }

  :deep(.task-planner-dialog .el-dialog__headerbtn) {
    top: 0.95rem;
    right: 0.95rem;
    width: 2.5rem;
    height: 2.5rem;
  }
}

/* Hint above Generate Tasks */
.task-planner-dialog .datetime-hint {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 0.25rem 0 0.5rem;
  line-height: 1.3;
}

/* Save Draft: secondary action */
.task-planner-dialog .save-draft-btn {
  font-size: 0.75rem;
  padding: 0.35rem 0.6rem;
  border-color: rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.08);
}
.task-planner-dialog .save-draft-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.35);
  color: #f1f5f9;
}
.task-planner-dialog .save-draft-btn:disabled {
  opacity: 0.5;
}

.task-planner-dialog .planner-cancel-btn {
  border: 1px solid rgba(248, 113, 113, 0.45);
  background: linear-gradient(135deg, rgba(127, 29, 29, 0.9), rgba(153, 27, 27, 0.8));
  color: #fee2e2;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(127, 29, 29, 0.25);
}

.task-planner-dialog .planner-cancel-btn:hover {
  border-color: rgba(252, 165, 165, 0.7);
  background: linear-gradient(135deg, rgba(153, 27, 27, 0.96), rgba(185, 28, 28, 0.88));
  color: #fff1f2;
}

.task-planner-dialog .planner-mobile-cancel-btn {
  width: 100%;
  min-height: 2.85rem;
  border-radius: 0.9rem;
  font-size: 0.95rem;
}

.task-planner-dialog .planner-mobile-cancel-btn:hover {
  color: #fff1f2;
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
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
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

:deep(.task-planner-dialog .planner-dark-select),
:deep(.task-planner-dialog .planner-dark-number) {
  --el-bg-color: rgba(15, 23, 42, 0.42);
  --el-fill-color-blank: rgba(15, 23, 42, 0.42);
  --el-fill-color-light: rgba(15, 23, 42, 0.42);
  --el-fill-color: rgba(15, 23, 42, 0.42);
  --el-border-color: rgba(255, 255, 255, 0.14);
  --el-border-color-hover: rgba(129, 140, 248, 0.45);
  --el-color-primary: #818cf8;
  --el-text-color-regular: #f8fafc;
  --el-text-color-placeholder: rgba(203, 213, 225, 0.72);
}

:deep(.task-planner-dialog .planner-dark-select .el-select__wrapper),
:deep(.task-planner-dialog .planner-dark-number .el-input__wrapper) {
  background: rgba(15, 23, 42, 0.42) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03) !important;
  border-radius: 0.85rem !important;
}

:deep(.task-planner-dialog .planner-dark-select .el-select__wrapper:hover),
:deep(.task-planner-dialog .planner-dark-number .el-input__wrapper:hover),
:deep(.task-planner-dialog .planner-dark-number .el-input__wrapper.is-focus),
:deep(.task-planner-dialog .planner-dark-select .el-select__wrapper.is-focused) {
  background: rgba(30, 41, 59, 0.62) !important;
  border-color: rgba(129, 140, 248, 0.55) !important;
  box-shadow:
    inset 0 0 0 1px rgba(129, 140, 248, 0.16),
    0 0 0 3px rgba(99, 102, 241, 0.12) !important;
}

:deep(.task-planner-dialog .planner-dark-select .el-select__selected-item),
:deep(.task-planner-dialog .planner-dark-select .el-select__placeholder),
:deep(.task-planner-dialog .planner-dark-select .el-select__caret),
:deep(.task-planner-dialog .planner-dark-number .el-input__inner) {
  color: #f8fafc !important;
}

:deep(.task-planner-dialog .planner-dark-number) {
  width: 100%;
}

:deep(.task-planner-dialog .planner-dark-number .el-input-number__decrease),
:deep(.task-planner-dialog .planner-dark-number .el-input-number__increase) {
  background: rgba(30, 41, 59, 0.92) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: rgba(226, 232, 240, 0.82) !important;
}

:deep(.task-planner-dialog .planner-dark-number .el-input-number__decrease:hover),
:deep(.task-planner-dialog .planner-dark-number .el-input-number__increase:hover) {
  background: rgba(79, 70, 229, 0.34) !important;
  color: #f8fafc !important;
}

.attachment-block {
  margin-top: 0.5rem;
}
.attachment-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.attachment-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.attachment-status {
  font-size: 12px;
  color: #c7d2fe;
}
.attachment-previews {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.35rem;
}
.attachment-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
}
.attachment-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.attachment-chip__pdf {
  font-size: 12px;
  color: #e2e8f0;
}
.attachment-remove {
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  font-size: 12px;
  padding: 0.2rem 0.4rem;
}
.generated-preview {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.generated-preview__item {
  padding: 0.5rem 0.65rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.generated-preview__title {
  font-weight: 600;
  color: #ffffff;
}
.generated-preview__details {
  font-size: 12px;
  color: #cbd5e1;
}
.generated-preview__badge {
  font-size: 12px;
  color: #c7d2fe;
}
.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
</style>
