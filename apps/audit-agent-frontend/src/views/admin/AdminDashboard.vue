<template>
  <section class="admin-dashboard">
    <header class="dashboard-header">
      <div>
        <h1>Cross-org analytics</h1>
        <p v-if="summary">{{ summary }}</p>
        <p v-else>Compare velocity, sentiment, and completion across active workspaces.</p>
      </div>
      <div class="controls">
        <div class="range-toggle">
          <button
            v-for="option in ranges"
            :key="option.value"
            type="button"
            class="range-pill"
            :class="{ active: selectedRange === option.value }"
            @click="setRange(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <label class="limit-select">
          <span>Teams</span>
          <select v-model.number="orgLimit">
            <option v-for="size in [5, 8, 12, 16]" :key="size" :value="size">{{ size }}</option>
          </select>
        </label>
      </div>
    </header>

    <div v-if="error" class="alert">{{ error }}</div>
    <div v-else-if="loading" class="skeleton-grid">
      <div v-for="n in 5" :key="n" class="skeleton-card" />
    </div>
    <div v-else-if="!orgs.length" class="empty">
      <h2>No analytics yet</h2>
      <p>Once teams begin collaborating, cross-org metrics will appear here.</p>
    </div>
    <div v-else class="dashboard-content">
      <section class="stats-grid">
        <article class="stat-card">
          <h3>Velocity leaders</h3>
          <ol>
            <li v-for="item in rankings.velocity" :key="item.orgId">
              <span>{{ item.name }}</span>
              <strong>{{ item.velocity.toFixed(2) }}</strong>
            </li>
          </ol>
        </article>
        <article class="stat-card">
          <h3>Positive sentiment</h3>
          <ol>
            <li v-for="item in rankings.sentiment" :key="item.orgId">
              <span>{{ item.name }}</span>
              <strong>{{ item.sentiment.toFixed(2) }}</strong>
            </li>
          </ol>
        </article>
        <article class="stat-card">
          <h3>Completion rate</h3>
          <ol>
            <li v-for="item in rankings.completion" :key="item.orgId">
              <span>{{ item.name }}</span>
              <strong>{{ item.completionRate.toFixed(1) }}%</strong>
            </li>
          </ol>
        </article>
      </section>

      <section class="chart-grid">
        <article class="chart-card wide">
          <header>
            <h2>Velocity comparison</h2>
            <span>{{ orgs.length }} teams</span>
          </header>
          <SimpleBarChart :data="velocityBars" :width="520" :height="140" color="#6366f1" />
        </article>

        <article class="chart-card">
          <header>
            <h2>Sentiment radar</h2>
            <span>{{ selectedOrg?.name }}</span>
          </header>
          <RadarChart :axes="radarAxes" :size="220" />
          <p class="hint">Metrics normalized across selected range.</p>
        </article>

        <article class="chart-card">
          <header>
            <h2>Velocity trend</h2>
            <span>{{ selectedOrg?.name }}</span>
          </header>
          <SimpleLineChart :data="velocityTrend" :width="320" :height="100" color="#10b981" />
        </article>
      </section>

      <section class="details-grid">
        <aside class="org-selector">
          <h3>Teams</h3>
          <ul>
            <li
              v-for="org in orgs"
              :key="org.orgId"
              :class="{ active: org.orgId === selectedOrgId }"
              @click="selectOrg(org.orgId)"
            >
              <span class="name">{{ org.name }}</span>
              <span class="meta">Velocity {{ org.velocity.toFixed(2) }} · Sent {{ org.sentiment.toFixed(2) }}</span>
            </li>
          </ul>
        </aside>

        <article class="org-insights" v-if="selectedOrg">
          <header>
            <h2>{{ selectedOrg.name }}</h2>
            <p>Completion rate {{ selectedOrg.completionRate.toFixed(1) }}% · Assistant {{ selectedOrg.assistantEvents }}</p>
          </header>
          <div v-if="selectedOrg.highlights?.length" class="highlights">
            <h3>Recent highlights</h3>
            <ul>
              <li v-for="item in selectedOrg.highlights" :key="item.id">
                <span class="badge">{{ item.type }}</span>
                <span class="title">{{ item.title }}</span>
              </li>
            </ul>
          </div>
          <p v-else class="muted">No highlights captured during this period.</p>
        </article>

        <article class="ai-summary" v-if="summary">
          <h2>AI benchmark summary</h2>
          <p class="summary-text">{{ summary }}</p>
        </article>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/services/api'
import SimpleLineChart from '@/components/admin/SimpleLineChart.vue'
import SimpleBarChart from '@/components/admin/SimpleBarChart.vue'
import RadarChart from '@/components/admin/RadarChart.vue'

const ranges = [
  { value: '30d', label: '30d' },
  { value: '60d', label: '60d' },
  { value: '90d', label: '90d' },
]

const loading = ref(false)
const error = ref('')
const analytics = ref(null)
const selectedRange = ref('30d')
const orgLimit = ref(8)
const selectedOrgId = ref(null)

const orgs = computed(() => analytics.value?.orgs || [])
const rankings = computed(() => analytics.value?.rankings || { velocity: [], sentiment: [], completion: [] })
const summary = computed(() => analytics.value?.summary || '')
const selectedOrg = computed(() => orgs.value.find((org) => org.orgId === selectedOrgId.value) || orgs.value[0] || null)

const velocityBars = computed(() =>
  [...orgs.value]
    .sort((a, b) => b.velocity - a.velocity)
    .map((org) => ({ label: org.name, value: org.velocity }))
)

const maxVelocity = computed(() => Math.max(1, ...orgs.value.map((org) => org.velocity)))

const radarAxes = computed(() => {
  if (!selectedOrg.value) return []
  return [
    {
      label: 'Velocity',
      value: maxVelocity.value ? selectedOrg.value.velocity / maxVelocity.value : 0,
    },
    {
      label: 'Completion',
      value: Math.max(0, Math.min(1, selectedOrg.value.completionRate / 100)),
    },
    {
      label: 'Sentiment',
      value: Math.max(0, Math.min(1, (selectedOrg.value.sentiment + 1) / 2)),
    },
  ]
})

const velocityTrend = computed(() => {
  const series = selectedOrg.value?.trend || []
  return series.map((entry) => ({ day: entry.date, value: entry.value }))
})

async function fetchAnalytics() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.get('/admin/analytics', {
      params: { range: selectedRange.value, limit: orgLimit.value },
    })
    analytics.value = response?.data || null
    if (!analytics.value) throw new Error('Empty analytics response')
    if (!selectedOrgId.value && analytics.value.orgs?.length) {
      selectedOrgId.value = analytics.value.orgs[0].orgId
    }
  } catch (err) {
    console.error('[AdminDashboard] analytics fetch failed', err)
    error.value = err?.response?.data?.error || err?.message || 'Unable to load analytics'
    analytics.value = null
  } finally {
    loading.value = false
  }
}

function setRange(range) {
  if (selectedRange.value === range) return
  selectedRange.value = range
}

function selectOrg(orgId) {
  selectedOrgId.value = orgId
}

watch(selectedRange, () => {
  fetchAnalytics()
})

watch(orgLimit, () => {
  fetchAnalytics()
})

watch(orgs, (next) => {
  if (next.length && !next.some((org) => org.orgId === selectedOrgId.value)) {
    selectedOrgId.value = next[0].orgId
  }
})

onMounted(fetchAnalytics)
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
  color: #0f172a;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.dashboard-header h1 {
  margin: 0 0 8px;
  font-size: 2rem;
}

.dashboard-header p {
  margin: 0;
  color: rgba(30, 41, 59, 0.6);
}

.controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.range-toggle {
  display: inline-flex;
  gap: 8px;
}

.range-pill {
  border: none;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.15);
  color: #312e81;
  cursor: pointer;
  font-weight: 600;
}

.range-pill.active {
  background: #6366f1;
  color: #f8fafc;
}

.limit-select {
  display: flex;
  flex-direction: column;
  font-size: 0.75rem;
  color: rgba(30, 41, 59, 0.65);
}

.limit-select select {
  margin-top: 4px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.alert {
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(248, 113, 113, 0.12);
  color: #b91c1c;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.skeleton-card {
  height: 140px;
  border-radius: 16px;
  background: linear-gradient(90deg, rgba(226, 232, 240, 0.5) 25%, rgba(226, 232, 240, 0.2) 37%, rgba(226, 232, 240, 0.5) 63%);
  background-size: 400% 100%;
  animation: skeleton 1.4s ease infinite;
}

@keyframes skeleton {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}

.empty {
  text-align: center;
  padding: 48px;
  border-radius: 20px;
  border: 1px dashed rgba(99, 102, 241, 0.3);
  color: rgba(30, 41, 59, 0.65);
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 18px;
  border-radius: 18px;
  background: rgba(99, 102, 241, 0.08);
  border: 1px solid rgba(99, 102, 241, 0.18);
}

.stat-card h3 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.stat-card ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
}

.stat-card li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.chart-card {
  padding: 18px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-card header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.chart-card header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.chart-card header span {
  color: rgba(30, 41, 59, 0.5);
  font-size: 0.85rem;
}

.chart-card.wide {
  grid-column: span 2;
}

.hint {
  font-size: 0.75rem;
  color: rgba(30, 41, 59, 0.55);
}

.details-grid {
  display: grid;
  grid-template-columns: minmax(220px, 260px) repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.org-selector {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: #fff;
  padding: 16px;
}

.org-selector h3 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.org-selector ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.org-selector li {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  background: rgba(248, 250, 252, 0.9);
  transition: border-color 160ms ease, background 160ms ease;
}

.org-selector li.active {
  border-color: rgba(99, 102, 241, 0.55);
  background: rgba(99, 102, 241, 0.12);
}

.org-selector .name {
  display: block;
  font-weight: 600;
}

.org-selector .meta {
  font-size: 0.75rem;
  color: rgba(30, 41, 59, 0.55);
}

.org-insights,
.ai-summary {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: #fff;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.org-insights h2,
.ai-summary h2 {
  margin: 0;
  font-size: 1.2rem;
}

.highlights ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.highlights li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(129, 140, 248, 0.16);
  font-size: 0.75rem;
  color: #4338ca;
}

.muted {
  color: rgba(30, 41, 59, 0.55);
  font-size: 0.9rem;
}

.summary-text {
  white-space: pre-wrap;
  margin: 0;
  color: rgba(30, 41, 59, 0.8);
}

@media (max-width: 960px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .controls {
    flex-wrap: wrap;
  }

  .chart-card.wide {
    grid-column: span 1;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
