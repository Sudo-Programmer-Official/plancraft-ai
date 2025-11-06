<template>
  <div
    class="planner-chat min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white flex flex-col"
  >
    <div class="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div class="flex items-center gap-3">
          <div class="assistant-orb" aria-hidden="true"></div>
          <div>
            <h2 class="text-2xl sm:text-3xl font-semibold text-slate-50 flex items-center gap-2">
              <span>🧠</span>
              <span>Talk to Planner</span>
            </h2>
            <p class="text-sm sm:text-base text-slate-300">
              Ask about your tasks, reminders, secure docs, or request actions. One assistant, all
              your workflows.
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <el-button size="small" plain @click="clearChat" :disabled="assistantThinking">
            Clear
          </el-button>
        </div>
      </header>

      <div
        ref="chatContainer"
        class="chat-box flex-1 overflow-y-auto bg-slate-950/60 border border-slate-800/60 rounded-3xl px-4 sm:px-6 py-6 space-y-4 shadow-inner shadow-indigo-950/40"
      >
        <TransitionGroup name="fade-up" tag="div" class="space-y-4 flex flex-col">
          <ChatBubble
            v-for="message in messages"
            :key="message.id"
            :sender="message.sender"
            :text="message.text"
            :typing="message.typing"
            :actions="message.actions"
            :name="userDisplayName"
            @action="runAction(message, $event)"
          />
        </TransitionGroup>

        <ChatBubble
          v-if="assistantThinking"
          key="assistant-typing"
          sender="assistant"
          typing
          text=""
        />
      </div>

      <footer
        class="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-950/70 border border-slate-800/70 rounded-3xl px-4 py-4 shadow-xl shadow-indigo-950/30"
      >
        <VoiceRecorder
          class="sm:w-auto"
          @transcribed="handleVoiceTranscript"
        />
        <el-input
          v-model="input"
          :disabled="assistantThinking"
          placeholder="Ask your planner anything — “Share my focus tasks”, “Log a client call”, “What’s my Aadhaar number?”"
          @keyup.enter="triggerSend"
        />
        <el-button type="primary" :loading="assistantThinking" :disabled="sendDisabled" @click="sendQuery">
          Send
        </el-button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import ChatBubble from '@/components/ChatBubble.vue'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import { queryPlannerAssistant } from '@/services/plannerService'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()

const assistantThinking = ref(false)
const input = ref('')
const chatContainer = ref(null)
const messageSeed = ref(0)

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

const sendDisabled = computed(() => assistantThinking.value || !input.value.trim())

function clearChat() {
  messages.value = [createWelcomeMessage(userDisplayName.value)]
}

function triggerSend() {
  if (!sendDisabled.value) sendQuery()
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
  const rawInput = forcedInput != null ? forcedInput : input.value
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
  }

  messages.value.push(userMessage)
  input.value = ''
  assistantThinking.value = true

  try {
    const history = historyForRequest(userMessageId)
    const response = await queryPlannerAssistant(query, {
      userId: userId.value,
      history,
    })

    const assistantMessage = {
      id: `assistant-${Date.now()}-${messageSeed.value++}`,
      sender: 'assistant',
      text: response.reply || "I'm on it!",
      actions: normalizeActions(response.actions),
    }
    messages.value.push(assistantMessage)
  } catch (err) {
    const fallback = typeof err.message === 'string' ? err.message : 'Something went wrong.'
    messages.value.push({
      id: `assistant-error-${Date.now()}-${messageSeed.value++}`,
      sender: 'assistant',
      text: fallback,
      actions: [],
    })
  } finally {
    assistantThinking.value = false
  }
}

function normalizeActions(actions) {
  if (!Array.isArray(actions)) return []
  return actions.map((action, idx) => {
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

function prettifyActionType(type) {
  return String(type || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
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

function handleVoiceTranscript(text, isFinal = false) {
  if (!text) return
  input.value = text
  if (isFinal) {
    sendQuery(text)
  }
}
</script>

<style scoped>
.assistant-orb {
  width: 52px;
  height: 52px;
  border-radius: 9999px;
  background: radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.95), rgba(56, 189, 248, 0.6));
  box-shadow:
    0 0 24px rgba(99, 102, 241, 0.65),
    inset 0 0 18px rgba(56, 189, 248, 0.45);
  animation: orbPulse 4s ease-in-out infinite;
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 220ms ease;
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@keyframes orbPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      0 0 24px rgba(99, 102, 241, 0.65),
      inset 0 0 18px rgba(56, 189, 248, 0.38);
  }
  50% {
    transform: scale(1.06);
    box-shadow:
      0 0 36px rgba(129, 140, 248, 0.75),
      inset 0 0 26px rgba(59, 130, 246, 0.45);
  }
}
</style>
