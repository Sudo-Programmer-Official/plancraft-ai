<template>
  <div class="bg-white shadow-lg rounded-xl p-6 space-y-6 w-full">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-purple-700">Your Latest Quote</h2>
      <el-tag type="success" v-if="quote">v{{ quoteStore.versionCounter - 1 }}</el-tag>
    </div>

    <div v-if="quote" class="space-y-4">
      <QuoteSection title="💡 Stack Recommendation" :content="quote.stack" />
      <QuoteSection title="📆 Timeline Estimate" :content="quote.timeline" />
      <QuoteSection title="💰 Cost Estimate" :content="quote.estimate" />
      <QuoteSection title="🧩 Suggested Features" :content="quote.features?.join(', ')" />
      <QuoteSection title="⚙️ Why This Stack?" :content="quote.notes" />
      <QuoteSection title="📊 Market Insight" :content="quote.marketInsight" />
    </div>

    <div v-else class="text-gray-400 italic">No quote available. Please generate one.</div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t">
      <el-button @click="$emit('edit')" icon="Edit">Refine</el-button>
      <el-button type="primary" @click="$emit('open-dialog')">View Full</el-button>
    </div>
  </div>
</template>

<script setup>
import { useQuoteStore } from '@/stores/quoteStore'
import QuoteSection from './QuoteSection.vue' // Optional small component for clean reuse

const quoteStore = useQuoteStore()
const quote = quoteStore.quote
</script>
