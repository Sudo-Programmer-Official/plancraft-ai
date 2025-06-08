<!-- <template>
  <div class="space-y-4">
    <el-input
      type="textarea"
      v-model="userMessage"
      placeholder="Ask how to improve features, tech stack, or timeline..."
      :rows="3"
      resize="none"
      class="w-full"
    />

    <div class="flex justify-end">
      <el-button type="primary" :loading="loading" @click="sendMessage"> Ask </el-button>
    </div>

    <div v-if="chatHistory.length" class="mt-6 space-y-4">
      <div
        v-for="(msg, index) in chatHistory"
        :key="index"
        class="p-4 rounded-md border border-gray-200 bg-gray-50"
      >
        <p class="text-sm text-gray-500 mb-2">{{ msg.role === 'user' ? 'You' : 'AI' }}:</p>
        <p class="text-gray-800 whitespace-pre-line">{{ msg.content }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { askAssistant } from '@/services/aiService'

const props = defineProps({
  quote: Object,
})

const userMessage = ref('')
const chatHistory = ref([])
const loading = ref(false)

async function sendMessage() {
  if (!userMessage.value.trim()) return

  loading.value = true
  const userInput = userMessage.value.trim()
  chatHistory.value.push({ role: 'user', content: userInput })
  userMessage.value = ''

  const fullPrompt = `Here is the current AI-generated quote:
  ${JSON.stringify(props.quote, null, 2)}
  
  The user asks: ${userInput}`

  try {
    const response = await askAssistant(fullPrompt)
    chatHistory.value.push({ role: 'assistant', content: response })
  } catch (err) {
    chatHistory.value.push({
      role: 'assistant',
      content: '⚠️ Something went wrong. Please try again.',
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.el-input__inner {
  font-family: inherit;
}
</style> -->
<template>
  <div class="space-y-4">
    <el-input
      type="textarea"
      v-model="userMessage"
      placeholder="Ask follow-up questions or tweak your quote..."
      :rows="3"
      resize="none"
      class="w-full"
    />

    <div class="flex justify-end">
      <el-button type="primary" :loading="loading" @click="sendMessage"> Ask Assistant </el-button>
    </div>

    <div v-if="chatLog.length" class="mt-6 space-y-4 max-h-[40vh] overflow-y-auto pr-2">
      <div
        v-for="(msg, index) in chatLog"
        :key="index"
        class="p-4 rounded-md border border-gray-200 bg-gray-50"
      >
        <p class="text-sm text-gray-500 mb-2">{{ msg.role === 'user' ? '👤 You' : '🤖 AI' }}:</p>
        <p class="text-gray-800 whitespace-pre-line">{{ msg.content }}</p>
      </div>
      <div id="chat-scroll-anchor"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuoteStore } from '@/stores/quoteStore'

const userMessage = ref('')
const loading = ref(false)

const quoteStore = useQuoteStore()
const chatLog = quoteStore.chatLog

// Auto-scroll to latest message
const scrollToBottom = () => {
  setTimeout(() => {
    const el = document.getElementById('chat-scroll-anchor')
    el?.scrollIntoView({ behavior: 'smooth' })
  }, 100)
}

async function sendMessage() {
  const message = userMessage.value.trim()
  if (!message) return

  loading.value = true
  try {
    await quoteStore.askAssistantMessage(message)
    userMessage.value = ''
    scrollToBottom()
  } catch (err) {
    quoteStore.addChatMessage({
      role: 'assistant',
      content: '⚠️ Something went wrong. Please try again.',
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.el-input__inner {
  font-family: inherit;
}
</style>
