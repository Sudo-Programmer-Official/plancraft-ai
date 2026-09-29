<template>
  <div class="reports-page min-h-full bg-pc-bg text-pc-text">
    <div class="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section class="rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-pc-card sm:p-7">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-2xl">
            <p class="eyebrow">Workspace overview</p>
            <h1 class="mt-2 text-2xl font-semibold tracking-tight text-pc-text sm:text-3xl">Progress, made visible</h1>
            <p class="mt-2 text-sm leading-6 text-pc-text-muted sm:text-base">
              A focused view of completion, workload, and the latest snapshots for your active workspace.
            </p>
            <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-pc-accent-border bg-pc-accent-soft px-3 py-1.5 font-medium text-pc-accent-text">
                <Building2 :size="14" aria-hidden="true" />
                {{ activeWorkspace?.name || 'Personal' }}
              </span>
              <span class="rounded-full border border-pc-border bg-pc-surface-2 px-3 py-1.5 text-pc-text-muted">
                {{ workspaceRole }} access
              </span>
              <span v-if="teamMemberCount !== null" class="rounded-full border border-pc-border bg-pc-surface-2 px-3 py-1.5 text-pc-text-muted">
                {{ teamMemberCount }} team member{{ teamMemberCount === 1 ? '' : 's' }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-3 lg:items-end">
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                @click="run('weekly')"
                :disabled="generating"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--pc-accent-fill)] px-4 py-2.5 text-sm font-semibold text-white shadow-pc-button transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BarChart3 :size="16" aria-hidden="true" />
                Generate weekly
              </button>
              <button
                type="button"
                @click="run('monthly')"
                :disabled="generating"
                class="inline-flex items-center justify-center gap-2 rounded-xl border border-pc-border-strong bg-pc-surface px-4 py-2.5 text-sm font-semibold text-pc-text transition hover:border-pc-accent hover:text-pc-accent-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarDays :size="16" aria-hidden="true" />
                Monthly
              </button>
            </div>
            <label class="inline-flex items-center gap-2 text-xs text-pc-text-muted">
              <input v-model="sendEmail" type="checkbox" class="h-4 w-4 rounded border-pc-border-strong text-pc-accent focus:ring-pc-accent" />
              Email me when ready
            </label>
          </div>
        </div>
        <div v-if="generating" class="mt-5 inline-flex items-center gap-2 rounded-xl border border-pc-accent-border bg-pc-accent-soft px-3 py-2 text-sm text-pc-accent-text">
          <span class="h-2 w-2 animate-pulse rounded-full bg-pc-accent" aria-hidden="true" />
          Generating your snapshot…
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-pc-border bg-pc-surface p-5 shadow-pc-card">
          <div class="flex items-center justify-between">
            <p class="eyebrow">Completion</p>
            <CheckCircle2 :size="18" class="text-pc-accent" aria-hidden="true" />
          </div>
          <p class="mt-3 text-3xl font-semibold tracking-tight text-pc-text">{{ completionRate !== null ? `${completionRate}%` : '—' }}</p>
          <p class="mt-1 text-sm text-pc-text-muted">{{ latestReport ? 'From your latest report' : 'Generate a report to track progress' }}</p>
        </div>
        <div class="rounded-2xl border border-pc-border bg-pc-surface p-5 shadow-pc-card">
          <div class="flex items-center justify-between">
            <p class="eyebrow">Tasks tracked</p>
            <FileText :size="18" class="text-pc-accent" aria-hidden="true" />
          </div>
          <p class="mt-3 text-3xl font-semibold tracking-tight text-pc-text">{{ latestReport?.metrics?.totalTasks ?? '—' }}</p>
          <p class="mt-1 text-sm text-pc-text-muted">{{ latestReport?.metrics?.totalCompleted ?? 0 }} completed in the latest snapshot</p>
        </div>
        <div class="rounded-2xl border border-pc-border bg-pc-surface p-5 shadow-pc-card">
          <div class="flex items-center justify-between">
            <p class="eyebrow">Team members</p>
            <Users :size="18" class="text-pc-accent" aria-hidden="true" />
          </div>
          <p class="mt-3 text-3xl font-semibold tracking-tight text-pc-text">{{ teamMemberCount ?? '—' }}</p>
          <p class="mt-1 text-sm text-pc-text-muted">People included in this workspace</p>
        </div>
      </section>

      <section class="rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-pc-card sm:p-7">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="eyebrow">Task mix</p>
            <h2 class="mt-2 text-xl font-semibold text-pc-text">Where your energy is going</h2>
            <p class="mt-1 text-sm text-pc-text-muted">Tasks captured over the last 30 days in {{ activeWorkspace?.name || 'this workspace' }}.</p>
          </div>
          <button
            type="button"
            @click="fetchCategorySnapshot(true)"
            class="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-pc-border-strong bg-pc-surface px-3.5 py-2 text-sm font-medium text-pc-text-muted transition hover:border-pc-accent hover:text-pc-accent-text"
          >
            <RefreshCw :size="15" aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div v-if="loadingCategories" class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 6" :key="i" class="h-28 animate-pulse rounded-2xl bg-pc-surface-2" />
        </div>
        <template v-else>
          <EmptyState
            v-if="!workspaceReady"
            title="Pick a workspace"
            subtitle="Switch to a workspace to see its category mix."
            icon="🧭"
          />
          <div v-else-if="hasCategoryData" class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div v-for="category in categories" :key="category" class="rounded-2xl border border-pc-border bg-pc-surface-2 p-4 transition hover:border-pc-accent-border">
              <div class="flex items-center justify-between">
                <span class="text-2xl" aria-hidden="true">{{ categoryIconLabel(category) }}</span>
                <span class="text-xs font-medium uppercase tracking-[0.16em] text-pc-text-subtle">{{ category }}</span>
              </div>
              <p class="mt-4 text-3xl font-semibold text-pc-accent-text">{{ categoryCounts[category] || 0 }}</p>
              <p class="mt-1 text-sm text-pc-text-muted">{{ categoryCounts[category] ? summaryForCategory(categoryCounts[category]) : 'No tasks logged yet.' }}</p>
            </div>
          </div>
          <EmptyState
            v-else
            title="No activity yet"
            subtitle="Schedule a few tasks and your category mix will appear here."
            icon="🗂️"
          />
        </template>
      </section>

      <section class="rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-pc-card sm:p-7">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="eyebrow">Snapshots</p>
            <h2 class="mt-2 text-xl font-semibold text-pc-text">Generated reports</h2>
            <p class="mt-1 text-sm text-pc-text-muted">Revisit recent progress summaries for the active workspace.</p>
          </div>
          <span class="self-start rounded-full border border-pc-border bg-pc-surface-2 px-3 py-1 text-xs font-medium text-pc-text-muted">
            {{ reports.length }} available
          </span>
        </div>

        <div v-if="loadingReports" class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div v-for="i in 2" :key="i" class="h-48 animate-pulse rounded-2xl bg-pc-surface-2" />
        </div>
        <EmptyState
          v-else-if="!workspaceReady"
          title="Pick a workspace"
          subtitle="Switch to a workspace to load its reports."
          icon="🧭"
        />
        <EmptyState
          v-else-if="!reports.length"
          title="No reports yet"
          subtitle="Generate a weekly or monthly report to create your first progress snapshot."
          icon="📊"
        />
        <div v-else class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <article v-for="r in reports" :key="r.id" class="rounded-2xl border border-pc-border bg-pc-surface-2 p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="font-semibold text-pc-text">{{ resolveReportTitle(r) }}</h3>
                <p class="mt-1 text-xs uppercase tracking-[0.12em] text-pc-text-subtle">{{ r.start }} → {{ r.end }}</p>
              </div>
              <span class="whitespace-nowrap text-xs text-pc-text-subtle">{{ formatDate(r.createdAt) }}</span>
            </div>
            <div class="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-pc-text-muted">
              <span class="inline-flex items-center gap-1.5"><CheckCircle2 :size="15" class="text-pc-accent" aria-hidden="true" /><b class="text-pc-text">{{ r.metrics?.totalCompleted || 0 }}</b> completed</span>
              <span class="inline-flex items-center gap-1.5"><FileText :size="15" aria-hidden="true" /><b class="text-pc-text">{{ r.metrics?.totalTasks || 0 }}</b> total</span>
              <span v-if="r.metrics?.completionRate !== undefined" class="inline-flex items-center gap-1.5"><BarChart3 :size="15" aria-hidden="true" /><b class="text-pc-text">{{ Math.round((r.metrics?.completionRate || 0) * 100) }}%</b> complete</span>
            </div>
            <div v-if="r.metrics?.contributors?.length" class="mt-4 flex flex-wrap gap-2">
              <span v-for="c in r.metrics.contributors.slice(0, 3)" :key="c.userId || c.email || c.name || c" class="rounded-full border border-pc-border bg-pc-surface px-2.5 py-1 text-xs text-pc-text-muted">
                {{ contributorLabel(c) }}
              </span>
            </div>
            <div class="mt-5 flex flex-wrap items-center gap-2 text-sm">
              <a v-if="r.urls?.html" :href="r.urls.html" target="_blank" class="inline-flex items-center gap-1.5 rounded-lg bg-[image:var(--pc-accent-fill)] px-3 py-2 font-semibold text-white transition hover:opacity-95">View report <ArrowUpRight :size="14" aria-hidden="true" /></a>
              <a v-if="r.urls?.pdf" :href="r.urls.pdf" target="_blank" class="inline-flex items-center gap-1.5 rounded-lg border border-pc-border-strong bg-pc-surface px-3 py-2 font-medium text-pc-text-muted transition hover:border-pc-accent hover:text-pc-accent-text"><Download :size="14" aria-hidden="true" /> PDF</a>
              <a v-if="r.urls?.json" :href="r.urls.json" target="_blank" class="inline-flex items-center gap-1.5 rounded-lg border border-pc-border-strong bg-pc-surface px-3 py-2 font-medium text-pc-text-muted transition hover:border-pc-accent hover:text-pc-accent-text"><FileText :size="14" aria-hidden="true" /> JSON</a>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { listReports, generateReport } from '@/services/reportsService'
import { ElMessage } from 'element-plus'
import { fetchTasksBetween } from '@/services/firebaseService'
import { toLocalDateKey } from '@/utils/dateHelper'
import { TASK_CATEGORY_FILTERS, getCategoryIcon, resolveCategory } from '@/constants/taskCategories'
import EmptyState from '@/components/EmptyState.vue'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  Users,
} from 'lucide-vue-next'

const reports = ref([])
const loadingReports = ref(true)
const generating = ref(false)
const sendEmail = ref(false)
const categories = TASK_CATEGORY_FILTERS.filter((c) => c !== 'All')
const categoryCounts = ref({})
const loadingCategories = ref(true)
const workspaceStore = useWorkspaceStore()

const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId)
const activeWorkspace = computed(() => workspaceStore.activeWorkspace || null)
const workspaceRole = computed(() => workspaceStore.activeWorkspaceRole || 'viewer')
const workspaceReady = computed(() => workspaceStore.hydrated && !!workspaceStore.activeWorkspaceId)
const latestReport = computed(() => reports.value?.[0] || null)
const teamMemberCount = computed(() => {
  const fromReport = latestReport.value?.metrics?.teamMembers
  if (typeof fromReport === 'number') return fromReport
  if (activeWorkspace.value?.seatsUsed != null) return activeWorkspace.value.seatsUsed
  if (Array.isArray(workspaceStore.workspaces)) return workspaceStore.workspaces.length || null
  return null
})
const completionRate = computed(() => {
  const raw = latestReport.value?.metrics?.completionRate
  if (typeof raw === 'number') return Math.round(raw * 100)
  return null
})

function formatDate(d) {
  try {
    const dt = (d?.toDate ? d.toDate() : (typeof d === 'string' ? new Date(d) : d))
    return dt ? dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  } catch { return '' }
}

function resolveReportTitle(report) {
  const raw = report?.title
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object') {
    const candidate = raw.name || raw.label || raw.en || raw.title || raw.value
    if (typeof candidate === 'string' && candidate.trim()) return candidate
    if (import.meta.env && import.meta.env.DEV) console.debug('[ReportNormalizer]', raw)
  }
  const period = typeof report?.period === 'string' ? report.period : ''
  if (period) return `${period.toUpperCase()} Report`
  return 'Untitled Report'
}

function categoryIconLabel(category) {
  return getCategoryIcon(category)
}

function contributorLabel(contributor) {
  if (!contributor) return 'Member • 0/0'
  const name = contributor.name || contributor.email || contributor.userId || 'Member'
  const completed = Number(contributor.completed || 0)
  const total = Number(contributor.total || 0)
  return `${name} • ${completed}/${total}`
}

const hasCategoryData = computed(() => {
  return Object.values(categoryCounts.value || {}).some((count) => Number(count) > 0)
})

function summaryForCategory(count) {
  if (!count) return ''
  if (count === 1) return '1 task captured'
  if (count <= 3) return `${count} tasks logged`
  return `${count} tasks logged — keep the streak going!`
}

async function fetchCategorySnapshot(showSpinner = false) {
  if (showSpinner) loadingCategories.value = true
  const wsId = activeWorkspaceId.value
  try {
    if (!wsId) {
      categoryCounts.value = {}
      return
    }
    const now = new Date()
    const endYMD = toLocalDateKey(now)
    const start = new Date(now)
    start.setDate(start.getDate() - 29)
    const startYMD = toLocalDateKey(start)
    const tasks = await fetchTasksBetween(startYMD, endYMD)
    const counts = {}
    for (const task of tasks) {
      const key = resolveCategory(task?.category)
      counts[key] = (counts[key] || 0) + 1
    }
    categoryCounts.value = counts
  } catch {
    categoryCounts.value = {}
  } finally {
    loadingCategories.value = false
  }
}

async function fetchReports(showSpinner = false) {
  if (showSpinner) loadingReports.value = true
  try {
    const wsId = activeWorkspaceId.value
    if (!wsId) {
      reports.value = []
      return
    }
    reports.value = await listReports(3, wsId)
  } catch {
    reports.value = []
  } finally {
    loadingReports.value = false
  }
}

async function run(period) {
  const wsId = activeWorkspaceId.value
  if (!wsId) {
    ElMessage({ type: 'warning', message: 'Pick a workspace first', duration: 1800 })
    return
  }
  generating.value = true
  try {
    const r = await generateReport(period, sendEmail.value, wsId)
    if (r) {
      ElMessage({ type: 'success', message: 'Report generated', duration: 1500 })
      await fetchReports(true)
      await fetchCategorySnapshot()
    }
  } catch {
    ElMessage({ type: 'error', message: 'Failed to generate report', duration: 2000 })
  } finally {
    generating.value = false
  }
}

watch(
  () => ({ ready: workspaceReady.value, hydrated: workspaceStore.hydrated }),
  ({ ready, hydrated }) => {
    if (!hydrated) return
    if (ready) {
      fetchReports(true)
      fetchCategorySnapshot(true)
    } else {
      reports.value = []
      categoryCounts.value = {}
      loadingReports.value = false
      loadingCategories.value = false
    }
  },
  { immediate: true },
)

watch(
  () => activeWorkspaceId.value,
  (id, prev) => {
    if (!workspaceReady.value) return
    if (!prev) return
    if (prev && id === prev) return
    fetchReports(true)
    fetchCategorySnapshot(true)
  },
)

onMounted(() => {
  if (!workspaceStore.hydrated) {
    workspaceStore.init()
  }
})
</script>

<style scoped>
.reports-page :deep(.eyebrow) {
  color: var(--pc-accent-text);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  line-height: 1rem;
  text-transform: uppercase;
}

.reports-page :deep(.empty-state) {
  border-color: var(--pc-border);
  background: var(--pc-surface-2);
  box-shadow: none;
}

.reports-page :deep(.empty-state h3) {
  color: var(--pc-text);
}

.reports-page :deep(.empty-state p) {
  color: var(--pc-text-muted);
}
</style>
