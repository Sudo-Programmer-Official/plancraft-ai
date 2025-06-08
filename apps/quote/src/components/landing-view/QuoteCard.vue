<template>
  <QuoteDialog />
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useQuoteStore } from '@/stores/quoteStore'
import QuoteDialog from './QuoteDialog.vue'
import { computed } from 'vue'
const quoteStore = useQuoteStore()
const quote = computed(() => quoteStore.quote)
const quoteCardRef = ref(null)

watch(quote, async (newVal) => {
  if (newVal) {
    await nextTick()
    quoteCardRef.value?.scrollIntoView({ behavior: 'smooth' })
  }
})
</script>
