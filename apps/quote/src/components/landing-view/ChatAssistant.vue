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
      ref="chatInput"
      type="textarea"
      v-model="userMessage"
      autofocus
      placeholder="Ask follow-up questions or tweak your quote..."
      :rows="3"
      resize="none"
      class="w-full"
    />
    <!-- File Upload -->
    <el-upload
      class="upload-demo"
      :auto-upload="false"
      :multiple="true"
      :on-change="handleFileChange"
      :show-file-list="false"
      accept=".pdf,.txt,.docx,.md"
    >
      <p class="text-xs text-gray-400 mt-1">
        You can attach pitch decks, briefs, or product docs for better answers.
      </p>
      <el-button text :icon="Plus">
        <span class="text-sm text-gray-600">Attach a file</span>
      </el-button>
    </el-upload>

    <!-- File Preview -->
    <div v-if="selectedFiles.length" class="text-xs text-gray-700">
      <span class="font-semibold">Attached:</span>
      <span v-for="(file, index) in selectedFiles" :key="index" class="ml-2">
        {{ file.name }}
      </span>
    </div>

    <div class="flex justify-end">
      <el-button type="primary" :loading="loading" @click="sendMessage"> Ask Assistant </el-button>
    </div>

    <div v-if="chatLog.length" class="mt-6 space-y-4 max-h-[40vh] overflow-y-auto pr-2">
      <div
        v-for="(msg, index) in chatLog"
        :key="index"
        :class="[
          'p-4 rounded-md border text-sm',
          msg.role === 'user'
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-gray-50 border-gray-200 text-gray-800',
        ]"
      >
        <p class="text-xs font-semibold mb-1">
          {{ msg.role === 'user' ? '👤 You' : '🤖 AI Assistant' }}
        </p>
        <p class="whitespace-pre-line">{{ msg.content }}</p>
        <div id="chat-scroll-anchor"></div>
      </div>
    </div>
    <div v-else class="text-gray-400 text-sm text-center mt-4">
      💬 Ask a follow-up question about your quote.
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useQuoteStore } from '@/stores/quoteStore'
import useMultiFileUpload from '@/composables/useMultiFileUpload'
import { Plus } from '@element-plus/icons-vue'

const selectedFiles = ref([])
const { uploadFiles, downloadUrls } = useMultiFileUpload()

function handleFileChange(fileObj) {
  selectedFiles.value = fileObj.fileList.map((f) => f.raw)
}

const userMessage = ref('')
const loading = ref(false)

const quoteStore = useQuoteStore()
const chatLog = quoteStore.chatLog

const chatInput = ref(null)
onMounted(() => chatInput.value?.focus())

// Auto-scroll to latest message
const scrollToBottom = () => {
  setTimeout(() => {
    const el = document.getElementById('chat-scroll-anchor')
    el?.scrollIntoView({ behavior: 'smooth' })
  }, 100)
}

// async function sendMessage() {
//   const message = userMessage.value.trim()
//   if (!message) return
//   if (selectedFiles.value.length > 0) {
//     await uploadFiles(selectedFiles.value)
//     const fileUrl = downloadUrls.value?.[0] || ''
//     await quoteStore.askAssistantMessageWithFile(userMessage.value, fileUrl)
//   } else {
//     await quoteStore.askAssistantMessage(userMessage.value)
//   }
//   loading.value = true
//   try {
//     await quoteStore.askAssistantMessage(message)
//     userMessage.value = ''
//     scrollToBottom()
//   } catch (err) {
//     quoteStore.addChatMessage({
//       role: 'assistant',
//       content: '⚠️ Something went wrong. Please try again.',
//     })
//   } finally {
//     loading.value = false
//   }
// }
async function sendMessage() {
  const message = userMessage.value.trim()
  if (!message) return

  loading.value = true

  try {
    if (selectedFiles.value.length > 0) {
      await uploadFiles(selectedFiles.value)
      const fileUrl = downloadUrls.value?.[0] || ''
      await quoteStore.askAssistantMessageWithFile(message, fileUrl)
    } else {
      await quoteStore.askAssistantMessage(message)
    }
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
