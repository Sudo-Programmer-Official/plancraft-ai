<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
    <header class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Leader Mode</p>
        <h1 class="text-3xl font-bold mt-2">Leader Dashboard</h1>
        <p class="text-slate-400 text-sm">Live summary across events, occasions, outreach, and issues.</p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="error" class="text-xs text-rose-300 bg-rose-900/30 px-3 py-1 rounded-full border border-rose-800">
          {{ error }}
        </span>
        <button
          class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-500 text-sm"
          @click="load"
        >
          Refresh
        </button>
      </div>
    </header>

    <section class="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div v-for="card in metricCards" :key="card.title" class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow">
        <div class="flex items-center justify-between">
          <p class="text-xs uppercase tracking-wide text-slate-400">{{ card.title }}</p>
          <span class="text-[10px] px-2 py-1 rounded-full border border-slate-700 bg-slate-800/70" v-if="card.hint">
            {{ card.hint }}
          </span>
        </div>
        <div class="text-3xl font-semibold mt-3">
          <span v-if="loading" class="animate-pulse text-slate-500">—</span>
          <span v-else>{{ card.value }}</span>
        </div>
        <p class="text-xs text-slate-500 mt-1">{{ card.subtitle }}</p>
      </div>
    </section>

    <section class="grid lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Recent issues</p>
            <p class="text-sm text-slate-500">Latest escalations and their owners.</p>
          </div>
          <RouterLink
            to="/leader/issues"
            class="text-xs px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:border-indigo-500"
          >
            View all
          </RouterLink>
        </div>
        <div v-if="loading" class="grid gap-2">
          <div v-for="n in 4" :key="n" class="h-12 bg-slate-800/60 rounded-lg animate-pulse" />
        </div>
        <div v-else-if="recentIssues.length === 0" class="text-sm text-slate-500">
          No issues reported yet.
        </div>
        <ul v-else class="divide-y divide-slate-800">
          <li v-for="issue in recentIssues" :key="issue.id" class="py-3 flex items-start justify-between gap-3">
            <div class="space-y-1">
              <p class="font-semibold">{{ issue.title }}</p>
              <p class="text-xs text-slate-400 line-clamp-2">{{ issue.description || 'No description' }}</p>
              <p class="text-[11px] text-slate-500">
                {{ issue.status || 'open' }} • {{ issue.updatedAt ? formatDate(issue.updatedAt) : 'new' }}
              </p>
            </div>
            <span
              class="text-[10px] px-2 py-1 rounded-full"
              :class="statusClasses(issue.status)"
            >
              {{ issue.status || 'open' }}
            </span>
          </li>
        </ul>
      </div>
      <div class="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Engagement score</p>
            <p class="text-sm text-slate-500">Activity across outreach and responses.</p>
          </div>
        </div>
        <div class="text-4xl font-semibold">
          <span v-if="loading" class="animate-pulse text-slate-500">—</span>
          <span v-else>{{ engagementScore }}</span>
        </div>
        <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400"
            :style="{ width: `${engagementPercent}%` }"
          />
        </div>
        <p class="text-xs text-slate-500">
          {{ engagementSummary }}
        </p>
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Events</span><span class="text-slate-200">{{ eventsCount }}</span>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Occasions</span><span class="text-slate-200">{{ upcomingOccasions }}</span>
          </div>
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Messages scheduled</span><span class="text-slate-200">{{ scheduledMessages }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { onMounted, computed, ref } from 'vue'
import dayjs from 'dayjs'
import { fetchDashboardSnapshot } from '@/services/leader/dashboard'

const loading = ref(false)
const error = ref('')
const snapshot = ref({
  events: null,
  occasions: null,
  messages: null,
  issues: null,
  summary: null,
})

const eventsCount = computed(() => snapshot.value.events?.totalThisMonth || snapshot.value.events?.count || 0)
const upcomingOccasions = computed(
  () => snapshot.value.occasions?.total || snapshot.value.occasions?.upcoming?.length || 0,
)
const scheduledMessages = computed(
  () => snapshot.value.messages?.scheduled || snapshot.value.messages?.count || snapshot.value.messages?.total || 0,
)
const engagementScore = computed(
  () => snapshot.value.summary?.score || snapshot.value.summary?.engagementScore || snapshot.value.summary?.value || 0,
)
const engagementPercent = computed(() => Math.min(100, Math.max(0, Number(engagementScore.value) || 0)))
const engagementSummary = computed(() => snapshot.value.summary?.summary || 'Higher scores reflect consistent outreach.')
const recentIssues = computed(() => snapshot.value.issues?.issues || snapshot.value.issues || [])

const metricCards = computed(() => [
  { title: 'Events this month', value: eventsCount.value, subtitle: 'Tracked across your calendar', hint: 'growth' },
  {
    title: 'Upcoming occasions',
    value: upcomingOccasions.value,
    subtitle: 'Birthdays and anniversaries',
    hint: 'growth',
  },
  {
    title: 'Scheduled messages',
    value: scheduledMessages.value,
    subtitle: 'Queued in posting-service',
    hint: 'posting',
  },
  {
    title: 'Open issues',
    value: recentIssues.value.filter((i) => (i.status || 'open') !== 'resolved').length,
    subtitle: 'Latest escalations',
    hint: 'growth',
  },
  { title: 'Engagement score', value: engagementScore.value, subtitle: 'Composite across services', hint: 'summary' },
])

function formatDate(value) {
  if (!value) return ''
  return dayjs(value).format('MMM D, YYYY')
}

function statusClasses(status) {
  const s = (status || 'open').toLowerCase()
  if (s === 'resolved')
    return 'bg-emerald-900/40 border border-emerald-700 text-emerald-200'
  if (s === 'in_progress')
    return 'bg-amber-900/40 border border-amber-700 text-amber-200'
  return 'bg-rose-900/40 border border-rose-800 text-rose-200'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchDashboardSnapshot()
    snapshot.value = res
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to load dashboard'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
