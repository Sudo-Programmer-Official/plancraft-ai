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
        <p class="whitespace-pre-line" v-if="msg.content && !tryParseJson(msg.content)">
          {{ msg.content }}
        </p>
        <!-- <div v-if="msg.role === 'assistant'" class="text-right mt-2">
          <el-button size="small" type="primary" plain @click="applyToQuote(msg.content)">
            📌 Apply to Quote
          </el-button>
        </div> -->

        <div
          v-else-if="tryParseJson(msg.content)"
          class="bg-gray-50 border border-dashed border-gray-300 p-3 rounded-md text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto"
        >
          <pre>{{ JSON.stringify(tryParseJson(msg.content), null, 2) }}</pre>
        </div>

        <div v-else class="whitespace-pre-line">
          {{ msg.content }}
        </div>
      </div>
      <div id="chat-scroll-anchor"></div>
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
import { ElMessage } from 'element-plus'
import { autoAppendToQuote } from '@/utils/helper'

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
function applyToQuote(content) {
  console.log('Applying to quote:', content)
  if (!content || content === 'null') {
    ElMessage.warning('⚠️ Nothing to apply.')
    return
  }
  autoAppendToQuote(content, quoteStore)
  ElMessage.success('Added to quote successfully!')
}
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
    console.log('Error in sendMessage:', err)
    quoteStore.addChatMessage({
      role: 'assistant',
      content: '⚠️ Something went wrong. Please try again.',
    })
  } finally {
    loading.value = false
  }
}
// function tryParseJson(str) {
//   console.log('Trying to parse JSON:', str)
//   if (typeof str !== 'string') return null
//   try {
//     return JSON.parse(str)
//   } catch (e) {
//     console.error('Error parsing JSON:', e)
//     return null
//   }
// }
function tryParseJson(str) {
  if (!str || typeof str !== 'string') return null
  const trimmed = str.trim()
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null
  try {
    return JSON.parse(trimmed)
  } catch (e) {
    console.error('Error parsing JSON:', e)
    return null
  }
}
</script>

<style scoped>
.el-input__inner {
  font-family: inherit;
}
</style>
