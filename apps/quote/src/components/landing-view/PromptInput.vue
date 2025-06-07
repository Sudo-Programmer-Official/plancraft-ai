<template>
  <div class="py-12 text-center px-4" id="quote">
    <el-input
      v-model="quoteStore.idea"
      placeholder="e.g. AI app for book summaries"
      size="large"
      class="w-full max-w-xl mx-auto mb-4"
      :disabled="quoteStore.loading"
      clearable
    >
      <template #prefix>
        <el-icon><Edit /></el-icon>
      </template>
    </el-input>

    <el-button
      type="primary"
      size="large"
      class="w-full max-w-xs mt-2"
      :loading="quoteStore.loading"
      @click="quoteStore.generateQuote"
    >
      {{ quoteStore.loading ? 'Generating...' : 'Generate Quote' }}
    </el-button>
  </div>
</template>

<script setup>
import { useQuoteStore } from '@/stores/quoteStore'
import { Edit } from '@element-plus/icons-vue'

const quoteStore = useQuoteStore()
</script>
