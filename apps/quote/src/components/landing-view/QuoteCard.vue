<template>
  <div v-if="quote" class="max-w-2xl mx-auto mt-10">
    <el-card shadow="hover" class="bg-white rounded-xl border border-gray-200 px-6 py-8">
      <div class="text-purple-700 text-2xl font-bold mb-6 flex items-center gap-2">
        🎉 Your AI-Generated Quote
        <span class="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full"
          >AI Powered</span
        >
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
    </el-card>
  </div>
</template>

<script setup>
import { useQuoteStore } from '@/stores/quoteStore'
import { computed } from 'vue'
const quoteStore = useQuoteStore()
const quote = computed(() => quoteStore.quote)
</script>
