<template>
  <div class="talk-planner-wrapper">
    <header class="talk-header">
      <h2 class="talk-title">
        <span class="text-pink-400">🧠</span>
        Talk to Planner
      </h2>
      <div class="header-actions">
        <button
          type="button"
          class="voice-toggle"
          :class="{ active: isVoiceOn }"
          :aria-pressed="isVoiceOn"
          :title="isVoiceOn ? 'Mute voice responses' : 'Enable voice responses'"
          @click="toggleVoice"
        >
          <span v-if="voiceRequestingFor" class="loader loader--tiny" aria-hidden="true"></span>
          <template v-else>
            <svg
              v-if="isVoiceOn"
              class="icon icon-speaker"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            >
              <path d="M5 9.2v5.6h3.4L12 18.5V5.5L8.4 9.2H5Z" fill="currentColor" stroke="none" />
              <path d="M15 9.2c1 .9 1.5 2 1.5 3.3s-.5 2.5-1.5 3.3" stroke-linecap="round" />
              <path d="M17.6 7.2C19.1 8.7 20 10.3 20 12s-.9 3.3-2.4 4.8" stroke-linecap="round" />
            </svg>
            <svg
              v-else
              class="icon icon-speaker"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
            >
              <path d="M5 9.2v5.6h3.4L12 18.5V5.5L8.4 9.2H5Z" fill="currentColor" stroke="none" />
              <path d="M16 9.5l4 5" stroke-linecap="round" />
              <path d="M20 9.5l-4 5" stroke-linecap="round" />
            </svg>
          </template>
        </button>
        <button
          type="button"
          class="clear-btn"
          @click="clearChat"
          :disabled="assistantThinking"
          title="Clear Conversation"
        >
          <svg class="icon icon-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.6"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.166L19.28 19.5a1.125 1.125 0 01-1.12 1.05H5.84a1.125 1.125 0 01-1.12-1.05L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .563c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.398m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>
      </div>
    </header>

    <transition name="toast-fade">
      <div v-if="micState === MIC_STATES.listening" class="listening-toast">
        Planner is listening…
      </div>
    </transition>

    <div ref="chatContainer" class="chat-body scrollbar-plan">
      <TransitionGroup name="fade-up" tag="div" class="chat-stream">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['chat-bubble', message.sender]"
        >
          <div class="icon-wrapper">
            <div
              v-if="message.sender === 'assistant'"
              class="ai-icon"
              role="img"
              aria-label="Planner avatar"
            ></div>
            <div
              v-else
              class="user-icon"
              role="img"
              aria-label="You"
            >
              {{ userInitial }}
            </div>
          </div>
          <div class="chat-text">
            <div
              v-if="message.text"
              class="chat-text__content"
              :class="{ 'chat-text__content--assistant': message.sender === 'assistant' }"
            >
              <p class="message-text">{{ message.text }}</p>
              <button
                v-if="message.sender === 'assistant'"
                type="button"
                class="voice-replay-btn"
                :disabled="voiceRequestingFor === message.id"
                :title="voiceRequestingFor === message.id ? 'Generating voice...' : 'Play voice reply'"
                @click="playVoiceForMessage(message)"
              >
                <span v-if="voiceRequestingFor === message.id" class="loader loader--tiny"></span>
                <svg
                  v-else
                  class="icon icon-speaker-mini"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path d="M6 9v6h3.2L12 18V6l-2.8 3H6Z" fill="currentColor" stroke="none" />
                  <path d="M14.1 9.5a2.5 2.5 0 0 1 0 5" stroke-linecap="round" />
                  <path d="M16.6 8a4 4 0 0 1 0 8" stroke-linecap="round" />
                </svg>
              </button>
            </div>

            <div v-if="message.results?.length" class="chat-results">
              <div
                v-for="result in message.results"
                :key="result.id"
                class="result-card"
                :class="`result-${result.status}`"
              >
                <header class="result-header">
                  <span class="result-status-icon">
                    <span v-if="result.status === 'completed'">✅</span>
                    <span v-else-if="result.status === 'error'">⚠️</span>
                    <span v-else-if="result.status === 'pending'">⏳</span>
                    <span v-else>ℹ️</span>
                  </span>
                  <span class="result-title">{{ result.label }}</span>
                </header>

                <p v-if="result.message" class="result-message">
                  {{ result.message }}
                </p>

                <ul
                  v-if="result.type === 'get_tasks' && result.payload?.tasks?.length"
                  class="result-list"
                >
                  <li
                    v-for="task in result.payload.tasks"
                    :key="task.id || task.title"
                    class="result-item"
                  >
                    {{ describeTaskItem(task) }}
                  </li>
                </ul>

                <ul
                  v-else-if="result.type === 'get_reminders' && result.payload?.reminders?.length"
                  class="result-list"
                >
                  <li
                    v-for="reminder in result.payload.reminders"
                    :key="reminder.id || reminder.text"
                    class="result-item"
                  >
                    {{ describeReminderItem(reminder) }}
                  </li>
                </ul>
                <ul
                  v-else-if="result.payload?.createdTasks?.length"
                  class="result-list"
                >
                  <li
                    v-for="task in result.payload.createdTasks"
                    :key="task.id || task.title"
                    class="result-item"
                  >
                    {{ describeTaskItem(task) }}
                  </li>
                </ul>
                <ul
                  v-else-if="result.type === 'get_meetings' && result.payload?.meetings?.length"
                  class="result-list"
                >
                  <li
                    v-for="meeting in result.payload.meetings"
                    :key="meeting.id || meeting.externalId || meeting.title"
                    class="result-item flex flex-col gap-1"
                  >
                    <span>{{ describeMeetingItem(meeting) }}</span>
                    <a
                      v-if="meeting.joinUrl"
                      :href="meeting.joinUrl"
                      target="_blank"
                      rel="noopener"
                      class="text-xs text-indigo-300 hover:text-indigo-200 underline self-start"
                    >
                      ↗ Join meeting
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div v-if="message.actions?.length" class="chat-actions">
              <button
                v-for="action in message.actions"
                :key="action.id"
                type="button"
                class="action-chip"
                @click="runAction(message, action)"
              >
                <svg class="icon icon-bolt" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2l-8 12h6l-2 8 8-12h-6z" />
                </svg>
                <span>{{ action.label }}</span>
              </button>
            </div>
          </div>
        </div>
        <div
          v-if="assistantThinking"
          key="assistant-typing"
          class="chat-bubble assistant typing"
        >
          <div class="icon-wrapper">
            <div class="ai-icon" role="img" aria-label="Planner avatar"></div>
          </div>
          <div class="chat-text">
            <div class="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <footer
      class="chat-input-bar"
      :class="{
        'chat-input-bar--recording':
          micState === MIC_STATES.listening || micState === MIC_STATES.processing,
      }"
    >
      <button
        @click="startRecording"
        :class="['mic-btn', { active: micButtonActive }]"
        :title="micButtonTitle"
      >
        <svg class="icon icon-mic" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.6"
            d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.6"
            d="M19 11a7 7 0 01-14 0m7 7v3m-4 0h8"
          />
        </svg>
      </button>
      <div class="mic-indicator" :class="micIndicatorClass">
        <span class="mic-indicator__dot" aria-hidden="true"></span>
        <span class="mic-indicator__label">{{ micStatusLabel }}</span>
      </div>
      <input
        v-model="inputText"
        :disabled="assistantThinking"
        placeholder="Ask your planner..."
        class="chat-input"
        @keydown.enter="sendMessage"
      />
      <button
        @click="sendMessage"
        class="send-btn"
        :disabled="sendDisabled"
        title="Send message"
      >
        <span v-if="assistantThinking" class="loader"></span>
        <svg v-else class="icon icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.7"
            d="M12 5l6 6m-6-6l-6 6m6-6v14"
          />
        </svg>
      </button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { queryPlannerAssistant } from '@/services/plannerService'
import { requestSpeechUrl, supportsWebSpeech, speakWithWebSpeech } from '@/services/ttsService'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage } from 'element-plus'
import { recordAndSendToBackend } from '@/utils/backendRecorder'
import { trackEvent } from '@/services/analytics'
import { auth } from '@/firebase/init'
import { getAppToken } from '@/services/appTokenService'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useSeoMeta } from '@/composables/useSeoMeta'

dayjs.extend(utc)
dayjs.extend(timezone)

const authStore = useAuthStore()

useSeoMeta({
  title: 'Talk to PlanCraft AI | Conversational Task Manager & Voice Assistant',
  description:
    'Ask PlanCraft AI to plan your day, summarize reminders, or log journal entries with a conversational interface.',
  keywords: ['PlanCraft AI assistant', 'AI task manager chat', 'voice planner', 'AI planning chat'],
  pageLabel: 'Talk to Planner',
  noindex: true,
})

const assistantThinking = ref(false)
const inputText = ref('')
const chatContainer = ref(null)
const messageSeed = ref(0)
const isRecording = ref(false)
const isTranscribing = ref(false)
const SpeechRecognitionClass =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null
const hasSpeechRecognitionInput = Boolean(SpeechRecognitionClass)
const SILENCE_TIMEOUT_MS = Number(import.meta.env.VITE_PLANNER_SILENCE_TIMEOUT_MS || 2500)
const AUTO_RESTART_DELAY_MS = Number(import.meta.env.VITE_PLANNER_RESTART_DELAY_MS || 900)
const BACKEND_TIMESLICE_MS = Number(import.meta.env.VITE_PLANNER_BACKEND_TIMESLICE_MS || 1400)
const MIC_STATES = Object.freeze({
  idle: 'idle',
  listening: 'listening',
  paused: 'paused',
  processing: 'processing',
  error: 'error',
})
const micState = ref(MIC_STATES.idle)
const micIndicatorClass = computed(() => `mic-indicator--${micState.value}`)
const micButtonActive = computed(() =>
  [MIC_STATES.listening, MIC_STATES.processing, MIC_STATES.paused].includes(micState.value),
)
const micStatusLabel = computed(() => {
  switch (micState.value) {
    case MIC_STATES.listening:
      return 'Listening'
    case MIC_STATES.processing:
      return 'Processing'
    case MIC_STATES.paused:
      return 'Ready'
    case MIC_STATES.error:
      return 'Mic blocked'
    default:
      return 'Tap to talk'
  }
})
const micButtonTitle = computed(() => {
  if (!micButtonActive.value) return 'Start voice input'
  if (micState.value === MIC_STATES.processing) {
    return 'Finishing your last thought...'
  }
  return 'Stop voice input'
})
let speechRecognitionInstance = null
let backendRecorderInstance = null
let silenceTimerId = null
let restartTimerId = null
let pendingSegmentText = ''
let latestPreviewText = ''
let keepListeningHot = false
let manualStopRequested = false
let backendStopping = false
let webStopping = false
let voiceEngine = hasSpeechRecognitionInput ? 'web' : 'backend'

const VOICE_PREF_KEY = 'planner_voice_enabled'
const DEFAULT_VOICE_ENABLED = true
const isVoiceOn = ref(DEFAULT_VOICE_ENABLED)
const voiceRequestingFor = ref(null)
const activeAudio = ref(null)
const audioCleanupMap = new WeakMap()
const hasWebSpeech = supportsWebSpeech()
let voiceRequestToken = 0
const lastAutoSpokenMessageId = ref(null)
const VOICE_PLAYBACK_RATE = Number(import.meta.env.VITE_ASSISTANT_VOICE_RATE || 0.92)
const speechFallbackOptions = { rate: VOICE_PLAYBACK_RATE, pitch: 1, volume: 1 }
const API_BASE_ROOT = (import.meta.env.VITE_API_BASE_ROOT || '').trim()
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim()
const SILENT_AUDIO_DATA_URI =
  'data:audio/wav;base64,UklGRpYDAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXIDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
let voicePlaybackUnlocked = false
let voiceUnlockPromise = null

function formatTextForVoice(text) {
  if (!text) return ''
  const stripped = String(text)
    .replace(/\s*\([A-Za-z0-9_\- ]+\/[A-Za-z0-9_\- ]+\)\s*$/, '')
    .trim()
  return stripped || ''
}

async function ensureVoicePlaybackUnlocked() {
  if (voicePlaybackUnlocked || typeof window === 'undefined') return true
  if (voiceUnlockPromise) {
    try {
      return await voiceUnlockPromise
    } catch {
      return false
    }
  }
  voiceUnlockPromise = new Promise((resolve) => {
    try {
      const unlockAudio = new Audio()
      unlockAudio.src = SILENT_AUDIO_DATA_URI
      unlockAudio.muted = true
      unlockAudio.playsInline = true

      const cleanup = () => {
        try {
          unlockAudio.pause()
          unlockAudio.removeAttribute('src')
          unlockAudio.load()
        } catch {}
        unlockAudio.removeEventListener('ended', handleSuccess)
        unlockAudio.removeEventListener('error', handleFailure)
      }

      const handleSuccess = () => {
        cleanup()
        voicePlaybackUnlocked = true
        voiceUnlockPromise = null
        resolve(true)
      }

      const handleFailure = () => {
        cleanup()
        voiceUnlockPromise = null
        resolve(false)
      }

      const playPromise = unlockAudio.play()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.then(handleSuccess).catch(handleFailure)
      } else {
        handleSuccess()
      }
    } catch {
      voiceUnlockPromise = null
      resolve(false)
    }
  })
  return voiceUnlockPromise
}

function resolveApiOrigin(source) {
  if (!source) return null
  try {
    if (/^https?:\/\//i.test(source)) {
      return new URL(source).origin
    }
    if (typeof window !== 'undefined') {
      return new URL(source, window.location.origin).origin
    }
  } catch {}
  return null
}

function resolveAudioAssetUrl(path) {
  const target = String(path || '').trim()
  if (!target) return ''
  if (/^https?:\/\//i.test(target)) return target
  const origin =
    resolveApiOrigin(API_BASE_ROOT) ||
    resolveApiOrigin(API_BASE_URL) ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  if (!origin) return target
  const safeOrigin = origin.replace(/\/+$/, '')
  const safePath = target.startsWith('/') ? target : `/${target}`
  return `${safeOrigin}${safePath}`
}

async function buildVoiceAuthHeaders() {
  const headers = {}
  let token = null
  try {
    if (auth?.currentUser) {
      token = await auth.currentUser.getIdToken()
    }
  } catch {}
  if (!token) {
    token = authStore?.token || localStorage.getItem('token') || null
  }
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const user = authStore?.user || JSON.parse(localStorage.getItem('user') || 'null') || {}
    if (user.email) headers['x-user-email'] = user.email
    if (user.uid) headers['x-user-id'] = user.uid
    if (user.role) headers['x-user-role'] = user.role
  } catch {}

  try {
    const appTok = getAppToken()
    if (appTok) headers['x-app-token'] = appTok
  } catch {}

  try {
    let tz = localStorage.getItem('user_timezone')
    if (!tz || tz === 'UTC') {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      localStorage.setItem('user_timezone', tz)
    }
    headers['x-user-tz'] = tz
  } catch {
    headers['x-user-tz'] = 'UTC'
  }

  try {
    const lang = (navigator.language || 'en-US').toUpperCase()
    const cc = (lang.split('-')[1] || 'US').toUpperCase()
    headers['x-user-country'] = cc
  } catch {
    headers['x-user-country'] = 'US'
  }

  return headers
}

async function fetchAuthorizedAudioSource(url) {
  const targetUrl = resolveAudioAssetUrl(url)
  if (!targetUrl) throw new Error('Missing audio URL')
  const headers = await buildVoiceAuthHeaders()
  const response = await fetch(targetUrl, {
    headers,
    credentials: 'include',
    mode: 'cors',
  })
  if (!response.ok) {
    const error = new Error(`Audio fetch failed (${response.status})`)
    error.status = response.status
    throw error
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  return { objectUrl }
}

function revokeAudioBlob(audio) {
  if (audio && audio.__objectUrl) {
    try {
      URL.revokeObjectURL(audio.__objectUrl)
    } catch {}
    audio.__objectUrl = null
  }
}

if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(VOICE_PREF_KEY)
    if (stored != null) {
      isVoiceOn.value = stored === '1' || stored === 'true'
    } else {
      localStorage.setItem(VOICE_PREF_KEY, isVoiceOn.value ? '1' : '0')
    }
  } catch {
    /* noop */
  }
}

function createWelcomeMessage(name) {
  const greetingName = name ? name.split(' ')[0] : 'there'
  return {
    id: `welcome-${Date.now()}`,
    sender: 'assistant',
    text: `Hi ${greetingName}! I’m your Planner brain. I can summarise your workload, look up reminders or documents, and even create tasks or nudges for you. What should we tackle first?`,
    actions: [],
  }
}

const userDisplayName = computed(() => {
  const u = authStore?.user || {}
  const name = u.displayName || u.name || u.fullName
  if (name) return name
  if (u.email) return u.email.split('@')[0]
  return 'You'
})

const userId = computed(() => authStore?.user?.uid || localStorage.getItem('uid') || null)
const userInitial = computed(() => (userDisplayName.value || 'You').charAt(0).toUpperCase())

const messages = ref([createWelcomeMessage(userDisplayName.value)])

watch(userDisplayName, (name) => {
  if (!messages.value.length) {
    messages.value = [createWelcomeMessage(name)]
    return
  }
  const first = messages.value[0]
  if (first && first.id.startsWith('welcome-') && messages.value.length === 1) {
    messages.value[0] = createWelcomeMessage(name)
  }
})

watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      try {
        const el = chatContainer.value
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      } catch {
        /* noop */
      }
    })
  },
)

watch(isVoiceOn, (enabled) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(VOICE_PREF_KEY, enabled ? '1' : '0')
    } catch {
      /* noop */
    }
  }
  if (!enabled) {
    voiceRequestToken += 1
    voiceRequestingFor.value = null
    stopVoicePlayback()
  } else {
    lastAutoSpokenMessageId.value = null
  }
})

watch(
  () => messages.value[messages.value.length - 1],
  (message) => {
    if (!message) return
    if (message.sender !== 'assistant') return
    if (!isVoiceOn.value) return
    if (String(message.id || '').startsWith('assistant-error')) return
    if (String(message.id || '').startsWith('welcome-')) return
    const content = String(message.text || '').trim()
    if (!content) return
    if (lastAutoSpokenMessageId.value === message.id) return
    lastAutoSpokenMessageId.value = message.id
    speakAssistantMessage(message)
  },
)

const sendDisabled = computed(() => assistantThinking.value || !inputText.value.trim())

function clearChat() {
  messages.value = [createWelcomeMessage(userDisplayName.value)]
  lastAutoSpokenMessageId.value = null
  voiceRequestToken += 1
  voiceRequestingFor.value = null
  stopVoicePlayback()
}

async function sendMessage() {
  if (sendDisabled.value) return
  await ensureVoicePlaybackUnlocked()
  sendQuery()
}

function toggleVoice() {
  isVoiceOn.value = !isVoiceOn.value
}

async function playVoiceForMessage(message) {
  if (!message || !message.text) return
  await ensureVoicePlaybackUnlocked()
  speakAssistantMessage(message, { allowWhenMuted: true })
}

async function speakAssistantMessage(message, options = {}) {
  const { allowWhenMuted = false } = options
  if (!allowWhenMuted && !isVoiceOn.value) return
  const rawText = String(message?.text || '').trim()
  const textForVoice = formatTextForVoice(rawText)
  if (!textForVoice) return
  const unlocked = await ensureVoicePlaybackUnlocked()
  if (!unlocked && !allowWhenMuted) {
    if (hasWebSpeech) {
      speakWithWebSpeech(textForVoice, speechFallbackOptions)
    }
    return
  }

  const token = ++voiceRequestToken
  voiceRequestingFor.value = message?.id || null

  try {
    const result = await requestSpeechUrl(textForVoice)
    if (token !== voiceRequestToken) return
    if (!allowWhenMuted && !isVoiceOn.value) return

    if (result?.url) {
      stopVoicePlayback()
      const audio = new Audio()
      const { objectUrl } = await fetchAuthorizedAudioSource(result.url)
      if (token !== voiceRequestToken) {
        URL.revokeObjectURL(objectUrl)
        return
      }
      audio.src = objectUrl
      audio.__objectUrl = objectUrl
      audio.playbackRate = VOICE_PLAYBACK_RATE
      const handleCleanup = () => {
        audio.removeEventListener('ended', handleCleanup)
        audio.removeEventListener('error', handleError)
        revokeAudioBlob(audio)
        audioCleanupMap.delete(audio)
        if (activeAudio.value === audio) {
          activeAudio.value = null
        }
      }
      const handleError = (err) => {
        handleCleanup()
        if (hasWebSpeech) {
          speakWithWebSpeech(textForVoice, speechFallbackOptions)
        } else {
          console.warn('[TalkToPlanner] Audio playback failed', err)
        }
      }
      audio.addEventListener('ended', handleCleanup)
      audio.addEventListener('error', handleError)
      audioCleanupMap.set(audio, handleCleanup)
      activeAudio.value = audio
      const playPromise = audio.play()
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch((err) => {
          handleError(err)
        })
      }
    } else if (hasWebSpeech) {
      speakWithWebSpeech(textForVoice, speechFallbackOptions)
    }
  } catch (err) {
    console.warn('[TalkToPlanner] Voice request failed', err)
    if (hasWebSpeech) {
      speakWithWebSpeech(textForVoice, speechFallbackOptions)
    }
  } finally {
    if (token === voiceRequestToken) {
      voiceRequestingFor.value = null
    }
  }
}

function stopVoicePlayback() {
  const audio = activeAudio.value
  if (audio) {
    try {
      const cleanup = audioCleanupMap.get(audio)
      if (typeof cleanup === 'function') {
        cleanup()
      } else {
        audioCleanupMap.delete(audio)
        revokeAudioBlob(audio)
        if (activeAudio.value === audio) {
          activeAudio.value = null
        }
      }
      audio.pause()
      audio.currentTime = 0
    } catch {
      /* noop */
    }
    activeAudio.value = null
  }
  if (hasWebSpeech) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* noop */
    }
  }
}

function historyForRequest(excludeId) {
  return messages.value
    .filter((m) => m.id !== excludeId && ['user', 'assistant'].includes(m.sender))
    .map((m) => ({
      role: m.sender === 'assistant' ? 'assistant' : 'user',
      content: String(m.text || '').slice(0, 2000),
    }))
}

async function sendQuery(forcedInput = null) {
  const rawInput = forcedInput != null ? forcedInput : inputText.value
  const query = String(rawInput || '').trim()
  if (!query) {
    return
  }
  if (!userId.value) {
    ElMessage.warning('Sign in to chat with your planner.')
    return
  }

  const userMessageId = `user-${Date.now()}-${messageSeed.value++}`
  const userMessage = {
    id: userMessageId,
    sender: 'user',
    text: query,
    actions: [],
    results: [],
  }

  messages.value.push(userMessage)
  inputText.value = ''
  assistantThinking.value = true

  try {
    const history = historyForRequest(userMessageId)
    const response = await queryPlannerAssistant(query, {
      userId: userId.value,
      history,
    })

    const executedActions = Array.isArray(response.actions) ? response.actions : []
    const suggestionsSource =
      (response.raw && response.raw.suggestions) || response.suggestions || []

    const assistantMessage = {
      id: `assistant-${Date.now()}-${messageSeed.value++}`,
      sender: 'assistant',
      text: sanitizeAssistantText(response.reply),
      actions: normalizeActions(suggestionsSource),
      results: normalizeResults(executedActions),
      intent: response.intent || null,
      meta: response.contextSummary || null,
      raw: response.raw || null,
    }
    messages.value.push(assistantMessage)

    const taskChangingTypes = new Set(['create_task', 'update_task', 'complete_task'])
    const touchedTasks = executedActions.some((action) =>
      taskChangingTypes.has(String(action?.type || '').toLowerCase()),
    )
    if (touchedTasks) {
      try {
        window.dispatchEvent(new CustomEvent('tasks:refresh-request'))
      } catch (err) {
        console.warn('[TalkToPlanner] failed to dispatch task refresh', err?.message || err)
      }
    }
  } catch (err) {
    const fallback = typeof err.message === 'string' ? err.message : 'Something went wrong.'
    messages.value.push({
      id: `assistant-error-${Date.now()}-${messageSeed.value++}`,
      sender: 'assistant',
      text: sanitizeAssistantText(fallback),
      actions: [],
      results: [],
    })
  } finally {
    assistantThinking.value = false
  }
}

function normalizeActions(actions) {
  if (!Array.isArray(actions)) return []
  return actions.map((action, idx) => {
    if (typeof action === 'string') {
      return {
        id: `${Date.now()}-${idx}`,
        type: 'suggestion',
        label: action,
        payload: {},
        status: 'suggestion',
      }
    }
    const label =
      action?.label ||
      action?.title ||
      prettifyActionType(action?.type || action?.name || `Action ${idx + 1}`)
    return {
      id: `${Date.now()}-${idx}`,
      type: action?.type || action?.name || 'action',
      label,
      payload: action?.payload || {},
      status: action?.status || 'completed',
      message: action?.message || null,
    }
  })
}

function normalizeResults(actions) {
  if (!Array.isArray(actions)) return []
  return actions.map((action, idx) => {
    const type = action?.type || action?.name || `action-${idx + 1}`
    const status = String(action?.status || 'completed').toLowerCase()
    const message = formatResultMessage(action)
    return {
      id: `result-${Date.now()}-${idx}`,
      type,
      label: prettifyActionType(type),
      status,
      message,
      payload: action?.payload || action || {},
    }
  })
}

function prettifyActionType(type) {
  return String(type || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function sanitizeAssistantText(text) {
  if (!text) return ''
  return String(text).replace(/```[\s\S]*?```/g, '').trim()
}

function runAction(_message, action) {
  if (!action) return
  if (action.status === 'pending') {
    ElMessage.info('This action needs a bit more detail. Let the assistant know how to proceed.')
    return
  }
  if (action.message) {
    ElMessage.info(action.message)
  }
}

function formatDateLabel(value, options = {}) {
  if (!value) return null
  try {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      const formatter = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        ...(options.includeTime
          ? { hour: '2-digit', minute: '2-digit' }
          : {}),
      })
      return formatter.format(date)
    }
  } catch {
    /* noop */
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${month}/${day}/${year}`
  }
  return typeof value === 'string' ? value : String(value)
}

function describeTaskItem(task = {}) {
  const parts = [task.title || task.text || 'Untitled task']
  if (task.date) parts.push(`due ${formatDateLabel(task.date)}`)
  if (!task.completed && task.reminderTime) parts.push(`⏰ ${task.reminderTime}`)
  if (task.completed) parts.push('✅ done')
  return parts.join(' · ')
}

function describeReminderItem(reminder = {}) {
  const parts = [reminder.text || reminder.title || 'Reminder']
  if (reminder.scheduledTime) {
    parts.push(`for ${formatDateLabel(reminder.scheduledTime, { includeTime: true })}`)
  }
  if (Array.isArray(reminder.channels) && reminder.channels.length) {
    parts.push(`via ${reminder.channels.join(', ')}`)
  }
  return parts.join(' · ')
}

function describeMeetingItem(meeting = {}) {
  const parts = [meeting.title || meeting.summary || 'Meeting']
  const when =
    formatDateLabel(meeting.startTime, { includeTime: true }) ||
    formatDateLabel(meeting.date, { includeTime: true })
  if (when) parts.push(`at ${when}`)
  return parts.join(' ')
}

function formatResultMessage(action = {}) {
  const type = String(action?.type || action?.name || '').toLowerCase()
  if (type === 'schedule_reminder') {
    const payload = action?.payload || {}
    const iso = payload.scheduledTime || payload.when || null
    const tz = payload.timezone || payload.tz || (dayjs.tz && dayjs.tz.guess ? dayjs.tz.guess() : 'UTC')
    const reminderLabel = payload.text || payload.title || payload.name || 'Reminder'
    if (iso && dayjs(iso).isValid()) {
      const local = dayjs.utc(iso).tz(tz)
      if (local.isValid()) {
        const channelList = Array.isArray(payload.channels) && payload.channels.length
          ? ` via ${payload.channels.join(', ')}`
          : ''
        return `Scheduled reminder “${reminderLabel}” for ${local.format('ddd, MMM D • hh:mm A')} (${tz})${channelList}`
      }
    }
  }
  if (type === 'update_task' && action?.payload?.updates?.completed === true) {
    return action?.message || 'Marked task complete.'
  }
  return action?.message || null
}

function handleVoiceTranscript(text) {
  if (!text) return
  inputText.value = text
}

async function startRecording() {
  try {
    if (!keepListeningHot) {
      await ensureVoicePlaybackUnlocked()
      await beginContinuousListening()
    } else {
      await stopRecording()
    }
  } catch (err) {
    console.error('🎤 Recording error:', err)
    keepListeningHot = false
    manualStopRequested = false
    clearSilenceTimer()
    clearRestartTimer()
    applyMicState(MIC_STATES.error)
    isTranscribing.value = false
    ElMessage.error('Microphone unavailable. Please check permissions.')
  }
}

async function beginContinuousListening() {
  if (assistantThinking.value) {
    ElMessage.info('Wait for the planner to finish before recording again.')
    return
  }
  inputText.value = ''
  latestPreviewText = ''
  pendingSegmentText = ''
  keepListeningHot = true
  manualStopRequested = false
  clearSilenceTimer()
  clearRestartTimer()
  if (voiceEngine === 'web' && hasSpeechRecognitionInput) {
    startWebSpeechSession()
  } else {
    voiceEngine = 'backend'
    await startBackendSession()
  }
}

async function stopRecording() {
  keepListeningHot = false
  manualStopRequested = true
  pendingSegmentText = ''
  latestPreviewText = ''
  clearSilenceTimer()
  clearRestartTimer()
  if (voiceEngine === 'web') {
    if (speechRecognitionInstance) {
      try {
        speechRecognitionInstance.stop()
      } catch {}
    } else {
      applyMicState(MIC_STATES.idle)
    }
    webStopping = false
  } else if (backendRecorderInstance) {
    try {
      await backendRecorderInstance._stop({ skipFinalUpload: true })
    } catch {}
    backendRecorderInstance = null
  }
  applyMicState(MIC_STATES.idle)
  isTranscribing.value = false
}

function applyMicState(state) {
  if (micState.value === state) return
  micState.value = state
  isRecording.value = state === MIC_STATES.listening
  if (state === MIC_STATES.processing) {
    isTranscribing.value = true
  } else if (state === MIC_STATES.idle || state === MIC_STATES.error) {
    isTranscribing.value = false
  } else if (state === MIC_STATES.paused || state === MIC_STATES.listening) {
    isTranscribing.value = false
  }
}

function clearSilenceTimer() {
  if (silenceTimerId) {
    clearTimeout(silenceTimerId)
    silenceTimerId = null
  }
}

function clearRestartTimer() {
  if (restartTimerId) {
    clearTimeout(restartTimerId)
    restartTimerId = null
  }
}

function scheduleSilenceCheck() {
  if (typeof window === 'undefined') return
  if (!latestPreviewText || !latestPreviewText.trim()) return
  clearSilenceTimer()
  silenceTimerId = window.setTimeout(() => {
    finalizeCurrentSegment()
  }, SILENCE_TIMEOUT_MS)
}

function finalizeCurrentSegment() {
  if (!keepListeningHot || manualStopRequested) return
  if (!latestPreviewText || !latestPreviewText.trim()) return
  if (voiceEngine === 'web') {
    finalizeWebSpeechSegment()
  } else {
    finalizeBackendSegment().catch((err) => {
      console.error('[TalkToPlanner] backend finalize failed', err)
    })
  }
}

function finalizeWebSpeechSegment() {
  if (!speechRecognitionInstance || webStopping) return
  const transcript = (latestPreviewText || '').trim()
  if (!transcript) return
  pendingSegmentText = transcript
  webStopping = true
  applyMicState(MIC_STATES.processing)
  clearSilenceTimer()
  try {
    speechRecognitionInstance.stop()
  } catch (err) {
    webStopping = false
    console.error('[TalkToPlanner] failed to stop recognition', err)
  }
}

async function finalizeBackendSegment() {
  if (!backendRecorderInstance || backendStopping) return
  if (!latestPreviewText || !latestPreviewText.trim()) return
  backendStopping = true
  clearSilenceTimer()
  applyMicState(MIC_STATES.processing)
  try {
    await backendRecorderInstance._stop()
  } catch (err) {
    console.error('[TalkToPlanner] Whisper stop failed', err)
  } finally {
    backendRecorderInstance = null
    backendStopping = false
    if (keepListeningHot && !manualStopRequested) {
      applyMicState(MIC_STATES.paused)
      restartTimerId = window.setTimeout(() => {
        if (!keepListeningHot) return
        startBackendSession().catch((startErr) => {
          console.error('[TalkToPlanner] failed to restart backend recorder', startErr)
          keepListeningHot = false
          applyMicState(MIC_STATES.error)
        })
      }, AUTO_RESTART_DELAY_MS)
    } else if (!keepListeningHot) {
      applyMicState(MIC_STATES.idle)
    }
  }
}

async function processVoiceSegment(text) {
  const cleaned = String(text || '').trim()
  if (!cleaned) return
  handleVoiceTranscript(cleaned)
  await sendQuery(cleaned)
  trackEvent('Voice Transcribed', { length: cleaned.length })
  inputText.value = ''
}

function startWebSpeechSession() {
  if (!hasSpeechRecognitionInput) {
    voiceEngine = 'backend'
    startBackendSession().catch((err) => {
      console.error('[TalkToPlanner] fallback recorder failed', err)
      applyMicState(MIC_STATES.error)
    })
    return
  }
  clearRestartTimer()
  const recognition = new SpeechRecognitionClass()
  speechRecognitionInstance = recognition
  voiceEngine = 'web'
  recognition.lang = navigator.language || 'en-US'
  recognition.continuous = true
  recognition.interimResults = true
  let finalChunks = ''

  recognition.onstart = () => {
    finalChunks = ''
    latestPreviewText = ''
    applyMicState(MIC_STATES.listening)
  }

  recognition.onresult = (event) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0].transcript?.trim()
      if (!transcript) continue
      if (event.results[i].isFinal) {
        finalChunks = `${finalChunks} ${transcript}`.trim()
      } else {
        interim = `${interim} ${transcript}`.trim()
      }
    }
    latestPreviewText = `${finalChunks} ${interim}`.trim()
    if (latestPreviewText) {
      handleVoiceTranscript(latestPreviewText)
      scheduleSilenceCheck()
    }
  }

  recognition.onerror = (event) => {
    console.error('[TalkToPlanner] Speech recognition error', event?.error || event)
    if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
      keepListeningHot = false
      manualStopRequested = false
      applyMicState(MIC_STATES.error)
      return
    }
    voiceEngine = 'backend'
    speechRecognitionInstance = null
    clearSilenceTimer()
    if (!keepListeningHot) {
      applyMicState(MIC_STATES.idle)
      return
    }
    startBackendSession().catch((errFallback) => {
      console.error('[TalkToPlanner] fallback recorder failed', errFallback)
      applyMicState(MIC_STATES.error)
    })
  }

  recognition.onend = async () => {
    clearSilenceTimer()
    const segmentToSend = pendingSegmentText.trim()
    pendingSegmentText = ''
    speechRecognitionInstance = null
    webStopping = false
    let shouldRestart = keepListeningHot && !manualStopRequested
    if (segmentToSend) {
      try {
        applyMicState(MIC_STATES.processing)
        await processVoiceSegment(segmentToSend)
      } finally {
        shouldRestart = keepListeningHot && !manualStopRequested
      }
    }
    if (!shouldRestart) {
      manualStopRequested = false
      applyMicState(keepListeningHot ? MIC_STATES.paused : MIC_STATES.idle)
      return
    }
    applyMicState(MIC_STATES.paused)
    restartTimerId = window.setTimeout(() => {
      if (keepListeningHot) {
        startWebSpeechSession()
      }
    }, AUTO_RESTART_DELAY_MS)
  }

  try {
    recognition.start()
  } catch (err) {
    console.error('[TalkToPlanner] Failed to start recognition', err)
    speechRecognitionInstance = null
    voiceEngine = 'backend'
    if (keepListeningHot) {
      startBackendSession().catch((startErr) => {
        console.error('[TalkToPlanner] fallback recorder failed', startErr)
        applyMicState(MIC_STATES.error)
      })
    } else {
      applyMicState(MIC_STATES.idle)
    }
  }
}

async function startBackendSession() {
  if (!keepListeningHot || backendRecorderInstance) return
  clearRestartTimer()
  latestPreviewText = ''
  try {
    backendRecorderInstance = await recordAndSendToBackend(handleBackendResult, {
      mode: 'live',
      timeSliceMs: BACKEND_TIMESLICE_MS,
      emitFinalResult: true,
    })
    voiceEngine = 'backend'
    applyMicState(MIC_STATES.listening)
  } catch (err) {
    backendRecorderInstance = null
    keepListeningHot = false
    applyMicState(MIC_STATES.error)
    throw err
  }
}

async function handleBackendResult(text, isFinal) {
  const snippet = String(text || '').trim()
  if (!snippet) return
  if (isFinal) {
    latestPreviewText = ''
    await processVoiceSegment(snippet)
  } else {
    latestPreviewText = snippet
    handleVoiceTranscript(snippet)
    scheduleSilenceCheck()
  }
}

onBeforeUnmount(() => {
  stopVoicePlayback()
  stopRecording().catch(() => {})
})
</script>

<style scoped>
.talk-planner-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
  background: linear-gradient(180deg, rgba(25, 20, 40, 0.95), rgba(20, 18, 35, 0.98));
  border-radius: 1rem;
  box-shadow: 0 0 30px rgba(90, 60, 150, 0.2);
  color: #f9f8ff;
}

.talk-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.talk-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.6rem;
  font-weight: 600;
  color: #f3e8ff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.voice-toggle {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.voice-toggle:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.voice-toggle:focus-visible,
.voice-replay-btn:focus-visible {
  outline: 2px solid rgba(196, 181, 253, 0.8);
  outline-offset: 2px;
}

.voice-toggle.active {
  background: rgba(167, 139, 250, 0.22);
  border-color: rgba(196, 181, 253, 0.55);
  color: #f5f3ff;
  box-shadow: 0 0 12px rgba(196, 181, 253, 0.25);
}

.voice-toggle .icon {
  width: 1.05rem;
  height: 1.05rem;
}

.loader--tiny {
  width: 14px;
  height: 14px;
  border-width: 2px;
}

.clear-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.65);
  font-size: 1.3rem;
  transition: color 0.2s ease;
  cursor: pointer;
}

.clear-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.clear-btn:not(:disabled):hover {
  color: #f87171;
}

.listening-toast {
  align-self: flex-start;
  background: rgba(115, 83, 255, 0.2);
  border: 1px solid rgba(173, 139, 255, 0.35);
  color: #e9ddff;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 0 12px rgba(120, 90, 255, 0.25);
}

.chat-body {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
}

.chat-stream {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.chat-bubble {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  max-width: 78%;
  padding: 0.78rem 1rem;
  border-radius: 1rem;
  line-height: 1.45;
  word-break: break-word;
  box-shadow: 0 10px 25px rgba(34, 20, 70, 0.2);
  backdrop-filter: blur(10px);
  position: relative;
  border: 1px solid transparent;
}

.chat-bubble.assistant {
  align-self: flex-start;
  background: rgba(72, 42, 150, 0.32);
  border-color: rgba(142, 102, 255, 0.25);
}

.chat-bubble.assistant::before {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 1rem;
  background: radial-gradient(circle at top left, rgba(178, 142, 255, 0.22), transparent 65%);
  opacity: 0.6;
  pointer-events: none;
}

.chat-bubble.user {
  align-self: flex-end;
  background: linear-gradient(120deg, #6d28d9, #9333ea);
  color: #fdfbff;
  border-color: rgba(147, 51, 234, 0.5);
}

.chat-bubble.user .chat-text {
  color: rgba(255, 255, 255, 0.95);
}

.chat-bubble.typing {
  max-width: 220px;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #c084fc, #4c1d95);
  box-shadow:
    0 0 12px rgba(192, 132, 252, 0.55),
    0 0 24px rgba(91, 33, 182, 0.45);
  animation: orbGlow 6s ease-in-out infinite;
}

.user-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
}

.chat-text {
  flex: 1;
  color: rgba(243, 244, 255, 0.9);
}

.chat-text__content {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.chat-text__content--assistant {
  padding-right: 0.25rem;
}

.message-text {
  flex: 1;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.voice-replay-btn {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.voice-replay-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.voice-replay-btn:disabled {
  opacity: 0.55;
  cursor: wait;
  transform: none;
}

.voice-replay-btn .icon {
  width: 1rem;
  height: 1rem;
}

.icon {
  display: block;
  width: 1.15rem;
  height: 1.15rem;
}

.icon-bolt {
  width: 0.9rem;
  height: 0.9rem;
}

.chat-actions {
  margin-top: 0.6rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chat-results {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.result-card {
  background: rgba(78, 44, 120, 0.25);
  border: 1px solid rgba(126, 86, 180, 0.35);
  border-left: 3px solid rgba(198, 126, 255, 0.8);
  padding: 0.75rem;
  border-radius: 0.75rem;
  box-shadow: inset 0 0 20px rgba(120, 80, 180, 0.15);
}

.result-card.result-error {
  border-left-color: rgba(255, 137, 137, 0.8);
}

.result-card.result-pending,
.result-card.result-ignored {
  border-left-color: rgba(255, 197, 110, 0.8);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #f8f0ff;
}

.result-status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.result-title {
  font-size: 0.95rem;
  letter-spacing: 0.01em;
}

.result-message {
  margin-top: 0.35rem;
  font-size: 0.92rem;
  color: rgba(239, 231, 255, 0.85);
  line-height: 1.35;
}

.result-list {
  margin-top: 0.6rem;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.35rem;
  list-style: disc;
}

.result-item {
  font-size: 0.9rem;
  color: rgba(236, 229, 255, 0.85);
}

.action-chip {
  background: rgba(147, 197, 253, 0.18);
  border: 1px solid rgba(147, 197, 253, 0.32);
  color: #e2e8f0;
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.action-chip:hover {
  background: rgba(147, 197, 253, 0.28);
  border-color: rgba(196, 181, 253, 0.6);
}

.typing-dots {
  display: flex;
  gap: 0.3rem;
  align-items: center;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(234, 232, 255, 0.9);
  animation: typing 1.2s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

.chat-input-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: rgba(40, 35, 70, 0.8);
  border: 1px solid rgba(100, 100, 255, 0.15);
  border-radius: 2rem;
  padding: 0.5rem 0.8rem;
  margin-top: 1rem;
  box-shadow: 0 16px 32px rgba(20, 16, 40, 0.35);
  backdrop-filter: blur(8px);
}

.chat-input-bar--recording {
  border-color: rgba(168, 85, 247, 0.55);
  box-shadow: 0 0 18px rgba(168, 85, 247, 0.4);
}

.chat-input {
  flex-grow: 1;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 1rem;
  outline: none;
}

.chat-input::placeholder {
  color: rgba(255, 255, 255, 0.45);
}

.mic-btn,
.send-btn {
  background: rgba(90, 70, 150, 0.3);
  border: none;
  color: #c4b5fd;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mic-btn.active {
  background: radial-gradient(circle at center, #a855f7, #6d28d9);
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.7);
  color: #ffffff;
  animation: pulse 1.5s infinite;
}

.mic-btn:hover,
.send-btn:hover {
  background: rgba(140, 100, 255, 0.4);
  color: #ffffff;
  transform: translateY(-1px);
}

.mic-btn:disabled,
.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.mic-indicator {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 0.85rem;
  padding: 0.32rem 0.95rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.82rem;
  min-width: 130px;
  transition: background 0.2s ease, color 0.2s ease;
}

.mic-indicator__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #a78bfa;
  box-shadow: 0 0 10px rgba(167, 139, 250, 0.5);
  animation: mic-breathe 1.6s ease-in-out infinite;
}

.mic-indicator__label {
  font-weight: 500;
  letter-spacing: 0.01em;
}

.mic-indicator--listening {
  background: rgba(16, 185, 129, 0.2);
  color: #c6f6d5;
}

.mic-indicator--listening .mic-indicator__dot {
  background: #34d399;
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.8);
  animation-duration: 1.1s;
}

.mic-indicator--processing {
  background: rgba(251, 191, 36, 0.2);
  color: #fde68a;
}

.mic-indicator--processing .mic-indicator__dot {
  background: #fbbf24;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.85);
  animation-duration: 0.9s;
}

.mic-indicator--paused {
  background: rgba(167, 139, 250, 0.18);
  color: #ede9fe;
}

.mic-indicator--paused .mic-indicator__dot {
  background: #c4b5fd;
  animation-duration: 1.9s;
}

.mic-indicator--idle {
  opacity: 0.65;
}

.mic-indicator--idle .mic-indicator__dot {
  background: rgba(255, 255, 255, 0.35);
  box-shadow: none;
  animation: none;
}

.mic-indicator--error {
  background: rgba(248, 113, 113, 0.2);
  color: #fecaca;
}

.mic-indicator--error .mic-indicator__dot {
  background: #f87171;
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.75);
  animation: none;
}

@keyframes mic-breathe {
  0% {
    transform: scale(0.9);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.14);
    opacity: 1;
  }
  100% {
    transform: scale(0.9);
    opacity: 0.8;
  }
}

.icon-arrow {
  transform: rotate(45deg);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.22s ease;
}

.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.7);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes orbGlow {
  0%,
  100% {
    transform: rotate(0deg);
    box-shadow:
      0 0 12px rgba(192, 132, 252, 0.55),
      0 0 24px rgba(91, 33, 182, 0.45);
  }
  50% {
    transform: rotate(10deg);
    box-shadow:
      0 0 18px rgba(192, 132, 252, 0.75),
      0 0 32px rgba(91, 33, 182, 0.55);
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loader {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 999px;
  animation: spin 0.9s linear infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(168, 85, 247, 0.8);
  }
}

@media (max-width: 768px) {
  .talk-planner-wrapper {
    padding: 0.75rem;
  }

  .chat-bubble {
    max-width: 88%;
  }

  .chat-input {
    font-size: 0.95rem;
  }
}
</style>
