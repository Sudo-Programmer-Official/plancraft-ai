// quoteStore.js
import { defineStore } from 'pinia'
// import { fetchQuote } from '@/services/quoteService'
import {
  fetchQuote,
  askAssistant,
  fetchQuoteWithFile,
  finalizeQuoteWithChat,
} from '@/services/quoteService'

export const useQuoteStore = defineStore('quote', {
  state: () => ({
    idea: '',
    quote: null,
    loading: false,
    quoteHistory: [],
    chatLog: [],
    versionCounter: 1,
    finalizedQuotes: [], // ✅ NEW
  }),
  getters: {
    getters: {
      latestFinalizedQuote: (state) => state.finalizedQuotes.at(-1),
    },
  },
  actions: {
    async generateQuote() {
      this.loading = true
      try {
        const result = await fetchQuote(this.idea)
        this.quote = result
        this.chatLog = [] // reset chat
        this.quoteHistory.push({
          version: this.versionCounter++,
          idea: this.idea,
          quote: result,
          chatLog: [],
          createdAt: new Date().toISOString(),
        })
      } catch (err) {
        console.error('Quote fetch failed:', err)
      } finally {
        this.loading = false
      }
    },
    async finalizeAndRegenerateQuote() {
      if (!this.quote || this.chatLog.length === 0) {
        console.warn('Quote or chat log missing.')
        return
      }
      try {
        const result = await finalizeQuoteWithChat({
          idea: this.quote,
          chatLog: this.chatLog,
        })
        this.quote = result // overwrite or merge
        this.finalizedQuotes.push({
          quote: result,
          version: this.versionCounter++,
          finalizedAt: new Date().toISOString(),
          idea: this.idea,
          chatLog: [...this.chatLog],
        })
        return result
      } catch (err) {
        console.error('❌ Finalize failed', err)
      }
    },
    finalizeCurrentQuote() {
      if (!this.quote) return

      const finalized = {
        version: this.versionCounter,
        idea: this.idea,
        quote: this.quote,
        chatLog: [...this.chatLog],
        finalizedAt: new Date().toISOString(),
      }

      this.finalizedQuotes.push(finalized)
      this.versionCounter++

      // Optional: Add to history as well if needed
      this.quoteHistory.push({
        ...finalized,
        createdAt: finalized.finalizedAt,
      })
    },
    addChatMessage(message) {
      this.chatLog.push(message)
      const latest = this.quoteHistory.at(-1)
      if (latest) {
        latest.chatLog.push(message)
      }
    },

    revertToVersion(version) {
      const selected = this.quoteHistory.find((q) => q.version === version)
      if (selected) {
        this.idea = selected.idea
        this.quote = selected.quote
        this.chatLog = [...selected.chatLog]
      }
    },
    // async generateQuoteWithFile(fileText) {
    //   this.loading = true
    //   try {
    //     const result = await fetchQuoteWithFile({ idea: this.idea, fileText })
    //     this.quote = result
    //     this.chatLog = []
    //     this.quoteHistory.push({
    //       version: this.versionCounter++,
    //       idea: this.idea,
    //       quote: result,
    //       chatLog: [],
    //       createdAt: new Date().toISOString(),
    //     })
    //   } catch (err) {
    //     console.error('Quote (with file) failed:', err)
    //   } finally {
    //     this.loading = false
    //   }
    // },
    async generateQuoteWithFile(fileUrl) {
      this.loading = true
      try {
        const result = await fetchQuoteWithFile({ idea: this.idea, fileUrl }) // ✅ fileUrl not fileText
        this.quote = result
        this.chatLog = []
        this.quoteHistory.push({
          version: this.versionCounter++,
          idea: this.idea,
          quote: result,
          chatLog: [],
          createdAt: new Date().toISOString(),
        })
      } catch (err) {
        console.error('Quote (with file) failed:', err)
      } finally {
        this.loading = false
      }
    },
    // appendToQuoteField(key, value) {
    //   if (!this.quote) return

    //   if (Array.isArray(this.quote[key])) {
    //     const existing = this.quote[key] || []
    //     const combined = [...new Set([...existing, ...value])]
    //     this.quote[key] = combined
    //   } else if (typeof this.quote[key] === 'object') {
    //     this.quote[key] = { ...this.quote[key], ...value }
    //   } else if (typeof this.quote[key] === 'string') {
    //     this.quote[key] = this.quote[key]
    //       ? `${this.quote[key]}\n\n---\n\n${value}`
    //       : value
    //   } else {
    //     this.quote[key] = value
    //   }
    // },
    appendToQuoteField(key, value) {
      if (!this.quote) return

      const existing = this.quote[key]

      if (!existing) {
        // Section doesn't exist yet – create it directly
        this.quote[key] = value
        return
      }

      if (Array.isArray(existing)) {
        const combined = [...new Set([...existing, ...value])]
        this.quote[key] = combined
      } else if (typeof existing === 'object') {
        this.quote[key] = { ...existing, ...value }
      } else if (typeof existing === 'string') {
        this.quote[key] = `${existing}\n\n---\n\n${value}`
      } else {
        this.quote[key] = value
      }
    },
    async askAssistantMessage(userMessage) {
      const userPrompt = userMessage.trim()
      if (!userPrompt) return

      const userMsg = { role: 'user', content: userPrompt }
      this.addChatMessage(userMsg)

      try {
        const aiReply = await askAssistant(userPrompt, this.quote)
        const aiMsg = { role: 'assistant', content: aiReply.content }
        this.addChatMessage(aiMsg)
      } catch (err) {
        this.addChatMessage({ role: 'assistant', content: '⚠️ Assistant failed. Try again.' })
      }
    },
    async askAssistantMessageWithFile(userMessage, fileUrl) {
      const userPrompt = userMessage.trim()
      if (!userPrompt) return

      const fullPrompt = `Here’s the current quote:\n${JSON.stringify(this.quote, null, 2)}\n\nUser says: ${userPrompt}\n\nRefer to this file for additional context: ${fileUrl}`

      const userMsg = { role: 'user', content: userPrompt }
      this.addChatMessage(userMsg)

      try {
        const aiReply = await askAssistant(fullPrompt)
        const aiMsg = { role: 'assistant', content: aiReply }
        this.addChatMessage(aiMsg)
      } catch (err) {
        this.addChatMessage({ role: 'assistant', content: '⚠️ Assistant failed. Try again.' })
      }
    },
    async askAssistantMessageWithFile(userMessage, fileUrl) {
      const userPrompt = userMessage.trim()
      if (!userPrompt) return

      // Log user message in chat
      const userMsg = { role: 'user', content: userPrompt }
      this.addChatMessage(userMsg)

      // Build contextual assistant prompt
      const fullPrompt = `
    Here is the current AI-generated quote:
    ${JSON.stringify(this.quote, null, 2)}
    
    User asks: ${userPrompt}
    
    Also refer to this attached file for additional context:
    ${fileUrl}
      `.trim()

      try {
        const aiReply = await askAssistant(fullPrompt)
        const aiMsg = { role: 'assistant', content: aiReply }
        this.addChatMessage(aiMsg)
      } catch (err) {
        this.addChatMessage({
          role: 'assistant',
          content: '⚠️ Assistant failed. Try again.',
        })
      }
    },
    // async askAssistantMessage(userMessage) {
    //   const userPrompt = userMessage.trim()
    //   if (!userPrompt) return

    //   const fullPrompt = `Here is the current AI-generated quote:\n${JSON.stringify(this.quote, null, 2)}\n\nUser says: ${userPrompt}`

    //   const userMsg = { role: 'user', content: userPrompt }
    //   this.addChatMessage(userMsg)

    //   try {
    //     const aiReply = await askAssistant(fullPrompt)
    //     const aiMsg = { role: 'assistant', content: aiReply }
    //     this.addChatMessage(aiMsg)
    //   } catch (err) {
    //     this.addChatMessage({ role: 'assistant', content: '⚠️ Assistant failed. Try again.' })
    //   }
    // },
  },
})
