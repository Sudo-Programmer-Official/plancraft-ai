<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-8 lg:py-10 flex flex-col gap-5 h-full">
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="relative">
            <span
              class="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-500 shadow-lg shadow-indigo-900/60 text-xl"
            >
              🧠
            </span>
            <span class="absolute inset-0 rounded-full border border-indigo-400/40 animate-pulse"></span>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-semibold text-slate-100">Talk to Planner</h2>
            <p class="text-xs text-slate-300 sm:text-sm">
              Ask about tasks, reminders, or let me schedule things for you.
            </p>
          </div>
        </div>
        <el-button @click="clearChat" size="small" plain :disabled="isSending">
          Clear conversation
        </el-button>
      </header>

      <div
        ref="chatContainer"
        class="chat-box flex-1 overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 sm:p-5 space-y-3 shadow-inner shadow-slate-950/40"
      >
        <ChatBubble
          v-for="msg in messages"
          :key="msg.id"
          :sender="msg.sender"
          :text="msg.text"
        />
      </div>

      <footer class="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 shadow-inner shadow-slate-950/40">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <VoiceRecorder class="sm:self-center" @transcribed="sendQuery" />
          <el-input
            v-model="input"
            type="textarea"
            :rows="1"
            :autosize="{ minRows: 1, maxRows: 4 }"
            placeholder="Ask your planner anything..."
            class="flex-1"
            @keydown.enter.exact.prevent="sendQuery"
          />
          <el-button
            type="primary"
            :loading="isSending"
            :disabled="isSending || !input.trim()"
            class="self-stretch sm:self-auto sm:px-5"
            @click="sendQuery"
          >
            Send
          </el-button>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import VoiceRecorder from '@/components/VoiceRecorder.vue'
import ChatBubble from '@/components/ChatBubble.vue'
import { sendPlannerQuery } from '@/services/plannerService'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const input = ref('')
const isSending = ref(false)
const chatContainer = ref(null)

const makeId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`

const createMessage = (sender, text) => ({
  id: makeId(),
  sender,
  text,
})

const messages = ref([
  createMessage(
    'assistant',
    "Hi! I'm your planning assistant. I can check tasks, set reminders, crunch reports, or remember the details you've saved. How can I help right now?"
  ),
])

async function scrollToBottom() {
  await nextTick()
  const el = chatContainer.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

async function sendQuery(externalText) {
  const content = typeof externalText === 'string' ? externalText : input.value
  const trimmed = String(content || '').trim()
  if (!trimmed || isSending.value) return

  messages.value.push(createMessage('user', trimmed))
  input.value = ''
  await scrollToBottom()

  isSending.value = true
  try {
    const response = await sendPlannerQuery(trimmed, { userId: authStore?.user?.uid })
    const reply =
      typeof response?.reply === 'string' && response.reply.trim().length
        ? response.reply.trim()
        : "I'm here, but I didn't get a response. Could you try asking again?"
    messages.value.push(createMessage('assistant', reply))
  } catch (error) {
    console.error('Planner query failed:', error)
    ElMessage.error('Planner assistant is unavailable right now.')
    messages.value.push(
      createMessage(
        'assistant',
        "I couldn't reach my planning tools just now. Please try again in a moment."
      )
    )
  } finally {
    isSending.value = false
    await scrollToBottom()
  }
}

function clearChat() {
  messages.value = [
    createMessage(
      'assistant',
      "Conversation cleared. What should we work on next?"
    ),
  ]
  input.value = ''
  scrollToBottom()
}

onMounted(scrollToBottom)
</script>

<style scoped>
.chat-box::-webkit-scrollbar {
  width: 6px;
}
.chat-box::-webkit-scrollbar-thumb {
  background-color: rgba(99, 102, 241, 0.35);
  border-radius: 9999px;
}
.chat-box::-webkit-scrollbar-track {
  background: transparent;
}
</style>
