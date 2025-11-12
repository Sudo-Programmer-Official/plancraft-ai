import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { submitFeedback } from '@/services/feedbackService'

const PROMPT_KEY = 'pcai:lastFeedbackPrompt'
const PROMPT_INTERVAL_MS = 1000 * 60 * 60 * 24 * 3 // 3 days
const PROMPT_DELAY_MS = 8000

export const useFeedbackStore = defineStore('feedback', () => {
  const promptVisible = ref(false)
  const drawerVisible = ref(false)
  const submitting = ref(false)
  const submitSuccess = ref(false)
  const errorMessage = ref('')
  const context = ref({})
  const form = reactive({
    rating: 0,
    type: 'idea',
    message: '',
    allowContact: false,
  })
  let promptTimer = null

  function init() {
    if (promptTimer || typeof window === 'undefined') return
    try {
      const lastPrompt = Number(localStorage.getItem(PROMPT_KEY) || 0)
      if (Date.now() - lastPrompt < PROMPT_INTERVAL_MS) return
    } catch {}
    promptTimer = setTimeout(() => {
      promptVisible.value = true
      promptTimer = null
    }, PROMPT_DELAY_MS)
  }

  function dismissPrompt() {
    promptVisible.value = false
    try {
      localStorage.setItem(PROMPT_KEY, Date.now().toString())
    } catch {}
  }

  function triggerPrompt(extraContext = {}) {
    context.value = extraContext || {}
    promptVisible.value = true
  }

  function captureQuickRating(value, extraContext = {}) {
    form.rating = value
    context.value = extraContext || {}
    promptVisible.value = false
    drawerVisible.value = true
  }

  function openDrawer(extraContext = {}) {
    context.value = extraContext || {}
    drawerVisible.value = true
  }

  function closeDrawer() {
    drawerVisible.value = false
    submitSuccess.value = false
    errorMessage.value = ''
    form.message = ''
    form.type = 'idea'
    form.allowContact = false
    form.rating = form.rating || 0
  }

  async function sendFeedback(userId, metadata = {}) {
    if (!userId) {
      errorMessage.value = 'Please sign in to share feedback.'
      return
    }
    submitting.value = true
    errorMessage.value = ''
    submitSuccess.value = false
    try {
      await submitFeedback({
        userId,
        rating: form.rating || null,
        type: form.type,
        message: form.message,
        context: context.value,
        metadata: {
          allowContact: form.allowContact,
          ...metadata,
        },
      })
      submitSuccess.value = true
      dismissPrompt()
      form.message = ''
    } catch (err) {
      errorMessage.value = err?.response?.data?.error || err?.message || 'Failed to send feedback.'
    } finally {
      submitting.value = false
    }
  }

  return {
    promptVisible,
    drawerVisible,
    submitting,
    submitSuccess,
    errorMessage,
    form,
    init,
    dismissPrompt,
    triggerPrompt,
    captureQuickRating,
    openDrawer,
    closeDrawer,
    sendFeedback,
  }
})
