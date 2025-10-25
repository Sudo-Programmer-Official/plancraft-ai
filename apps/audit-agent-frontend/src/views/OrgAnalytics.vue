<template>
  <section class="org-analytics">
    <header class="analytics-header">
      <div>
        <h1>Organization Analytics</h1>
        <p v-if="currentOrgName">Usage across {{ currentOrgName }}</p>
      </div>
      <div class="range-toggle">
        <button
          v-for="option in ranges"
          :key="option.value"
          type="button"
          class="range-pill"
          :class="{ active: analyticsStore.currentRange === option.value }"
          @click="changeRange(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <div v-if="analyticsStore.error" class="alert error">
      <span>{{ analyticsStore.error }}</span>
      <button type="button" class="toast__action" @click="reload">Retry</button>
    </div>

    <div v-if="analyticsStore.loading && !analyticsStore.hasData" class="analytics-skeleton">
      <div class="skeleton-card" v-for="n in 4" :key="`stat-${n}`" />
      <div class="skeleton-wide" />
      <div class="skeleton-wide" />
    </div>

    <div v-else-if="!analyticsStore.hasData" class="empty-state">
      <h2>No analytics yet</h2>
      <p>Start collaborating in Vault, Feed, and Assistant to populate metrics.</p>
    </div>

    <div v-else class="analytics-content">
      <section class="stat-grid">
        <article v-for="card in metrics" :key="card.key" class="stat-card">
          <header>
            <span class="emoji">{{ card.icon }}</span>
            <h3>{{ card.title }}</h3>
          </header>
          <p class="value">{{ formatNumber(card.value) }}</p>
          <p class="trend" :class="{ up: card.delta > 0, down: card.delta < 0 }">
            <span v-if="card.delta > 0">▲ {{ formatNumber(card.delta) }} vs start</span>
            <span v-else-if="card.delta < 0">▼ {{ formatNumber(Math.abs(card.delta)) }} vs start</span>
            <span v-else>— steady</span>
          </p>
        </article>
      </section>

      <section class="insights-panel">
        <div class="panel">
          <h2>Top assignees</h2>
          <ul v-if="topAssignees.length" class="assignee-list">
            <li v-for="assignee in topAssignees" :key="assignee.uid">
              <span class="name">{{ formatAssignee(assignee.uid) }}</span>
              <span class="count">{{ assignee.count }}</span>
            </li>
          </ul>
          <p v-else class="muted">Assign tasks to team members to see activity here.</p>
        </div>

        <div class="panel">
          <h2>Recent highlights</h2>
          <ul v-if="recentHighlights.length" class="highlight-list">
            <li v-for="item in recentHighlights" :key="item.id">
              <span class="badge">{{ item.type }}</span>
              <div class="details">
                <p>{{ item.title }}</p>
                <small>{{ formatDate(item.createdAt) }}</small>
              </div>
            </li>
          </ul>
          <p v-else class="muted">Assistant + vault activity will appear here.</p>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAnalyticsStore } from '@/stores/analyticsStore'
import { useOrgStore } from '@/stores/orgStore'
import { useToastStore } from '@/stores/toastStore'
import { trackEvent } from '@/services/analytics'

const route = useRoute()
const analyticsStore = useAnalyticsStore()
const orgStore = useOrgStore()
const toastStore = useToastStore()

const ranges = [
  { value: '7d', label: '7d' },
  { value: '14d', label: '14d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
]

const orgId = computed(() => {
  const param = route.params.orgId
  return typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
})

const currentOrgName = computed(() => orgStore.currentOrg?.name || '')

const metrics = computed(() => {
  const totals = analyticsStore.data?.totals
  const series = analyticsStore.data?.series || {}
  if (!totals) return []

  return [
    {
      key: 'tasksCreated',
      title: 'Tasks created',
      value: totals.tasksCreated,
      delta: deltaFromSeries(series.tasksCreated),
      icon: '✅',
    },
    {
      key: 'tasksCompleted',
      title: 'Tasks completed',
      value: totals.tasksCompleted,
      delta: deltaFromSeries(series.tasksCompleted),
      icon: '🎯',
    },
    {
      key: 'meetingsCreated',
      title: 'Meetings captured',
      value: totals.meetingsCreated,
      delta: deltaFromSeries(series.meetingsCreated),
      icon: '📅',
    },
    {
      key: 'assistantEvents',
      title: 'Assistant actions',
      value: totals.assistantEvents,
      delta: deltaFromSeries(series.assistantEvents),
      icon: '🤖',
    },
  ]
})

const topAssignees = computed(() => analyticsStore.data?.topAssignees || [])
const recentHighlights = computed(() => analyticsStore.data?.recentHighlights || [])

async function load(range = analyticsStore.currentRange) {
  if (!orgId.value) return
  const res = await analyticsStore.fetchAnalytics(orgId.value, range)
  if (!res && analyticsStore.error) {
    toastStore.push('Analytics unavailable.', { type: 'warning' })
  } else if (res) {
    trackEvent('analytics_loaded', { range, orgId: orgId.value })
  }
}

function changeRange(range) {
  if (range === analyticsStore.currentRange) return
  load(range)
  trackEvent('analytics_range_change', { range, orgId: orgId.value })
}

function reload() {
  load()
}

watch(
  orgId,
  (id) => {
    if (!id) {
      analyticsStore.clear()
      return
    }
    orgStore.setOrg(id)
    load()
  },
  { immediate: true },
)

onMounted(() => {
  if (orgId.value) load()
})

function deltaFromSeries(series = []) {
  if (!series?.length) return 0
  const first = series[0]?.value ?? 0
  const last = series[series.length - 1]?.value ?? 0
  return last - first
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value || 0)
}

function formatAssignee(uid: string) {
  if (!uid || uid === 'unassigned') return 'Unassigned'
  return uid
}

function formatDate(value: any) {
  try {
    const date = value instanceof Date ? value : new Date(value)
    return date.toLocaleString()
  } catch {
    return String(value)
  }
}
</script>

<style scoped>
.org-analytics {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100%;
}

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.analytics-header h1 {
  margin: 0 0 4px;
  font-size: 1.8rem;
  color: #0f172a;
}

.analytics-header p {
  margin: 0;
  color: rgba(30, 41, 59, 0.7);
}

.range-toggle {
  display: inline-flex;
  gap: 10px;
  background: rgba(79, 70, 229, 0.08);
  padding: 6px;
  border-radius: 999px;
}

.range-pill {
  border: none;
  background: transparent;
  color: rgba(79, 70, 229, 0.7);
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.16s ease;
}
.range-pill:hover {
  background: rgba(79, 70, 229, 0.16);
}
.range-pill.active {
  background: #4f46e5;
  color: #fff;
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.28);
}

.alert {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.92rem;
  display: flex;
  align-items: center;
  gap: 12px;
}
.alert.error {
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #b91c1c;
}
.alert .toast__action {
  border: none;
  background: rgba(248, 113, 113, 0.2);
  color: #fee2e2;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
}

.analytics-skeleton {
  display: grid;
  gap: 18px;
}

.skeleton-card,
.skeleton-wide {
  border-radius: 16px;
  background: linear-gradient(120deg, rgba(226, 232, 240, 0.6), rgba(226, 232, 240, 0.3));
  height: 96px;
  position: relative;
  overflow: hidden;
}

.skeleton-card::after,
.skeleton-wide::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.45) 45%, transparent 90%);
  animation: shimmer 1.5s infinite;
}

.skeleton-wide {
  height: 72px;
}

.empty-state {
  background: rgba(255, 255, 255, 0.85);
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  color: rgba(30, 41, 59, 0.7);
}

.analytics-content {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}

.stat-card {
  background: linear-gradient(145deg, rgba(79, 70, 229, 0.12), rgba(129, 140, 248, 0.08));
  border: 1px solid rgba(79, 70, 229, 0.25);
  border-radius: 18px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-card header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-card h3 {
  margin: 0;
  font-size: 1rem;
  color: #312e81;
}

.stat-card .emoji {
  font-size: 1.2rem;
}

.stat-card .value {
  margin: 0;
  font-size: 1.9rem;
  font-weight: 700;
  color: #0f172a;
}

.stat-card .trend {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(30, 41, 59, 0.7);
}

.stat-card .trend.up {
  color: #10b981;
}
.stat-card .trend.down {
  color: #ef4444;
}

.insights-panel {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.panel {
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.25);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.assignee-list,
.highlight-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assignee-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
  color: rgba(17, 24, 39, 0.85);
}

.highlight-list li {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
}

.highlight-list .badge {
  background: rgba(79, 70, 229, 0.18);
  color: #4338ca;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.highlight-list .details p {
  margin: 0;
  color: rgba(17, 24, 39, 0.92);
  font-weight: 600;
}

.highlight-list .details small {
  color: rgba(107, 114, 128, 0.9);
}

.muted {
  color: rgba(107, 114, 128, 0.9);
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

@media (max-width: 768px) {
  .analytics-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .range-toggle {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
