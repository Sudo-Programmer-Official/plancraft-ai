<template>
  <div class="space-y-6 dashboard-scroll p-2 sm:p-4">
    <h2 class="text-2xl font-bold">Overview</h2>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="p-4 rounded-lg bg-white/10 border border-white/10 min-h-[88px]">
        <div class="text-sm text-indigo-200">Users</div>
        <div class="text-3xl font-semibold">
          <span v-if="!loading">{{ stats.users }}</span>
          <span v-else class="inline-block w-10 h-6 bg-white/10 animate-pulse rounded"></span>
        </div>
      </div>
      <div class="p-4 rounded-lg bg-white/10 border border-white/10 min-h-[88px]">
        <div class="text-sm text-indigo-200">Active Subs</div>
        <div class="text-3xl font-semibold">
          <span v-if="!loading">{{ stats.activeSubs }}</span>
          <span v-else class="inline-block w-10 h-6 bg-white/10 animate-pulse rounded"></span>
        </div>
      </div>
      <div class="p-4 rounded-lg bg-white/10 border border-white/10 min-h-[88px]">
        <div class="text-sm text-indigo-200">Announcements</div>
        <div class="text-3xl font-semibold">
          <span v-if="!loading">{{ stats.notifications }}</span>
          <span v-else class="inline-block w-10 h-6 bg-white/10 animate-pulse rounded"></span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="p-4 rounded-lg bg-white/10 border border-white/10">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-indigo-200">Daily Users (14d)</div>
          <div class="text-xs text-slate-400">Premium: {{ stats.plans.premium }} · Free: {{ stats.plans.free }}</div>
        </div>
        <SimpleLineChart :data="chartUsers" :width="520" :height="100" color="#a78bfa" />
      </div>
      <div class="p-4 rounded-lg bg-white/10 border border-white/10">
        <div class="text-sm text-indigo-200 mb-2">Total Applications View</div>
        <div class="text-xs text-slate-300">Users, subscriptions and announcements combined trend.</div>
        <SimpleLineChart :data="chartCombined" :width="520" :height="100" color="#34d399" />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="p-4 rounded-lg bg-white/10 border border-white/10">
        <div class="text-sm text-indigo-200 mb-2">Feature Usage (7d) — Journal</div>
        <SimpleLineChart :data="chartUsageJournal" :width="320" :height="80" color="#60a5fa" />
        <div class="text-xs text-slate-400 mt-1">Total: {{ stats.usage.totals.journal }}</div>
      </div>
      <div class="p-4 rounded-lg bg-white/10 border border-white/10">
        <div class="text-sm text-indigo-200 mb-2">Feature Usage (7d) — Reminders</div>
        <SimpleLineChart :data="chartUsageReminders" :width="320" :height="80" color="#f59e0b" />
        <div class="text-xs text-slate-400 mt-1">Total: {{ stats.usage.totals.reminders }}</div>
      </div>
      <div class="p-4 rounded-lg bg-white/10 border border-white/10">
        <div class="text-sm text-indigo-200 mb-2">Feature Usage (7d) — Tasks</div>
        <SimpleLineChart :data="chartUsageTasks" :width="320" :height="80" color="#10b981" />
        <div class="text-xs text-slate-400 mt-1">Total: {{ stats.usage.totals.tasks }}</div>
      </div>
    </div>

    <div class="p-4 rounded-lg bg-white/10 border border-white/10">
      <div class="flex items-center justify-between">
        <div class="text-sm text-indigo-200">Payment Summary</div>
        <div class="text-xs text-slate-400">Price: ${{ stats.paymentsSummary.price }}/mo</div>
      </div>
      <div class="text-2xl font-semibold mt-1">MRR: ${{ stats.paymentsSummary.mrr }}</div>
      <div class="text-xs text-slate-400">Active Subs: {{ stats.paymentsSummary.activeSubs }}</div>
    </div>

    <div v-if="error" class="text-sm text-amber-300">⚠ {{ error }}</div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import api from '@/services/api'
import SimpleLineChart from '@/components/admin/SimpleLineChart.vue'

const stats = reactive({ users: 0, activeSubs: 0, notifications: 0, series: [], plans: { premium: 0, free: 0 }, usage: { totals: { journal: 0, reminders: 0, tasks: 0 }, series: [] }, paymentsSummary: { price: 0, mrr: 0, activeSubs: 0 } })
const loading = ref(true)
const error = ref('')

async function fetchStats() {
  loading.value = true
  try {
    // Add header fallback for role in case interceptor lacks user cache early
    const headers = {}
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const u = JSON.parse(userStr)
        if (u?.role) headers['x-user-role'] = u.role
      }
    } catch {}
    const res = await api.get('/admin/stats', { headers })
    const data = res?.data || {}
    stats.users = Number(data.users || 0)
    stats.activeSubs = Number(data.activeSubs || 0)
    stats.notifications = Number(data.notifications || 0)
    stats.series = Array.isArray(data.series) ? data.series : []
    stats.plans = data.plans || { premium: 0, free: 0 }
    stats.usage = data.usage || stats.usage
    stats.paymentsSummary = data.paymentsSummary || stats.paymentsSummary
    error.value = ''
  } catch (e) {
    const status = e?.response?.status
    if (status === 404) error.value = 'Stats route not found. API may need redeploy.'
    else if (status === 403) error.value = 'Access denied. Admin role required.'
    else error.value = 'Unable to load dashboard data.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)

const chartUsers = computed(() =>
  (stats.series || []).map(d => ({ day: d.day, value: d.users || 0 }))
)
const chartCombined = computed(() =>
  (stats.series || []).map(d => ({ day: d.day, value: (d.users || 0) + (d.premium || 0) }))
)

const chartUsageJournal = computed(() => (stats.usage.series || []).map(d => ({ day: d.day, value: d.journal || 0 })))
const chartUsageReminders = computed(() => (stats.usage.series || []).map(d => ({ day: d.day, value: d.reminders || 0 })))
const chartUsageTasks = computed(() => (stats.usage.series || []).map(d => ({ day: d.day, value: d.tasks || 0 })))
</script>

<style scoped>
.dashboard-scroll {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
</style>
