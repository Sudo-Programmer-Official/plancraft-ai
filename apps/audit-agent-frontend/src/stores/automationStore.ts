import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet } from '@/lib/api'

export interface AutomationEvent {
  id: string
  event: string
  status: 'received' | 'success' | 'error' | 'skipped' | 'validation_failed'
  ruleId?: string | null
  action?: string | null
  message?: string
  payload?: Record<string, unknown>
  createdAt?: string | Date
}

export const useAutomationStore = defineStore('automation', () => {
  const events = ref<AutomationEvent[]>([])
  const loading = ref(false)
  const cursor = ref<string | null>(null)
  const hasMore = ref(true)
  const filters = ref({ event: '', status: '', ruleId: '' })

  function resetState() {
    events.value = []
    cursor.value = null
    hasMore.value = true
  }

  function buildSearchParams(limit = 20) {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (filters.value.event) params.set('event', filters.value.event)
    if (filters.value.status) params.set('status', filters.value.status)
    if (filters.value.ruleId) params.set('ruleId', filters.value.ruleId)
    if (cursor.value) params.set('cursor', cursor.value)
    return params.toString()
  }

  async function load(orgId: string, { reset = false, limit = 20 } = {}) {
    if (!orgId) return []
    if (reset) {
      resetState()
    }
    if (!hasMore.value && !reset) return events.value

    loading.value = true
    try {
      const qs = buildSearchParams(limit)
      const res = await apiGet(`/api/orgs/${orgId}/automation/logs${qs ? `?${qs}` : ''}`)
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
      const nextCursor = res?.nextCursor ?? null

      events.value = cursor.value && !reset ? [...events.value, ...items] : items
      cursor.value = nextCursor
      hasMore.value = Boolean(nextCursor)
      return events.value
    } catch (err) {
      console.error('automationStore.load error', err)
      if (reset) resetState()
      return []
    } finally {
      loading.value = false
    }
  }

  function loadMore(orgId: string, options = {}) {
    return load(orgId, { ...options, reset: false })
  }

  function setFilter(key: 'event' | 'status' | 'ruleId', value: string) {
    filters.value = { ...filters.value, [key]: value }
  }

  function clearFilters() {
    filters.value = { event: '', status: '', ruleId: '' }
  }

  function clear() {
    resetState()
    clearFilters()
  }

  return {
    events,
    loading,
    hasMore,
    filters,
    load,
    loadMore,
    setFilter,
    clearFilters,
    clear,
    resetState,
  }
})

