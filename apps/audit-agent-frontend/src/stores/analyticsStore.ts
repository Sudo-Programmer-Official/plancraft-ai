import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiGet } from '@/lib/api'

export interface AnalyticsResponse {
  range: string
  since: string
  totals: {
    tasksCreated: number
    tasksCompleted: number
    meetingsCreated: number
    assistantEvents: number
    chatInsights: number
  }
  series: Record<string, Array<{ date: string; value: number }>>
  topAssignees: Array<{ uid: string; count: number }>
  recentHighlights: Array<{ id: string; type: string; title: string; createdAt: Date }>
}

export const useAnalyticsStore = defineStore('analytics', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentRange = ref<'7d' | '14d' | '30d' | '90d'>('7d')
  const data = ref<AnalyticsResponse | null>(null)
  const cache = ref(new Map<string, AnalyticsResponse>())

  const hasData = computed(() => !!data.value)

  async function fetchAnalytics(orgId: string, range: '7d' | '14d' | '30d' | '90d' = currentRange.value) {
    if (!orgId) return null
    currentRange.value = range

    const cacheKey = `${orgId}:${range}`
    if (cache.value.has(cacheKey)) {
      data.value = cache.value.get(cacheKey) || null
      return data.value
    }

    loading.value = true
    error.value = null
    try {
      const res = (await apiGet(`/api/orgs/${orgId}/analytics?range=${range}`)) as AnalyticsResponse
      data.value = res
      cache.value.set(cacheKey, res)
      return res
    } catch (err: any) {
      console.error('[analyticsStore] fetch failed', err)
      error.value = err?.message || 'Failed to load analytics'
      return null
    } finally {
      loading.value = false
    }
  }

  function clear() {
    data.value = null
    error.value = null
  }

  return {
    loading,
    error,
    data,
    currentRange,
    hasData,
    fetchAnalytics,
    clear,
  }
})
