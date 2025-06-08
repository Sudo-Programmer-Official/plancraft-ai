<template>
  <el-dialog
    v-model="visible"
    title="🎉 Your AI-Generated Quote"
    width="600px"
    class="rounded-xl"
    :close-on-click-modal="false"
    :append-to-body="true"
    :before-close="handleClose"
  >
    <!-- Scrollable Content Area -->
    <div class="max-h-[65vh] overflow-y-auto pr-2">
      <div class="text-purple-700 text-2xl font-bold mb-6 flex items-center gap-2">
        🎉 Your AI-Generated Quote
        <span class="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full">
          AI Powered
        </span>
      </div>

      <div class="space-y-4 text-gray-800 text-base">
        <div class="flex items-start gap-2">
          <span class="font-semibold">💡 Stack:</span>
          <span>{{ quote.stack }}</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="font-semibold">⏱️ Timeline:</span>
          <span>{{ quote.timeline }}</span>
        </div>
        <div class="flex items-start gap-2">
          <span class="font-semibold">💰 Estimate:</span>
          <span>{{ quote.estimate }}</span>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p class="text-xs text-gray-500">Quote generated using GPT-4 + engineering presets</p>
        <div class="flex gap-3">
          <el-button type="success" plain> Export as PDF </el-button>
          <el-button type="primary" plain> Email this </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useQuoteStore } from '@/stores/quoteStore'

const quoteStore = useQuoteStore()
const quote = computed(() => quoteStore.quote)
const visible = ref(false)

watch(quote, async (newVal) => {
  if (newVal) {
    await nextTick()
    visible.value = true
  }
})

function handleClose() {
  visible.value = false
}
</script>
