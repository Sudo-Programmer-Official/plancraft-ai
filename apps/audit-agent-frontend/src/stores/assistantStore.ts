import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiPost } from '@/lib/api'

interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  action?: any
  speech?: string | null
  speechVolume?: number | null
  timestamp: number
}

export const useAssistantStore = defineStore('assistant', () => {
  const messages = ref<AssistantMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastResponse = ref<AssistantMessage | null>(null)

  function clear() {
    messages.value = []
    lastResponse.value = null
    error.value = null
  }

  function appendMessage(message: AssistantMessage) {
    messages.value = [...messages.value, message]
  }

  async function ask(orgId: string, text: string, options: { speak?: boolean; voiceId?: string | null } = {}) {
    const trimmed = text?.trim()
    if (!orgId || !trimmed) return null

    error.value = null
    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    }
    appendMessage(userMessage)

    loading.value = true
    try {
      const payload: Record<string, any> = { text: trimmed }
      if (options.speak) payload.speak = true
      if (options.voiceId) payload.voiceId = options.voiceId

      const res = await apiPost(`/api/orgs/${orgId}/assistant/run`, payload)
      const assistantMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: res?.response || 'All set!',
        action: res?.action || null,
        speech: res?.speech || null,
        speechVolume: typeof res?.speechVolume === 'number' ? res.speechVolume : null,
        timestamp: Date.now(),
      }
      const responsePayload = { ...res, message: assistantMessage }
      appendMessage(assistantMessage)
      lastResponse.value = assistantMessage
      return responsePayload
    } catch (err: any) {
      console.error('[assistantStore] ask failed', err)
      error.value = err?.message || 'Assistant request failed'
      const fallbackMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: 'Sorry, something went wrong while processing that request.',
        speechVolume: null,
        timestamp: Date.now(),
      }
      appendMessage(fallbackMessage)
      lastResponse.value = fallbackMessage
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    messages,
    loading,
    error,
    lastResponse,
    ask,
    clear,
  }
})
