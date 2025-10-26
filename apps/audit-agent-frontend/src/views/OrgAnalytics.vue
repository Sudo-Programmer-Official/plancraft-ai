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
