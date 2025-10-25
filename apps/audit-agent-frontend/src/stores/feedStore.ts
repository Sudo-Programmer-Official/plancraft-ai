import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiGet } from '@/lib/api'

export type FeedFilter = 'all' | 'task' | 'meeting' | 'chat'

interface FeedItem {
  id: string
  type: string
  title?: string | null
  content?: string | null
  summary?: string | null
  createdAt?: string | Date | null
  metadata?: Record<string, any>
  sourceId?: string | null
}

interface FeedResponse {
  items: FeedItem[]
  nextCursor: string | null
}

export const useFeedStore = defineStore('team-feed', () => {
  const items = ref<FeedItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const activeFilter = ref<FeedFilter>('all')
  const nextCursor = ref<string | null>(null)

  const hasMore = computed(() => !!nextCursor.value)

  function reset() {
    items.value = []
    nextCursor.value = null
  }

  async function fetchFeed(orgId: string, opts: { reset?: boolean } = {}) {
    if (!orgId) return
    if (opts.reset) reset()

    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ filter: activeFilter.value })
      if (!opts.reset && nextCursor.value) params.set('cursor', nextCursor.value)
      const path = `/api/orgs/${orgId}/feed${params.toString() ? `?${params.toString()}` : ''}`
      const res = (await apiGet(path)) as FeedResponse
      const fetched = Array.isArray(res?.items) ? res.items : []
      items.value = opts.reset ? fetched : [...items.value, ...fetched]
      nextCursor.value = res?.nextCursor || null
    } catch (err: any) {
      console.error('[feedStore] failed to load feed', err)
      error.value = err?.message || 'Failed to load feed'
    } finally {
      loading.value = false
    }
  }

  function setFilter(filter: FeedFilter, orgId: string) {
    if (activeFilter.value === filter) return
    activeFilter.value = filter
    return fetchFeed(orgId, { reset: true })
  }

  return {
    items,
    loading,
    error,
    activeFilter,
    hasMore,
    fetchFeed,
    setFilter,
    reset,
  }
})
