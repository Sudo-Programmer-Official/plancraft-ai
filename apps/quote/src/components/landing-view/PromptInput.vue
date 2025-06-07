<!-- <template>
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
</script> -->

<template>
  <div
    class="py-16 text-center px-4 bg-white shadow-inner rounded-xl max-w-3xl mx-auto -mt-20 z-10 relative"
  >
    <el-input
      v-model="quoteStore.idea"
      placeholder="e.g. AI app for book summaries"
      size="large"
      class="w-full max-w-xl mx-auto mb-4 rounded"
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
      class="w-full max-w-xs"
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
