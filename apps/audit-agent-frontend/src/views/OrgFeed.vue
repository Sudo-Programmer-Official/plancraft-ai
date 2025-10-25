<template>
  <section class="org-feed">
    <aside class="org-feed__sidebar">
      <h2>📰 Org Feed</h2>
      <ul>
        <li v-for="option in filterOptions" :key="option.value">
          <button
            type="button"
            class="filter-pill"
            :class="{ active: feedStore.activeFilter === option.value }"
            @click="handleFilter(option.value)"
          >
            {{ option.label }}
          </button>
        </li>
      </ul>
    </aside>

    <main class="org-feed__content">
      <header class="org-feed__header">
        <div>
          <h1>Organization Feed</h1>
          <p v-if="currentOrgName">Live insights for {{ currentOrgName }}</p>
        </div>
        <button type="button" class="digest-btn" :disabled="digestLoading" @click="handleDigest">
          <span v-if="digestLoading">Generating…</span>
          <span v-else>Generate Digest</span>
        </button>
      </header>

      <div v-if="feedStore.error" class="alert error">
        <span>{{ feedStore.error }}</span>
        <button type="button" class="toast__action" @click="retryHydrate">
          Retry
        </button>
      </div>

      <div v-if="feedStore.loading && !feedStore.items.length" class="feed-skeleton">
        <div v-for="n in 4" :key="n" class="feed-skeleton__card">
          <div class="feed-skeleton__pill" />
          <div class="feed-skeleton__line wide" />
          <div class="feed-skeleton__line" />
        </div>
      </div>

      <div v-else-if="!feedStore.items.length" class="empty-state">
        <h2>No updates yet</h2>
        <p>Trigger a vault rebuild or wait for new meetings, chats, and tasks to appear.</p>
      </div>

      <div v-else class="feed-list">
        <FeedCard v-for="item in feedStore.items" :key="item.id" :item="item" />
        <button
          v-if="feedStore.hasMore"
          type="button"
          class="load-more"
          :disabled="feedStore.loading"
          @click="handleLoadMore"
        >
          <span v-if="feedStore.loading">Loading…</span>
          <span v-else>Load more</span>
        </button>
      </div>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import FeedCard from '@/components/FeedCard.vue'
import { useFeedStore, type FeedFilter } from '@/stores/feedStore'
import { apiGet } from '@/lib/api'
import { useOrgStore } from '@/stores/orgStore'
import { useToastStore } from '@/stores/toastStore'

const route = useRoute()
const feedStore = useFeedStore()
const orgStore = useOrgStore()
const toastStore = useToastStore()

const digestLoading = ref(false)

const orgId = computed(() => {
  const param = route.params.orgId
  return typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
})

const currentOrgName = computed(() => orgStore.currentOrg?.name || '')

const filterOptions: Array<{ value: FeedFilter | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'task', label: 'Tasks' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'chat', label: 'Chats' },
]

async function hydrate(id: string | null) {
  if (!id) return
  orgStore.setOrg(id)
  try {
    await feedStore.fetchFeed(id, { reset: true })
  } catch (err) {
    console.error('[OrgFeed] hydrate failed', err)
    toastStore.push('Failed to load org feed.', {
      type: 'error',
      action: {
        label: 'Retry',
        handler: () => feedStore.fetchFeed(id, { reset: true }),
      },
    })
  }
}

function handleFilter(filter: FeedFilter | 'all') {
  if (!orgId.value) return
  feedStore.setFilter(filter as FeedFilter, orgId.value)
}

async function handleLoadMore() {
  if (!orgId.value) return
  try {
    await feedStore.fetchFeed(orgId.value)
  } catch (err) {
    console.error('[OrgFeed] load more failed', err)
    toastStore.push('Unable to load more feed items.', {
      type: 'warning',
      action: {
        label: 'Retry',
        handler: () => feedStore.fetchFeed(orgId.value!, { reset: false }),
      },
    })
  }
}

async function handleDigest() {
  if (!orgId.value) return
  digestLoading.value = true
  try {
    const res = await apiGet(`/api/orgs/${orgId.value}/feed/digest?period=weekly`)
    const message = res?.digest || 'Digest ready.'
    toastStore.push('Weekly digest generated.', { type: 'success', duration: 2800 })
    window.alert(`✅ Digest generated:\n\n${message}`)
  } catch (err) {
    console.error('[OrgFeed] digest error', err)
    toastStore.push('Failed to generate digest.', {
      type: 'error',
      action: {
        label: 'Retry',
        handler: () => handleDigest(),
      },
    })
    window.alert('Failed to generate digest. Check console for details.')
  } finally {
    digestLoading.value = false
  }
}

function retryHydrate() {
  hydrate(orgId.value)
}

watch(
  orgId,
  async (id) => {
    await hydrate(id)
  },
  { immediate: true },
)
</script>

<style scoped>
.org-feed {
  display: flex;
  min-height: 100%;
  background: #0f172a;
  color: #e2e8f0;
}

.org-feed__sidebar {
  width: 240px;
  padding: 24px 20px;
  border-right: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.92);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.org-feed__sidebar h2 {
  margin: 0;
  font-size: 1.1rem;
}

.org-feed__sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-pill {
  width: 100%;
  border: none;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.8);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
}
.filter-pill:hover {
  background: rgba(51, 65, 85, 0.9);
  transform: translateX(2px);
}
.filter-pill.active {
  background: rgba(129, 140, 248, 0.25);
  color: #c7d2fe;
}

.org-feed__content {
  flex: 1;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.org-feed__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.org-feed__header h1 {
  margin: 0 0 4px;
  font-size: 1.9rem;
}

.org-feed__header p {
  margin: 0;
  color: rgba(148, 163, 184, 0.85);
}

.feed-skeleton {
  display: grid;
  gap: 16px;
}

.feed-skeleton__card {
  border-radius: 16px;
  padding: 18px;
  background: rgba(30, 41, 59, 0.65);
  overflow: hidden;
  position: relative;
  display: grid;
  gap: 10px;
}

.feed-skeleton__card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.2) 45%, transparent 90%);
  animation: shimmer 1.5s infinite;
}

.feed-skeleton__pill {
  height: 14px;
  width: 120px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.35);
}

.feed-skeleton__line {
  height: 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.28);
}

.feed-skeleton__line.wide {
  width: 70%;
}

.digest-btn {
  border: none;
  border-radius: 14px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.digest-btn:hover:not([disabled]) {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.35);
}
.digest-btn[disabled] {
  opacity: 0.65;
  cursor: not-allowed;
  box-shadow: none;
}

.alert {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.92rem;
}
.alert.error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.45);
  color: #fca5a5;
}
.alert .toast__action {
  border: none;
  background: rgba(248, 113, 113, 0.18);
  color: #fee2e2;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
}
.alert .toast__action:hover {
  background: rgba(248, 113, 113, 0.3);
}

.empty-state {
  background: rgba(30, 41, 59, 0.6);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  color: rgba(148, 163, 184, 0.9);
}

.empty-state h2 {
  margin: 0 0 8px;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.load-more {
  align-self: center;
  border: none;
  border-radius: 12px;
  padding: 10px 18px;
  background: rgba(129, 140, 248, 0.18);
  color: #c7d2fe;
  cursor: pointer;
  font-weight: 600;
}
.load-more:hover:not([disabled]) {
  background: rgba(129, 140, 248, 0.28);
}
.load-more[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
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

@media (max-width: 960px) {
  .org-feed {
    flex-direction: column;
  }
  .org-feed__sidebar {
    width: 100%;
    flex-direction: row;
    align-items: center;
    overflow-x: auto;
  }
  .org-feed__sidebar ul {
    flex-direction: row;
  }
}
</style>
