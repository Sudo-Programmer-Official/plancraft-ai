<template>
  <section class="team-automations">
    <header class="automations-header">
      <div>
        <h1>Automation Activity</h1>
        <p v-if="currentOrg">Latest events for {{ currentOrg.name }}</p>
      </div>
      <button type="button" @click="refresh" :disabled="loading || !orgId">
        {{ loading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </header>

    <div class="filters" v-if="events.length || hasActiveFilters">
      <label>
        Event
        <select v-model="localFilters.event" @change="applyFilters">
          <option value="">All</option>
          <option v-for="value in eventOptions" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>
      <label>
        Rule
        <select v-model="localFilters.ruleId" @change="applyFilters">
          <option value="">All</option>
          <option v-for="value in ruleOptions" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>
      <label>
        Status
        <select v-model="localFilters.status" @change="applyFilters">
          <option value="">All</option>
          <option v-for="value in statusOptions" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>
    </div>

    <ul v-if="events.length" class="events-list">
      <li v-for="event in events" :key="event.id" class="event-item">
        <div class="row">
          <div class="title">
            <strong>{{ event.event }}</strong>
            <span v-if="event.ruleId" class="rule">{{ event.ruleId }}</span>
          </div>
          <span :class="['status', event.status]">{{ event.status }}</span>
        </div>
        <div class="meta">
          <span v-if="event.action">Action: {{ event.action }}</span>
          <span>at {{ formatDate(event.createdAt) }}</span>
        </div>
        <p v-if="event.message" class="message">{{ event.message }}</p>
      </li>
      <li v-if="loading" class="loading-row">Loading…</li>
    </ul>

    <div v-else class="events-empty">
      <p>No automation events yet. Once transcripts are processed, logs will appear here.</p>
    </div>

    <div ref="sentinel" class="sentinel" v-if="hasMore && events.length"></div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'
import { useAutomationStore } from '@/stores/automationStore'

const route = useRoute()
const orgStore = useOrgStore()
const automationStore = useAutomationStore()

const orgId = computed(() => {
  const param = route.params.orgId
  const id = typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
  return id || orgStore.activeOrgId
})

const currentOrg = computed(() => orgStore.currentOrg)
const events = computed(() => automationStore.events)
const loading = computed(() => automationStore.loading)
const hasMore = computed(() => automationStore.hasMore)
const filters = computed(() => automationStore.filters)

const localFilters = reactive({
  event: '',
  ruleId: '',
  status: '',
})

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const statusOptions = ['received', 'success', 'error', 'skipped', 'validation_failed']

const eventOptions = computed(() => {
  const unique = new Set(events.value.map((e) => e.event).filter(Boolean))
  return Array.from(unique)
})

const ruleOptions = computed(() => {
  const unique = new Set(events.value.map((e) => e.ruleId).filter(Boolean))
  return Array.from(unique)
})

const hasActiveFilters = computed(() => Boolean(localFilters.event || localFilters.status || localFilters.ruleId))

watch(orgId, async (id) => {
  if (!id) return
  orgStore.setOrg(id)
  localFilters.event = filters.value.event
  localFilters.ruleId = filters.value.ruleId
  localFilters.status = filters.value.status
  await automationStore.load(id, { reset: true })
}, { immediate: true })

watch(filters, (value) => {
  localFilters.event = value.event
  localFilters.ruleId = value.ruleId
  localFilters.status = value.status
}, { deep: true })

async function refresh() {
  if (!orgId.value) return
  await automationStore.load(orgId.value, { reset: true })
}

function formatDate(value: any) {
  try {
    const date = value instanceof Date ? value : new Date(value)
    return date.toLocaleString()
  } catch {
    return value
  }
}

async function applyFilters() {
  if (!orgId.value) return
  automationStore.setFilter('event', localFilters.event)
  automationStore.setFilter('ruleId', localFilters.ruleId)
  automationStore.setFilter('status', localFilters.status)
  await automationStore.load(orgId.value, { reset: true })
}

function initObserver() {
  if (!sentinel.value) return
  observer = new IntersectionObserver((entries) => {
    const [entry] = entries
    if (entry?.isIntersecting && hasMore.value && !loading.value && orgId.value) {
      automationStore.loadMore(orgId.value)
    }
  }, { threshold: 1 })
  observer.observe(sentinel.value)
}

onMounted(() => {
  initObserver()
})

watch(sentinel, () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  initObserver()
})

onBeforeUnmount(() => {
  if (observer && sentinel.value) observer.unobserve(sentinel.value)
  observer = null
})
</script>

<style scoped>
.team-automations { display: flex; flex-direction: column; gap: 16px; }
.automations-header { display: flex; gap: 12px; align-items: center; }
.automations-header h1 { margin-right: auto; }
.filters { display: flex; gap: 12px; flex-wrap: wrap; }
.filters label { display: flex; flex-direction: column; font-size: 0.85rem; gap: 4px; }
select { min-width: 140px; padding: 6px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.2); }
button { padding: 6px 14px; border-radius: 6px; border: none; background: #111827; color: #fff; cursor: pointer; }
button[disabled] { background: rgba(0,0,0,0.25); cursor: not-allowed; }
.events-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.event-item { border: 1px solid rgba(0,0,0,0.12); border-radius: 12px; padding: 12px; background: #fff; display: flex; flex-direction: column; gap: 6px; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.title { display: flex; align-items: center; gap: 8px; }
.rule { font-size: 0.75rem; background: rgba(0,0,0,0.07); padding: 2px 6px; border-radius: 6px; }
.status { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; }
.status.success { color: #1b8a4d; }
.status.error { color: #c0392b; }
.status.skipped { color: #8e44ad; }
.status.validation_failed { color: #d35400; }
.meta { font-size: 0.8rem; color: rgba(0,0,0,0.6); display: flex; gap: 12px; }
.message { margin: 0; color: rgba(0,0,0,0.75); }
.events-empty { padding: 24px; border: 1px dashed rgba(0,0,0,0.3); border-radius: 12px; text-align: center; color: rgba(0,0,0,0.6); background: #fff; }
.loading-row { text-align: center; padding: 12px; color: rgba(0,0,0,0.6); }
.sentinel { height: 1px; }
</style>

