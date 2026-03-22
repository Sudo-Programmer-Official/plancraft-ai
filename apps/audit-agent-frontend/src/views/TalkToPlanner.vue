<template>
  <div class="talk-planner-page">
    <section class="talk-planner-wrapper">
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
        <div v-if="micState === MIC_STATES.listening || micState === MIC_STATES.processing" class="listening-toast">
          {{ micState === MIC_STATES.processing ? 'Planner is transcribing…' : 'Planner is listening… Tap again to stop.' }}
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
              <p
                class="message-text"
                :class="{ 'message-text--assistant': message.sender === 'assistant' }"
              >
                {{ formatMessageText(message.text, message.sender) }}
              </p>
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
    </section>

    <footer
      class="chat-input-dock"
      :class="{ 'chat-input-dock--recording': micActive }"
    >
      <div
        class="chat-input-bar"
        :class="{ 'chat-input-bar--recording': micActive }"
      >
        <div class="chat-input-row">
          <button
            type="button"
            class="mic-btn"
            :class="{
              active: micActive,
              'mic-btn--recording': micState === MIC_STATES.listening,
              'mic-btn--processing': micState === MIC_STATES.processing,
            }"
            :disabled="(assistantThinking && !micActive) || micState === MIC_STATES.processing"
            :aria-pressed="micState === MIC_STATES.listening"
            :title="micButtonLabel"
            :aria-label="micButtonLabel"
            @click="handleMicButton"
          >
            <span class="mic-visual" aria-hidden="true"></span>
          </button>
          <textarea
            ref="chatInputRef"
            v-model="inputText"
            :disabled="assistantThinking"
            rows="1"
            placeholder="Ask your planner..."
            class="chat-input"
            @keydown="handleComposerKeydown"
          ></textarea>
          <button
            type="button"
            @click="sendMessage"
            class="send-btn"
            :disabled="sendDisabled"
            :title="sendDisabled ? 'Enter a message first' : 'Send message'"
            :aria-label="sendDisabled ? 'Enter a message first' : 'Send message'"
          >
            <span v-if="assistantThinking" class="loader"></span>
            <svg
              v-else
              class="icon icon-send"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.6"
                d="M4.5 11.4L20.2 4.3c.9-.4 1.8.5 1.3 1.4l-6.2 12.3c-.4.7-1.4.8-1.9.1l-2.8-3.9-4-1.2c-.8-.2-.9-1.3-.1-1.6Z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.6"
                d="M10.6 13.3L20.5 5"
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { queryPlannerAssistant } from '@/services/plannerService'
import { requestSpeechUrl, supportsWebSpeech, speakWithWebSpeech } from '@/services/ttsService'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage } from 'element-plus'
import { trackEvent, trackAISuggestionAccepted } from '@/services/analytics'
import { auth } from '@/firebase/init'
import { getAppToken } from '@/services/appTokenService'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useSeoMeta } from '@/composables/useSeoMeta'
import { useAudioRecorder } from '@/composables/useAudioRecorder'

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
const chatInputRef = ref(null)
const messageSeed = ref(0)
const MIC_STATES = Object.freeze({
  idle: 'idle',
  listening: 'listening',
  paused: 'paused',
  processing: 'processing',
  error: 'error',
})
const micState = ref(MIC_STATES.idle)
const micActive = computed(
  () => micState.value === MIC_STATES.listening || micState.value === MIC_STATES.processing,
)
const micButtonLabel = computed(() => {
  if (assistantThinking.value && !micActive.value) {
    return 'Wait for the planner to finish'
  }
  switch (micState.value) {
    case MIC_STATES.listening:
      return 'Stop recording'
    case MIC_STATES.processing:
      return 'Finishing transcription'
    case MIC_STATES.paused:
      return 'Resume recording'
    case MIC_STATES.error:
      return 'Microphone unavailable'
    default:
      return 'Start recording'
  }
})

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

const {
  state: plannerRecorderState,
  errorMessage: plannerRecorderError,
  startRecording: startPlannerRecording,
  stopRecording: stopPlannerRecording,
  resetRecorder: resetPlannerRecording,
} = useAudioRecorder({
  logPrefix: '[TalkToPlanner][VoiceRecorder]',
  onTranscription: async (text) => {
    const cleaned = String(text || '').trim()
    if (!cleaned) return
    stageVoiceResult(cleaned)
    try {
      trackEvent('Voice Transcribed', { length: cleaned.length, surface: 'talk_to_planner' })
    } catch (_) {}
    await nextTick()
    syncComposerHeight()
    try {
      chatInputRef.value?.focus?.()
    } catch {
      /* noop */
    }
    resetPlannerRecording()
  },
})

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

const sendDisabled = computed(
  () =>
    assistantThinking.value ||
    micState.value === MIC_STATES.listening ||
    micState.value === MIC_STATES.processing ||
    !inputText.value.trim(),
)

function syncComposerHeight() {
  const composer = chatInputRef.value
  if (!(composer instanceof HTMLTextAreaElement)) return
  const maxHeight = typeof window !== 'undefined' && window.innerWidth <= 768 ? 120 : 144
  composer.style.height = 'auto'
  composer.style.height = `${Math.min(composer.scrollHeight, maxHeight)}px`
  composer.style.overflowY = composer.scrollHeight > maxHeight ? 'auto' : 'hidden'
}

function handleComposerKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey) return
  const shouldSendOnEnter = typeof window === 'undefined' ? true : window.innerWidth > 768
  if (!shouldSendOnEnter) return
  event.preventDefault()
  if (!sendDisabled.value) {
    sendMessage()
  }
}

function clearChat() {
  messages.value = [createWelcomeMessage(userDisplayName.value)]
  lastAutoSpokenMessageId.value = null
  voiceRequestToken += 1
  voiceRequestingFor.value = null
  inputText.value = ''
  stopVoicePlayback()
  resetPlannerRecording()
  applyMicState(MIC_STATES.idle)
}

async function sendMessage() {
  const payload = inputText.value.trim()
  if (!payload || assistantThinking.value) return
  await ensureVoicePlaybackUnlocked()
  await sendQuery(payload)
  applyMicState(MIC_STATES.idle)
}

async function handleMicButton() {
  if (micState.value === MIC_STATES.processing) return
  if (plannerRecorderState.value === 'recording') {
    await stopRecording()
    return
  }
  await startRecording()
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
    const timezoneGuess =
      Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || dayjs.tz?.guess?.() || 'UTC'
    const response = await queryPlannerAssistant(query, {
      userId: userId.value,
      history,
      clientTimezone: timezoneGuess,
      clientNow: new Date().toISOString(),
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

function formatMessageText(text, sender) {
  const raw = String(text || '').trim()
  if (!raw) return ''
  if (sender !== 'assistant') return raw

  return raw
    .replace(/:\s+(?=\d+\.\s)/g, ':\n')
    .replace(/\s(?=\d+\.\s)/g, '\n')
    .replace(/([^.?!])\s+(?=(Would you|Do you|Should I|Can I|Need me|Let me know)\b)/g, '$1\n\n')
    .replace(/\n{3,}/g, '\n\n')
}

function runAction(_message, action) {
  if (!action) return
  if (action.status === 'pending') {
    ElMessage.info('This action needs a bit more detail. Let the assistant know how to proceed.')
    return
  }
  try {
    trackAISuggestionAccepted({
      suggestion_type: action.type || 'planner_action',
      label: action.label || undefined,
    })
  } catch (_) {}
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

async function startRecording() {
  if (assistantThinking.value) {
    ElMessage.info('Wait for the planner to finish before recording again.')
    return
  }
  try {
    await ensureVoicePlaybackUnlocked()
    voiceRequestToken += 1
    voiceRequestingFor.value = null
    stopVoicePlayback()
    await startPlannerRecording()
  } catch (err) {
    console.error('[TalkToPlanner] recording start failed', err)
    applyMicState(MIC_STATES.error)
    ElMessage.error(plannerRecorderError.value || 'Microphone unavailable. Please check permissions.')
  }
}

async function stopRecording() {
  try {
    await stopPlannerRecording()
  } catch (err) {
    console.error('[TalkToPlanner] recording stop failed', err)
    applyMicState(MIC_STATES.error)
    ElMessage.error(plannerRecorderError.value || 'Stopping the recording failed.')
  }
}

function applyMicState(state) {
  if (micState.value === state) return
  micState.value = state
}

function stageVoiceResult(text) {
  const cleaned = String(text || '').trim()
  if (!cleaned) return
  const existing = inputText.value ? inputText.value.trim() : ''
  inputText.value = existing ? `${existing} ${cleaned}`.trim() : cleaned
  applyMicState(MIC_STATES.idle)
}

onBeforeUnmount(() => {
  stopVoicePlayback()
  resetPlannerRecording()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', syncComposerHeight)
  }
})

watch(
  () => plannerRecorderState.value,
  (state) => {
    if (state === 'recording') {
      applyMicState(MIC_STATES.listening)
      return
    }
    if (state === 'transcribing') {
      applyMicState(MIC_STATES.processing)
      return
    }
    if (state === 'error') {
      applyMicState(MIC_STATES.error)
      if (plannerRecorderError.value) {
        ElMessage.error(plannerRecorderError.value)
      }
      resetPlannerRecording()
      return
    }
    if (state === 'idle') {
      applyMicState(MIC_STATES.idle)
    }
  },
)

watch(
  inputText,
  () => {
    nextTick(() => {
      syncComposerHeight()
    })
  },
  { flush: 'post' },
)

onMounted(() => {
  nextTick(() => {
    syncComposerHeight()
  })
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', syncComposerHeight, { passive: true })
  }
})
</script>

<style scoped>
.talk-planner-wrapper {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  min-height: 0;
  overflow: hidden;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding: 1rem;
  background: linear-gradient(180deg, rgba(25, 20, 40, 0.95), rgba(20, 18, 35, 0.98));
  border: 1px solid rgba(138, 120, 210, 0.2);
  border-radius: 1.25rem;
  box-shadow:
    0 0 30px rgba(90, 60, 150, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: #f9f8ff;
}

.talk-planner-page {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 1rem;
  gap: 0.9rem;
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
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.85rem 0 0;
  display: flex;
  flex-direction: column;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chat-body::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.chat-stream {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-height: 100%;
  padding-bottom: 0.5rem;
}

.chat-bubble {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  max-width: 78%;
  min-width: 0;
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
  flex: 0 0 auto;
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
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  color: rgba(243, 244, 255, 0.9);
}

.chat-text__content {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}

.chat-text__content--assistant {
  padding-right: 0.25rem;
}

.message-text {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  margin: 0;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.message-text--assistant {
  white-space: pre-line;
  line-height: 1.6;
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

.chat-input-dock {
  position: sticky;
  bottom: 0;
  z-index: 5;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.2rem);
  background:
    linear-gradient(180deg, rgba(79, 42, 160, 0), rgba(44, 23, 90, 0.3) 25%, rgba(23, 18, 40, 0.88));
}

.chat-input-dock--recording {
  background:
    linear-gradient(180deg, rgba(111, 61, 187, 0), rgba(82, 39, 150, 0.38) 25%, rgba(23, 18, 40, 0.94));
}

.chat-input-bar {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  flex-wrap: nowrap;
  flex: 0 0 auto;
  background: rgba(34, 29, 58, 0.92);
  border: 1px solid rgba(126, 109, 212, 0.28);
  border-radius: 1.1rem;
  padding: 0.8rem;
  box-shadow: 0 16px 32px rgba(20, 16, 40, 0.32);
  backdrop-filter: blur(12px);
}

.chat-input-bar--recording {
  border-color: rgba(168, 85, 247, 0.55);
  box-shadow: 0 0 18px rgba(168, 85, 247, 0.4);
}

.chat-input-row {
  display: flex;
  align-items: flex-end;
  gap: 0.65rem;
  flex: 1;
  min-width: 0;
  min-height: 64px;
  padding: 0.7rem 0.8rem;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 0 0 1px rgba(82, 64, 146, 0.14);
}

.chat-input {
  display: block;
  width: 100%;
  max-width: 100%;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 1.5rem;
  max-height: 9rem;
  background: transparent;
  border: none;
  color: #ffffff;
  font-family: inherit;
  font-size: 1rem;
  padding: 0.35rem 0.2rem;
  outline: none;
  resize: none;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chat-input::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.chat-input::placeholder {
  color: rgba(255, 255, 255, 0.45);
}

.mic-btn,
.send-btn {
  position: relative;
  border: none;
  color: #fff;
  height: 46px;
  min-width: 46px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  align-self: flex-end;
}

.mic-btn::after,
.send-btn::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  background: radial-gradient(circle at center, rgba(199, 210, 254, 0.35), rgba(76, 29, 149, 0));
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: -1;
}

.mic-btn:hover::after,
.send-btn:hover::after,
.mic-btn:focus-visible::after,
.send-btn:focus-visible::after {
  opacity: 1;
}

.mic-btn {
  width: 46px;
  height: 46px;
  min-width: 46px;
  padding: 0;
  border-radius: 0.9rem;
  border: 1px solid rgba(125, 211, 252, 0.38);
  background: radial-gradient(circle at 30% 30%, rgba(79, 70, 229, 0.38), rgba(14, 165, 233, 0.18));
  box-shadow: 0 10px 24px rgba(14, 165, 233, 0.28);
}

.mic-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(14, 165, 233, 0.36);
}

.mic-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mic-btn.active {
  border-color: rgba(167, 139, 250, 0.75);
  box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.16), 0 12px 28px rgba(99, 102, 241, 0.36);
}

.mic-visual {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: inherit;
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
}

.mic-btn--recording .mic-visual::before {
  background: linear-gradient(180deg, #fee2e2, #fda4af);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 7h2.75v10H9V7Zm4.25 0H16v10h-2.75V7Z'/%3E%3C/svg%3E")
    center / 17px 17px no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 7h2.75v10H9V7Zm4.25 0H16v10h-2.75V7Z'/%3E%3C/svg%3E")
    center / 17px 17px no-repeat;
  animation: mic-icon-breathe 0.95s ease-in-out infinite;
}

.mic-btn--processing .mic-visual::before {
  background: linear-gradient(180deg, #e0e7ff, #a5b4fc);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 12 6v2.2l3.4-3.2L12 1.8V4Z'/%3E%3C/svg%3E")
    center / 18px 18px no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 4a8 8 0 1 0 7.75 10h-2.1A6 6 0 1 1 12 6v2.2l3.4-3.2L12 1.8V4Z'/%3E%3C/svg%3E")
    center / 18px 18px no-repeat;
  animation: mic-icon-spin 0.9s linear infinite;
}

.mic-btn--processing .mic-visual {
  animation: mic-processing 0.95s ease-in-out infinite;
}

.send-btn {
  width: 46px;
  padding: 0;
  border-radius: 0.9rem;
  border: 1px solid rgba(165, 180, 252, 0.38);
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.55), rgba(14, 165, 233, 0.42));
  color: #fdf4ff;
  box-shadow: 0 12px 24px rgba(79, 70, 229, 0.4);
}

.send-btn .icon {
  width: 18px;
  height: 18px;
}

.send-btn:hover {
  background: rgba(140, 100, 255, 0.4);
  color: #ffffff;
  transform: translateY(-1px);
}

@keyframes mic-processing {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3);
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

/* .send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
} */

/* .mic-btn:disabled,
.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
} */

.icon-send path {
  stroke: currentColor;
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

@media (max-width: 768px) {
  .talk-planner-page {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .talk-planner-wrapper {
    padding: 0.85rem;
    border-radius: 1rem;
  }

  .chat-bubble {
    max-width: 92%;
  }

  .chat-input {
    font-size: 0.95rem;
  }

  .chat-input-bar {
    padding: 0.75rem;
  }

  .chat-input-row {
    min-height: 60px;
    padding: 0.65rem 0.7rem;
    border-radius: 0.85rem;
  }
}

@media (max-width: 540px) {
  .talk-planner-page {
    padding: 0.55rem;
  }

  .chat-input-bar {
    padding: 0.7rem;
  }

  .mic-indicator {
    order: 4;
    width: 100%;
    justify-content: center;
    margin: 0.35rem 0 0;
  }
}

@media (max-width: 640px) {
  .chat-input-row {
    width: 100%;
  }
}
</style>
