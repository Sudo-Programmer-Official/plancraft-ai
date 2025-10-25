import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiDelete, apiGet, apiPost } from '@/lib/api'

export type VaultItemType = 'task' | 'meeting' | 'chat' | 'note' | 'doc' | 'other'

export interface VaultItem {
  id: string
  type: VaultItemType | string
  sourceId?: string | null
  title?: string | null
  summary?: string | null
  content?: string | null
  metadata?: Record<string, any>
  createdAt?: string | Date | null
  updatedAt?: string | Date | null
  createdBy?: string | null
  score?: number | null
}

const PAGE_SIZE = Number(import.meta.env?.VITE_VAULT_PAGE_LIMIT) || 25

function normalizeItem(raw: any): VaultItem {
  if (!raw || typeof raw !== 'object') {
    const fallbackId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `tmp-${Math.random().toString(36).slice(2, 10)}`
    return { id: fallbackId, type: 'other' }
  }
  const {
    id,
    type,
    sourceId = null,
    title = null,
    summary = null,
    content = null,
    metadata = {},
    createdAt = null,
    updatedAt = null,
    createdBy = null,
    score = null,
  } = raw

  return {
    id: String(id),
    type: type || 'other',
    sourceId,
    title,
    summary,
    content,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    createdAt,
    updatedAt,
    createdBy,
    score: typeof score === 'number' ? score : score != null ? Number(score) : null,
  }
}

function mergeUnique(existing: VaultItem[], incoming: VaultItem[]) {
  if (!existing.length) return [...incoming]
  const map = new Map(existing.map((item) => [item.id, item]))
  for (const item of incoming) {
    if (!item?.id) continue
    const current = map.get(item.id)
    if (current) {
      map.set(item.id, { ...current, ...item })
    } else {
      map.set(item.id, item)
    }
  }
  return Array.from(map.values())
}

export const useTeamVaultStore = defineStore('team-vault', () => {
  const items = ref<VaultItem[]>([])
  const loading = ref(false)
  const refreshing = ref(false)
  const searching = ref(false)
  const error = ref<string | null>(null)

  const searchQuery = ref('')
  const searchResults = ref<VaultItem[]>([])

  const activeType = ref<'all' | VaultItemType>('all')
  const nextCursor = ref<string | null>(null)
  const lastLoadedOrgId = ref<string | null>(null)
  const lastFetchAt = ref<string | null>(null)
  const lastRefreshSummary = ref<Record<string, any> | null>(null)

  const hasMore = computed(() => !!nextCursor.value)
  const isSearchMode = computed(() => !!searchQuery.value.trim())
  const counts = computed(() => {
    const base = { all: items.value.length, task: 0, meeting: 0, chat: 0 }
    for (const item of items.value) {
      if (item.type === 'task') base.task += 1
      else if (item.type === 'meeting') base.meeting += 1
      else if (item.type === 'chat') base.chat += 1
    }
    return base
  })

  function buildQueryParams(cursor?: string | null) {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    if (activeType.value !== 'all') params.set('type', activeType.value)
    if (cursor) params.set('cursor', cursor)
    return params.toString()
  }

  async function load(orgId: string, opts: { reset?: boolean } = {}) {
    if (!orgId) return []
    if (opts.reset || lastLoadedOrgId.value !== orgId) {
      items.value = []
      nextCursor.value = null
      lastLoadedOrgId.value = orgId
    }
    if (!opts.reset && !nextCursor.value && items.value.length > 0) {
      return []
    }

    loading.value = true
    error.value = null

    try {
      const query = buildQueryParams(!opts.reset ? nextCursor.value : null)
      const res = await apiGet(`/api/orgs/${orgId}/vault${query ? `?${query}` : ''}`)
      const fetched = Array.isArray(res?.items) ? res.items.map(normalizeItem) : []
      const combined = opts.reset ? fetched : mergeUnique(items.value, fetched)
      items.value = combined.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })
      nextCursor.value = res?.nextCursor || null
      lastFetchAt.value = new Date().toISOString()
      return fetched
    } catch (err: any) {
      error.value = err?.message || 'Failed to load knowledge vault'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadMore(orgId: string) {
    if (!nextCursor.value) return []
    return load(orgId)
  }

  async function changeType(orgId: string, type: 'all' | VaultItemType) {
    if (activeType.value === type) return items.value
    activeType.value = type
    nextCursor.value = null
    return load(orgId, { reset: true })
  }

  async function refresh(orgId: string) {
    if (!orgId) return null
    refreshing.value = true
    error.value = null
    try {
      const res = await apiPost(`/api/orgs/${orgId}/vault/refresh`, {})
      lastRefreshSummary.value = res || { ok: true }
      await load(orgId, { reset: true })
      return res
    } catch (err: any) {
      error.value = err?.message || 'Failed to refresh vault'
      throw err
    } finally {
      refreshing.value = false
    }
  }

  async function remove(orgId: string, vaultId: string) {
    if (!orgId || !vaultId) return
    await apiDelete(`/api/orgs/${orgId}/vault/${vaultId}`)
    items.value = items.value.filter((item) => item.id !== vaultId)
    searchResults.value = searchResults.value.filter((item) => item.id !== vaultId)
  }

  async function search(orgId: string, query: string) {
    searchQuery.value = query
    if (!query.trim()) {
      searchResults.value = []
      return []
    }
    searching.value = true
    error.value = null
    try {
      const params = new URLSearchParams({ q: query, limit: String(PAGE_SIZE) })
      const res = await apiGet(`/api/orgs/${orgId}/vault/search?${params.toString()}`)
      const results = Array.isArray(res?.items) ? res.items.map(normalizeItem) : []
      searchResults.value = results
      return results
    } catch (err: any) {
      error.value = err?.message || 'Vault search failed'
      throw err
    } finally {
      searching.value = false
    }
  }

  function clearSearch() {
    searchQuery.value = ''
    searchResults.value = []
  }

  function clear() {
    items.value = []
    searchResults.value = []
    searchQuery.value = ''
    activeType.value = 'all'
    nextCursor.value = null
    lastLoadedOrgId.value = null
    lastFetchAt.value = null
    lastRefreshSummary.value = null
    error.value = null
  }

  return {
    items,
    loading,
    refreshing,
    searching,
    error,
    searchQuery,
    searchResults,
    activeType,
    nextCursor,
    lastFetchAt,
    lastRefreshSummary,
    hasMore,
    isSearchMode,
    counts,
    load,
    loadMore,
    changeType,
    refresh,
    remove,
    search,
    clearSearch,
    clear,
  }
})
