<template>
  <div class="talk-planner-wrapper">
    <header class="talk-header">
      <h2 class="talk-title">
        <span class="text-pink-400">🧠</span>
        Talk to Planner
      </h2>
      <button
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
    </header>

    <transition name="toast-fade">
      <div v-if="isRecording" class="listening-toast">
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
            <p v-if="message.text">{{ message.text }}</p>

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
      :class="{ 'chat-input-bar--recording': isRecording || isTranscribing }"
    >
      <button
        @click="startRecording"
        :class="['mic-btn', { active: isRecording || isTranscribing }]"
        :title="isRecording ? 'Stop recording' : 'Start voice input'"
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
import { useAuthStore } from '@/stores/authStore'
import { ElMessage } from 'element-plus'
import { recordAndSendToBackend } from '@/utils/backendRecorder'
import { trackEvent } from '@/services/analytics'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const authStore = useAuthStore()

const assistantThinking = ref(false)
const inputText = ref('')
const chatContainer = ref(null)
const messageSeed = ref(0)
const isRecording = ref(false)
const isTranscribing = ref(false)
let recorder = null

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

const sendDisabled = computed(() => assistantThinking.value || !inputText.value.trim())

function clearChat() {
  messages.value = [createWelcomeMessage(userDisplayName.value)]
}

function sendMessage() {
  if (!sendDisabled.value) {
    sendQuery()
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

function handleVoiceTranscript(text, isFinal = false) {
  if (!text) return
  inputText.value = text
  if (isFinal && !assistantThinking.value) {
    sendQuery(text)
  }
}

async function startRecording() {
  try {
    if (!isRecording.value) {
      if (assistantThinking.value) {
        ElMessage.info('Wait for the planner to finish before recording again.')
        return
      }
      inputText.value = ''
      isTranscribing.value = false
      recorder = await recordAndSendToBackend((text, isFinal) => {
        handleVoiceTranscript(text, isFinal)
        if (isFinal) {
          isTranscribing.value = false
          trackEvent('Voice Transcribed', { length: text?.length || 0 })
        }
      })
      isRecording.value = true
    } else {
      await stopRecording()
    }
  } catch (err) {
    console.error('🎤 Recording error:', err)
    isRecording.value = false
    isTranscribing.value = false
    ElMessage.error('Microphone unavailable. Please check permissions.')
  }
}

async function stopRecording() {
  if (!recorder) return
  isRecording.value = false
  isTranscribing.value = true
  try {
    if (typeof recorder._stop === 'function') {
      await recorder._stop()
    }
  } finally {
    recorder = null
    if (isTranscribing.value) {
      isTranscribing.value = false
    }
  }
}

onBeforeUnmount(() => {
  if (isRecording.value || isTranscribing.value) {
    stopRecording()
  }
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
