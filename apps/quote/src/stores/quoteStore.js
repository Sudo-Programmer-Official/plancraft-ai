// quoteStore.js
import { defineStore } from 'pinia'
// import { fetchQuote } from '@/services/quoteService'
import { fetchQuote, askAssistant, fetchQuoteWithFile } from '@/services/quoteService'

export const useQuoteStore = defineStore('quote', {
  state: () => ({
    idea: '',
    quote: null,
    loading: false,
    quoteHistory: [],
    chatLog: [],
    versionCounter: 1,
  }),
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
    async askAssistantMessage(userMessage) {
      const userPrompt = userMessage.trim()
      if (!userPrompt) return

      const userMsg = { role: 'user', content: userPrompt }
      this.addChatMessage(userMsg)

      try {
        const aiReply = await getChatReply(userPrompt, this.quote)
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
