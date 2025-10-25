<template>
  <section class="team-vault">
    <header class="vault-header">
      <div>
        <h1>Knowledge Vault</h1>
        <p v-if="currentOrg">Unified knowledge for {{ currentOrg.name }}</p>
        <p v-else class="subtle">Pick an organization to explore the vault.</p>
      </div>
      <div class="header-actions">
        <button
          v-if="canManage"
          type="button"
          class="refresh-btn"
          :disabled="vaultStore.refreshing || !orgId"
          @click="handleRefresh"
        >
          <span v-if="vaultStore.refreshing">Refreshing…</span>
          <span v-else>Rebuild Index</span>
        </button>
      </div>
    </header>

    <div class="vault-toolbar">
      <form class="search-bar" @submit.prevent="runSearch">
        <span class="icon">🔍</span>
        <input
          v-model="searchTerm"
          type="search"
          name="vault-search"
          placeholder="Search tasks, meetings, chats…"
          autocomplete="off"
        />
        <button v-if="searchTerm" type="button" class="clear-btn" @click="clearSearch">Clear</button>
      </form>

      <div class="mobile-filter">
        <label for="vault-filter">Filter</label>
        <select id="vault-filter" v-model="mobileType" @change="onMobileFilter">
          <option value="all">All items</option>
          <option value="task">Tasks</option>
          <option value="chat">Chats</option>
          <option value="meeting">Meetings</option>
        </select>
      </div>
    </div>

    <div class="vault-body">
      <VaultSidebar
        :active-type="vaultStore.activeType"
        :counts="vaultStore.counts"
        :last-fetch-at="vaultStore.lastFetchAt"
        :refreshing="vaultStore.refreshing"
        @update:type="onSelectType"
      />

      <div class="vault-content">
        <div v-if="vaultStore.error" class="alert error">
          <span>{{ vaultStore.error }}</span>
          <button type="button" class="ghost-btn" @click="handleRefresh">
            Retry
          </button>
        </div>

        <div v-else-if="vaultStore.isSearchMode && vaultStore.searching" class="loading-state">
          <span class="spinner" />
          <p>Searching vault…</p>
        </div>

        <div v-else-if="isInitialLoading" class="skeleton-list">
          <div v-for="n in 3" :key="n" class="vault-skeleton">
            <div class="skeleton-line skeleton-pill" />
            <div class="skeleton-line skeleton-title" />
            <div class="skeleton-line skeleton-text" />
            <div class="skeleton-line skeleton-text short" />
          </div>
        </div>

        <div v-else-if="visibleItems.length === 0" class="empty-state">
          <template v-if="vaultStore.isSearchMode">
            <h2>No matches</h2>
            <p>Try refining your query or rebuild the vault index for fresher data.</p>
          </template>
          <template v-else>
            <h2>No insights yet</h2>
            <p>
              Run an index build or add new meetings, tasks, and chat summaries to populate the vault.
            </p>
            <button v-if="canManage && orgId" class="refresh-btn" type="button" @click="handleRefresh">
              Build Vault Now
            </button>
          </template>
        </div>

        <div v-else class="vault-list">
          <article v-for="item in visibleItems" :key="item.id" class="vault-card">
            <header>
              <span class="type-chip" :class="`type-${item.type}`">
                {{ typeLabel(item.type) }}
              </span>
              <span v-if="item.score" class="score-chip">Relevance {{ formatScore(item.score) }}</span>
              <button
                v-if="canManage && orgId"
                type="button"
                class="ghost-btn"
                @click="handleDelete(item.id)"
              >
                Remove
              </button>
            </header>

            <h3>{{ item.title || defaultTitle(item.type) }}</h3>
            <p v-if="item.summary" class="summary">{{ truncate(item.summary, 320) }}</p>
            <p v-else-if="item.content" class="summary">{{ truncate(item.content, 320) }}</p>
            <p v-else class="summary muted">No summary available.</p>

            <footer>
              <span v-if="item.createdAt" class="meta-pill">Captured {{ formatDate(item.createdAt) }}</span>
              <span v-if="item.metadata?.projectId" class="meta-pill">Project {{ item.metadata.projectId }}</span>
              <span v-if="item.metadata?.roomName" class="meta-pill">Room {{ item.metadata.roomName }}</span>
              <span v-if="item.metadata?.status" class="meta-pill">Status {{ item.metadata.status }}</span>
              <span v-if="item.metadata?.attendees?.length" class="meta-pill">
                {{ item.metadata.attendees.length }} attendees
              </span>
            </footer>
          </article>

          <button
            v-if="vaultStore.hasMore && orgId && !vaultStore.isSearchMode"
            type="button"
            class="load-more"
            :disabled="vaultStore.loading"
            @click="handleLoadMore"
          >
            <span v-if="vaultStore.loading">Loading…</span>
            <span v-else>Load more</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import VaultSidebar from '@/components/VaultSidebar.vue'
import { useOrgStore } from '@/stores/orgStore'
import { useTeamVaultStore, type VaultItem } from '@/stores/teamVaultStore'
import { useToastStore } from '@/stores/toastStore'
import { trackVaultSearch, trackEvent } from '@/services/analytics'

const route = useRoute()
const orgStore = useOrgStore()
const vaultStore = useTeamVaultStore()
const toastStore = useToastStore()

const searchTerm = ref('')
const mobileType = ref<'all' | string>('all')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const orgId = computed(() => {
  const param = route.params.orgId
  return typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
})

const currentOrg = computed(() => orgStore.currentOrg)
const canManage = computed(() => {
  const role = currentOrg.value?.role
  return role === 'owner' || role === 'admin'
})

const visibleItems = computed(() =>
  vaultStore.isSearchMode ? vaultStore.searchResults : vaultStore.items,
)

const isInitialLoading = computed(
  () => vaultStore.loading && !vaultStore.items.length && !vaultStore.isSearchMode,
)

watch(
  () => vaultStore.activeType,
  (type) => {
    mobileType.value = type
  },
  { immediate: true },
)

watch(
  orgId,
  async (id) => {
    if (!id) {
      vaultStore.clear()
      return
    }
    orgStore.setOrg(id)
    searchTerm.value = ''
    vaultStore.clearSearch()
    try {
      await vaultStore.load(id, { reset: true })
    } catch (err) {
      console.error('[vault] load failed', err)
      toastStore.push('Failed to load vault. Retry?', {
        type: 'error',
        action: {
          label: 'Retry',
          handler: () => vaultStore.load(id, { reset: true }),
        },
      })
    }
  },
  { immediate: true },
)

watch(
  searchTerm,
  (value) => {
    if (!orgId.value) return
    if (!value || !value.trim()) {
      vaultStore.clearSearch()
      return
    }
    if (searchDebounce) clearTimeout(searchDebounce)
    searchDebounce = setTimeout(async () => {
      try {
        await vaultStore.search(orgId.value as string, value)
        trackVaultSearch({
          orgId: orgId.value,
          query: value,
          source: 'debounce',
        })
      } catch (err) {
        console.error('[vault] search failed', err)
        toastStore.push('Vault search failed.', { type: 'warning' })
      }
    }, 320)
  },
  { flush: 'post' },
)

function typeLabel(type: VaultItem['type']) {
  return (
    {
      task: 'Task Insight',
      meeting: 'Meeting Summary',
      chat: 'Chat Insight',
    }[type] || 'Vault Item'
  )
}

function defaultTitle(type: VaultItem['type']) {
  return (
    {
      task: 'Untitled task insight',
      meeting: 'Untitled meeting',
      chat: 'Chat insight',
    }[type] || 'Vault entry'
  )
}

function truncate(text: string, length = 220) {
  if (!text) return ''
  return text.length > length ? `${text.slice(0, length - 1)}…` : text
}

function formatDate(value: string | Date) {
  try {
    const date = value instanceof Date ? value : new Date(value)
    return date.toLocaleString()
  } catch {
    return String(value)
  }
}

function formatScore(score: number | null) {
  if (score == null) return ''
  return (score * 100).toFixed(0) + '%'
}

async function handleRefresh() {
  if (!orgId.value) return
  try {
    await vaultStore.refresh(orgId.value)
    toastStore.push('Vault successfully rebuilt.', { type: 'success', duration: 2600 })
    trackEvent('vault_refresh', { orgId: orgId.value })
  } catch (err) {
    console.error('[vault] refresh failed', err)
    toastStore.push('Vault rebuild failed.', {
      type: 'error',
      action: {
        label: 'Retry',
        handler: () => handleRefresh(),
      },
    })
  }
}

async function handleLoadMore() {
  if (!orgId.value) return
  try {
    await vaultStore.loadMore(orgId.value)
  } catch (err) {
    console.error('[vault] load more failed', err)
    toastStore.push('Unable to load more items.', {
      type: 'warning',
      action: {
        label: 'Retry',
        handler: () => vaultStore.loadMore(orgId.value!),
      },
    })
  }
}

async function handleDelete(id: string) {
  if (!orgId.value) return
  const confirmed = window.confirm('Remove this vault entry?')
  if (!confirmed) return
  try {
    await vaultStore.remove(orgId.value, id)
    toastStore.push('Vault entry removed.', { type: 'info', duration: 2200 })
  } catch (err) {
    console.error('[vault] delete failed', err)
    toastStore.push('Failed to delete vault entry.', { type: 'error' })
  }
}

function onSelectType(type: string) {
  if (!orgId.value) return
  vaultStore.changeType(orgId.value, type as any)
  trackEvent('vault_filter_change', { orgId: orgId.value, type })
}

function onMobileFilter() {
  onSelectType(mobileType.value)
}

async function runSearch() {
  if (!orgId.value) return
  if (!searchTerm.value.trim()) {
    vaultStore.clearSearch()
    return
  }
  try {
    await vaultStore.search(orgId.value, searchTerm.value)
    trackVaultSearch({
      orgId: orgId.value,
      query: searchTerm.value,
      source: 'submit',
    })
  } catch (err) {
    console.error('[vault] manual search failed', err)
    toastStore.push('Vault search failed.', { type: 'warning' })
  }
}

function clearSearch() {
  searchTerm.value = ''
  vaultStore.clearSearch()
}

onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce)
})
</script>

<style scoped>
.team-vault {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.vault-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.vault-header h1 {
  margin: 0 0 4px;
  font-size: 1.8rem;
  color: #111827;
}

.vault-header p {
  margin: 0;
  color: rgba(17, 24, 39, 0.66);
}

.vault-header .subtle {
  color: rgba(17, 24, 39, 0.5);
  font-style: italic;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vault-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.search-bar {
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: #ffffff;
  border-radius: 14px;
  padding: 10px 14px;
  box-shadow: 0 8px 22px rgba(79, 70, 229, 0.05);
}

.search-bar .icon {
  font-size: 1.1rem;
}

.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.95rem;
  color: #111827;
}

.clear-btn {
  border: none;
  background: none;
  color: rgba(79, 70, 229, 0.8);
  cursor: pointer;
  font-size: 0.85rem;
}

.mobile-filter {
  display: none;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: rgba(17, 24, 39, 0.7);
}

.mobile-filter select {
  border-radius: 10px;
  border: 1px solid rgba(15, 23, 42, 0.18);
  padding: 6px 10px;
}

.vault-body {
  display: flex;
  gap: 24px;
}

.vault-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.skeleton-list {
  display: grid;
  gap: 16px;
}

.vault-skeleton {
  background: linear-gradient(160deg, rgba(226, 232, 240, 0.65), rgba(226, 232, 240, 0.45));
  border-radius: 16px;
  padding: 18px;
  display: grid;
  gap: 10px;
  overflow: hidden;
  position: relative;
}

.vault-skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.45) 40%, transparent 80%);
  transform: translateX(-100%);
  animation: shimmer 1.6s infinite;
}

.skeleton-line {
  height: 12px;
  border-radius: 999px;
  background: rgba(203, 213, 225, 0.45);
}

.skeleton-pill {
  width: 120px;
  height: 18px;
}

.skeleton-title {
  height: 18px;
  width: 70%;
}

.skeleton-text {
  width: 100%;
}

.skeleton-text.short {
  width: 55%;
}

.vault-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vault-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 18px 20px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vault-card header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-chip {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(79, 70, 229, 0.12);
  color: #4338ca;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.type-task {
  background: rgba(16, 185, 129, 0.15);
  color: #047857;
}

.type-meeting {
  background: rgba(59, 130, 246, 0.16);
  color: #1d4ed8;
}

.type-chat {
  background: rgba(236, 72, 153, 0.16);
  color: #be185d;
}

.score-chip {
  margin-left: auto;
  font-size: 0.78rem;
  color: rgba(17, 24, 39, 0.6);
}

.ghost-btn {
  border: none;
  background: rgba(15, 23, 42, 0.05);
  color: rgba(15, 23, 42, 0.7);
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
}

.vault-card h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #111827;
}

.summary {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(17, 24, 39, 0.75);
}

.summary.muted {
  color: rgba(17, 24, 39, 0.55);
  font-style: italic;
}

.vault-card footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-pill {
  background: rgba(15, 23, 42, 0.06);
  color: rgba(17, 24, 39, 0.7);
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
}

.alert {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
}

.alert.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #991b1b;
}

.loading-state,
.empty-state {
  background: #ffffff;
  border-radius: 16px;
  border: 1px dashed rgba(15, 23, 42, 0.12);
  padding: 32px;
  text-align: center;
  color: rgba(17, 24, 39, 0.65);
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.loading-state .spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid rgba(79, 70, 229, 0.2);
  border-top-color: rgba(79, 70, 229, 0.65);
  animation: spin 0.6s linear infinite;
}

.refresh-btn {
  border: none;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  padding: 10px 18px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 14px 30px rgba(79, 70, 229, 0.3);
}

.refresh-btn[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.load-more {
  align-self: center;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid rgba(79, 70, 229, 0.3);
  background: rgba(79, 70, 229, 0.08);
  color: #4338ca;
  cursor: pointer;
  font-weight: 600;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 1100px) {
  .vault-body {
    flex-direction: column;
  }

  .mobile-filter {
    display: flex;
  }
}

@media (max-width: 768px) {
  .vault-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .vault-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
