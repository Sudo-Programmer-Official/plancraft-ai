// quoteStore.js
import { defineStore } from 'pinia'
import { fetchQuote } from '@/services/quoteService'
// import fetchQuote from '@/services/quoteService'

export const useQuoteStore = defineStore('quote', {
  state: () => ({
    idea: '',
    quote: null,
    loading: false,
  }),
  actions: {
    async generateQuote() {
      this.loading = true
      try {
        this.quote = await fetchQuote(this.idea)
      } catch (err) {
        console.error('Quote fetch failed:', err)
      } finally {
        this.loading = false
      }
    },
  },
})
