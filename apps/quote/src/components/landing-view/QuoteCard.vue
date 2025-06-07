<template>
  <div v-if="quote" class="max-w-xl mx-auto mt-8">
    <el-card shadow="hover" class="bg-white">
      <div class="text-purple-700 text-2xl font-semibold mb-4">🎉 Your AI-Generated Quote</div>

      <div class="space-y-3 text-gray-800 text-base">
        <div>
          <span class="font-semibold">💡 Stack:</span>
          <span>{{ quote.stack }}</span>
        </div>
        <div>
          <span class="font-semibold">⏱️ Timeline:</span>
          <span>{{ quote.timeline }}</span>
        </div>
        <div>
          <span class="font-semibold">💰 Estimate:</span>
          <span>{{ quote.estimate }}</span>
        </div>
      </div>

      <!-- Optional Action Button -->
      <div class="mt-6 text-right">
        <el-button type="success" plain> Export as PDF </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { useQuoteStore } from '@/stores/quoteStore'
import { computed } from 'vue'
const quoteStore = useQuoteStore()
// const quote = quoteStore.quote
const quote = computed(() => quoteStore.quote)
</script>
