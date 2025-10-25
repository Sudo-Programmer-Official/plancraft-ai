import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { apiPost } from '@/lib/api'

function parseUtm(search: string) {
  const params = new URLSearchParams(search || '')
  const utm: Record<string, string> = {
    source: params.get('utm_source') || '',
    medium: params.get('utm_medium') || '',
    campaign: params.get('utm_campaign') || '',
    term: params.get('utm_term') || '',
    content: params.get('utm_content') || '',
    ref: params.get('ref') || params.get('referrer') || '',
  }
  return utm
}

function sanitize(value: unknown, limit = 250) {
  if (!value && value !== 0) return ''
  return String(value).slice(0, limit).trim()
}

export const useMarketingStore = defineStore('marketing', () => {
  const utm = reactive<Record<string, string>>({
    source: '',
    medium: '',
    campaign: '',
    term: '',
    content: '',
    ref: '',
  })
  const page = ref('')
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const lastSubmissionId = ref<string | null>(null)

  function setUtmFromUrl(search?: string) {
    if (typeof window === 'undefined') return
    const data = parseUtm(search ?? window.location.search)
    Object.assign(utm, data)
    page.value = window.location.href
  }

  async function submitWaitlist(payload: { name: string; email: string; companySize?: string; useCase?: string }) {
    submitting.value = true
    error.value = null
    try {
      const body = {
        name: sanitize(payload.name, 120),
        email: sanitize(payload.email, 160),
        companySize: sanitize(payload.companySize, 120),
        useCase: sanitize(payload.useCase, 1000),
        utm: { ...utm },
        page: page.value,
      }
      const res = await apiPost('/api/waitlist/teams', body)
      lastSubmissionId.value = res?.id || null
      return res
    } catch (err: any) {
      error.value = err?.response?.data?.error || err?.message || 'Failed to submit waitlist entry.'
      throw err
    } finally {
      submitting.value = false
    }
  }

  if (typeof window !== 'undefined') {
    setUtmFromUrl()
  }

  return {
    utm,
    page,
    submitting,
    error,
    lastSubmissionId,
    submitWaitlist,
    setUtmFromUrl,
  }
})
