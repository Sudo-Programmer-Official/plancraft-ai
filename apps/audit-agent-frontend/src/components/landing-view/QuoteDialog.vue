<template>
  <transition name="fade">
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
      <!-- <div class="flex items-center justify-between mb-4">
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
      </div> -->
      <!-- Header -->
      <div class="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 mb-4">
        <h2 class="text-2xl font-bold text-purple-700 flex items-center gap-2 leading-snug">
          🎉 Your AI-Generated Quote
          <span class="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full">
            AI Powered
          </span>
        </h2>
        <el-select
          v-model="selectedVersion"
          placeholder="View past versions"
          size="small"
          class="ml-auto sm:max-w-[200px] w-full truncate"
        >
          <el-option
            v-for="q in quoteStore.quoteHistory"
            :key="q.version"
            :label="`v${q.version} • ${new Date(q.createdAt).toLocaleDateString()}`"
            :value="q.version"
          />
        </el-select>
      </div>

      <!-- Split Panel -->
      <div
        class="max-h-[65vh] overflow-y-auto flex flex-col lg:flex-row gap-8 text-gray-800 text-base leading-relaxed scrollbar-plan"
      >
        <!-- Quote Summary -->
        <div class="lg:w-2/3 space-y-6 pr-2">
          <!-- <QuoteSection title="💡 Stack Recommendation" :content="quote.stack" />
          <QuoteSection title="🗓️ Timeline Estimate" :content="quote.timeline" />
          <QuoteSection title="💰 Cost Estimate" :content="quote.estimate" />
          <QuoteSection title="🧩 Suggested Features" :content="quote.features?.join(', ')" />
          <QuoteSection title="⚙️ Why This Stack?" :content="quote.notes" />
          <QuoteSection title="📊 Market Insight" :content="quote.marketInsight" /> -->
          <QuoteSection
            v-for="section in quoteSections"
            :key="section.key"
            :title="`${section.icon} ${section.title}`"
            :content="quote[section.key] || '-'"
          />
        </div>

        <!-- Chat Assistant -->
        <div
          class="lg:w-1/3 bg-gray-50 rounded-xl border border-gray-200 p-4 flex flex-col shadow-sm"
        >
          <h3 class="font-semibold text-sm text-gray-700 mb-3">🗣️ Ask Assistant</h3>
          <ChatAssistant
            v-if="quote"
            :quote="quote"
            :key="quote?.version || quote?.createdAt || 'chat'"
          />
        </div>
      </div>
      <!-- Footer -->
      <template #footer>
        <div class="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
          <div class="flex gap-3">
            <el-button plain type="info" @click="viewFinal = true">📝 View Final Report</el-button>
            <el-button type="primary" @click="finalizeQuote">📌 Finalize This Quote</el-button>
            <el-button plain @click="handleExport('docx')">Export as DOCX</el-button>
            <el-button type="success" plain @click="handleExport('pdf')">Export as PDF</el-button>
            <!-- <el-button type="primary" plain @click="handleExport('zip')"
              >Export All (ZIP)</el-button
            > -->
          </div>
          <div>
            <p class="text-xs text-gray-500">Quote generated using GPT-4 + industry presets</p>
          </div>
        </div>
      </template>
    </el-dialog>
  </transition>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { trackEvent } from '@/utils/mixpanel'
import { useQuoteStore } from '@/stores/quoteStore'
import { ElMessage } from 'element-plus'
import { exportPDF, exportZip, exportMarkdown, exportDocx } from '@/utils/exportUtils'
import { useWindowSize } from '@vueuse/core'
import ChatAssistant from './ChatAssistant.vue'
import QuoteSection from './QuoteSection.vue'
import { saveAs } from 'file-saver'

const quoteStore = useQuoteStore()
const quote = computed(() => quoteStore.quote)
const chatLog = computed(() => quoteStore.chatLog)

const visible = ref(false)
const activeSections = ref(['chat'])
const selectedVersion = ref(null)

const quoteSections = [
  { title: 'Vision Summary', icon: '🎯', key: 'vision' },
  { title: 'Stack Recommendation', icon: '💡', key: 'stack' },
  { title: 'Architecture Plan', icon: '🏗️', key: 'architecture' },
  { title: 'Suggested Features', icon: '🧩', key: 'features' },
  { title: 'Timeline Estimate', icon: '📆', key: 'timeline' },
  { title: 'Cost Estimate', icon: '💰', key: 'estimate' },
  { title: 'Market Insight', icon: '📊', key: 'marketInsight' },
  { title: 'Risks & Assumptions', icon: '⚠️', key: 'notes' },
  { title: 'Next Steps', icon: '🚀', key: 'nextSteps' },
]

const { width } = useWindowSize()
const dialogWidth = computed(() => (width.value < 640 ? '90vw' : '80%'))

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
// function finalizeQuote(type = 'pdf') {
//   if (!quote.value) return

//   quoteStore.finalizeCurrentQuote()
//   const latestFinal = quoteStore.latestFinalizedQuote
//   if (!latestFinal) return

//   if (type === 'pdf') exportPDF(latestFinal.quote, latestFinal.chatLog || [])
//   if (type === 'zip') exportZip(latestFinal.quote, latestFinal.chatLog || [])
//   if (type === 'md') {
//     const md = exportMarkdown(latestFinal.quote, latestFinal.chatLog || [])
//     const blob = new Blob([md], { type: 'text/markdown' })
//     saveAs(blob, 'quote-summary.md')
//   }

//   console.log('✅ Finalized & exported:', latestFinal)
// }
async function finalizeQuote(type = 'pdf') {
  if (!quote.value || !chatLog.value) return

  try {
    // 🔁 Regenerate finalized version using backend
    const regenerated = await quoteStore.finalizeAndRegenerateQuote({
      quote: quote.value,
      chatLog: chatLog.value,
    })

    // 💾 Save it into the store (optional if store tracks finalized separately)
    quoteStore.finalizedQuotes.push({
      version: quoteStore.versionCounter++,
      idea: quoteStore.idea,
      quote: regenerated,
      chatLog: [...chatLog.value],
      finalizedAt: new Date().toISOString(),
    })
    trackEvent('Quote Finalized', {
      version: quoteStore.versionCounter,
      idea: quoteStore.idea,
    })

    // // 📁 Then export as per requested format
    // if (type === 'pdf') exportPDF(regenerated, chatLog.value)
    // if (type === 'zip') exportZip(regenerated, chatLog.value)
    // if (type === 'md') {
    //   const md = exportMarkdown(regenerated, chatLog.value)
    //   const blob = new Blob([md], { type: 'text/markdown' })
    //   saveAs(blob, 'quote-summary.md')
    // }
  } catch (err) {
    console.error('❌ Finalization via backend failed:', err)
  }
}

function handleClose() {
  visible.value = false
}

// function finalizeQuote() {
//   if (!quote.value) return
//   quoteStore.quoteHistory.push({
//     version: quoteStore.versionCounter++,
//     idea: quoteStore.idea,
//     quote: quote.value,
//     chatLog: [...quoteStore.chatLog],
//     createdAt: new Date().toISOString(),
//   })
// }

function handleExport(type) {
  if (!quote.value) return
  if (type === 'pdf') exportPDF(quote.value, chatLog.value || [])
  if (type === 'zip') exportZip(quote.value, chatLog.value || [])
  if (type === 'docx') exportDocx(quote.value, chatLog.value || [])
  if (type === 'md') {
    const md = exportMarkdown(quote.value, chatLog.value || [])
    const blob = new Blob([md], { type: 'text/markdown' })
    saveAs(blob, 'quote-summary.md')
  }
  ElMessage.success('📝 Finalized and exported!')
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
@media (max-width: 640px) {
  .custom-quote-dialog .el-dialog__body {
    flex-direction: column !important;
    padding: 0.5rem;
  }
}
.custom-quote-dialog {
  overflow-x: hidden;
}
@media (max-width: 640px) {
  .custom-quote-dialog .el-dialog__body {
    flex-direction: column !important;
    padding: 0.5rem;
  }

  .custom-quote-dialog h2 {
    font-size: 1.25rem !important; /* shrink headline */
    flex-wrap: wrap;
    line-height: 1.3;
  }

  .custom-quote-dialog .el-select {
    width: 100% !important;
    margin-top: 0.5rem;
  }

  .custom-quote-dialog .el-dialog__header {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0.5rem;
  }
}
</style>
