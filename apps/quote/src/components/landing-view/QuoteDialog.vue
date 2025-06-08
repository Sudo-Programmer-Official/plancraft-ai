<template>
  <el-dialog
    v-model="visible"
    :width="dialogWidth"
    :append-to-body="true"
    :close-on-click-modal="false"
    :before-close="handleClose"
    class="rounded-xl"
    :custom-class="'custom-quote-dialog'"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold text-purple-700 flex items-center gap-2">
        🎉 Your AI-Generated Quote
        <span class="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full">
          AI Powered
        </span>
      </h2>
      <el-select
        v-model="selectedVersion"
        placeholder="View past versions"
        size="small"
        class="ml-auto max-w-[160px] sm:max-w-[200px] truncate"
      >
        <el-option
          v-for="q in quoteStore.quoteHistory"
          :key="q.version"
          :label="`v${q.version} • ${new Date(q.createdAt).toLocaleDateString()}`"
          :value="q.version"
        />
      </el-select>
    </div>

    <!-- Body -->
    <div
      class="max-h-[65vh] overflow-y-auto pr-2 space-y-8 text-gray-800 text-base leading-relaxed"
    >
      <QuoteSection title="💡 Stack Recommendation" :content="quote.stack" />
      <QuoteSection title="🗓️ Timeline Estimate" :content="quote.timeline" />
      <QuoteSection title="💰 Cost Estimate" :content="quote.estimate" />
      <QuoteSection title="🧩 Suggested Features" :content="quote.features?.join(', ')" />
      <QuoteSection title="⚙️ Why This Stack?" :content="quote.notes" />
      <QuoteSection title="📊 Market Insight" :content="quote.marketInsight" />
    </div>

    <!-- Assistant -->
    <div class="mt-8">
      <el-collapse v-model="activeSections">
        <el-collapse-item name="chat" title="🗣️ Want to tweak or ask questions?">
          <ChatAssistant
            v-if="quote"
            :quote="quote"
            :key="quote?.version || quote?.createdAt || 'chat'"
          />
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
        <p class="text-xs text-gray-500">Quote generated using GPT-4 + industry presets</p>
        <div class="flex gap-3">
          <el-button type="success" plain @click="handleExport('pdf')">Export as PDF</el-button>
          <el-button type="primary" plain @click="handleExport('zip')">Export All (ZIP)</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { useQuoteStore } from '@/stores/quoteStore'
import { exportPDF, exportZip, exportMarkdown } from '@/utils/exportUtils'
import { useWindowSize } from '@vueuse/core'
import ChatAssistant from './ChatAssistant.vue'
import QuoteSection from './QuoteSection.vue'

const quoteStore = useQuoteStore()
const quote = computed(() => quoteStore.quote)
const chatLog = computed(() => quoteStore.chatLog)

const visible = ref(false)
const activeSections = ref(['chat'])
const selectedVersion = ref(null)

const { width } = useWindowSize()
const dialogWidth = computed(() => (width.value < 640 ? '90vw' : '40%'))

watch(selectedVersion, (version) => {
  if (version) quoteStore.revertToVersion(version)
})

watch(quote, async (newVal) => {
  if (newVal) {
    await nextTick()
    visible.value = true
    document.querySelector('.custom-quote-dialog')?.scrollIntoView({ behavior: 'smooth' })
  }
})

function handleClose() {
  visible.value = false
}

function handleExport(type) {
  if (!quote.value) return
  if (type === 'pdf') exportPDF(quote.value, chatLog.value || [])
  if (type === 'zip') exportZip(quote.value, chatLog.value || [])
  if (type === 'md') {
    const md = exportMarkdown(quote.value, chatLog.value || [])
    const blob = new Blob([md], { type: 'text/markdown' })
    saveAs(blob, 'quote-summary.md')
  }
}
</script>

<style scoped lang="scss">
.custom-quote-dialog .el-dialog__body {
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 1rem;
}
.custom-quote-dialog .el-dialog__body::-webkit-scrollbar {
  width: 6px;
}
.custom-quote-dialog .el-dialog__body::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
.el-select .el-input__inner {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
