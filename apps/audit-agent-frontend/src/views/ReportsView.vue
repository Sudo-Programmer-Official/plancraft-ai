<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <header class="space-y-4">
        <div>
          <h1 class="text-3xl font-semibold text-slate-50 flex items-center gap-2">
            <span>📈</span>
            <span>Reports & Insights</span>
          </h1>
          <p class="text-sm sm:text-base text-slate-300 max-w-2xl">
            Generate weekly or monthly summaries, keep an eye on category balance, and revisit your
            AI-crafted reports whenever you need a progress reset.
          </p>
        </div>

        <div
          class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl bg-slate-900/50 border border-slate-800/60 px-4 py-4 shadow-lg shadow-indigo-900/40"
        >
          <div class="flex items-center gap-2 text-sm text-indigo-100/80">
            <span class="text-lg">⚡️</span>
            <span>Run a fresh report and optionally email it to yourself.</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 sm:ml-auto">
            <button
              @click="run('weekly')"
              :disabled="generating"
              class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900/40 disabled:text-indigo-300 text-white text-sm transition"
            >
              Generate Weekly
            </button>
            <button
              @click="run('monthly')"
              :disabled="generating"
              class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/40 disabled:text-purple-200 text-white text-sm transition"
            >
              Generate Monthly
            </button>
            <label class="text-xs text-slate-300 flex items-center gap-1 ml-1">
              <input type="checkbox" v-model="sendEmail" />
              Email me
            </label>
          </div>
        </div>

        <div v-if="generating" class="text-sm text-indigo-200 flex items-center gap-2">
          <span class="animate-spin" aria-hidden="true">🌀</span>
          <span>Generating report… hang tight!</span>
        </div>
      </header>

      <div class="space-y-10">
        <section
          class="rounded-3xl bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-indigo-950/60 border border-slate-800/60 shadow-2xl shadow-indigo-950/30 p-6 sm:p-8 space-y-6"
        >
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 class="text-xl font-semibold text-slate-100">📂 Tasks by Category</h2>
              <p class="text-sm text-slate-400">
                Track where your energy goes this month and rebalance if anything feels heavy.
              </p>
            </div>
            <button
              @click="fetchCategorySnapshot(true)"
              class="self-start sm:self-auto inline-flex items-center gap-2 text-xs font-medium text-indigo-200/80 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              🔁 Refresh categories
            </button>
          </div>

          <div v-if="loadingCategories" class="space-y-3">
            <el-skeleton :rows="2" animated />
            <el-skeleton :rows="2" animated />
          </div>

          <template v-else>
            <div
              v-if="hasCategoryData"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div
                v-for="category in categories"
                :key="category"
                class="rounded-2xl p-4 bg-slate-900/60 border border-slate-800/70 shadow-lg shadow-indigo-950/20"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="text-2xl">{{ categoryIconLabel(category) }}</div>
                  <div class="text-xs uppercase tracking-wide text-slate-400">{{ category }}</div>
                </div>
                <div class="text-3xl font-semibold" :class="categoryColorLabel(category)">
                  {{ categoryCounts[category] || 0 }}
                </div>
                <p class="text-xs text-slate-400 mt-2">
                  {{
                    categoryCounts[category]
                      ? summaryForCategory(categoryCounts[category])
                      : 'No tasks logged yet.'
                  }}
                </p>
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

        <section
          class="rounded-3xl bg-gradient-to-br from-slate-900/80 via-indigo-950/70 to-slate-900/70 border border-slate-800/60 shadow-2xl shadow-indigo-950/30 p-6 sm:p-8 space-y-6"
        >
          <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h2 class="text-xl font-semibold text-slate-100">🧾 Generated Reports</h2>
              <p class="text-sm text-slate-400">
                Recently generated summaries stay here so you can revisit progress snapshots or
                share them.
              </p>
            </div>
          </div>

          <div v-if="loadingReports" class="space-y-4">
            <el-skeleton v-for="i in 2" :key="i" :rows="3" animated />
          </div>

          <EmptyState
            v-else-if="!reports.length"
            title="No Reports Yet"
            subtitle="Generate a weekly or monthly report to view your progress."
            icon="📊"
          />

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="r in reports"
              :key="r.id"
              class="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 shadow-lg shadow-indigo-950/25 space-y-3"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="space-y-1">
                  <div class="font-medium text-slate-100">
                    {{ resolveReportTitle(r) }}
                  </div>
                  <div class="text-xs text-slate-400 tracking-wide uppercase">
                    {{ r.start }} → {{ r.end }}
                  </div>
                </div>
                <small class="text-slate-500 whitespace-nowrap">
                  {{ formatDate(r.createdAt) }}
                </small>
              </div>

              <div class="flex items-center gap-3 text-sm text-slate-300">
                <span class="flex items-center gap-1">
                  ✅ <b>{{ r.metrics?.totalCompleted || 0 }}</b> completed
                </span>
                <span class="opacity-50">•</span>
                <span class="flex items-center gap-1">
                  📋 <b>{{ r.metrics?.totalTasks || 0 }}</b> total
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-2 text-xs">
                <a
                  v-if="r.urls?.html"
                  :href="r.urls.html"
                  target="_blank"
                  class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-900/30"
                >
                  View HTML
                </a>
                <a
                  v-if="r.urls?.pdf"
                  :href="r.urls.pdf"
                  target="_blank"
                  class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-900/30"
                >
                  Download PDF
                </a>
                <a
                  v-if="r.urls?.json"
                  :href="r.urls.json"
                  target="_blank"
                  class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition shadow-md shadow-slate-900/30"
                >
                  View JSON
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { listReports, generateReport } from '@/services/reportsService'
import { ElMessage } from 'element-plus'
import { fetchTasksBetween } from '@/services/firebaseService'
import { toLocalDateKey } from '@/utils/dateHelper'
import { TASK_CATEGORY_FILTERS, getCategoryIcon, getCategoryColor, resolveCategory } from '@/constants/taskCategories'
import EmptyState from '@/components/EmptyState.vue'

const reports = ref([])
const loadingReports = ref(true)
const generating = ref(false)
const sendEmail = ref(false)
const categories = TASK_CATEGORY_FILTERS.filter((c) => c !== 'All')
const categoryCounts = ref({})
const loadingCategories = ref(true)

function formatDate(d) {
  try {
    const dt = (d?.toDate ? d.toDate() : (typeof d === 'string' ? new Date(d) : d))
    return dt ? dt.toLocaleString() : ''
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

function categoryColorLabel(category) {
  return getCategoryColor(category)
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
  try {
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
    reports.value = await listReports(3)
  } catch {
    reports.value = []
  } finally {
    loadingReports.value = false
  }
}

async function run(period) {
  generating.value = true
  try {
    const r = await generateReport(period, sendEmail.value)
    if (r) {
      ElMessage({ type: 'success', message: 'Report generated', duration: 1500 })
      await fetchReports(true)
      await fetchCategorySnapshot()
    }
  } catch (e) {
    ElMessage({ type: 'error', message: 'Failed to generate report', duration: 2000 })
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  fetchReports(true)
  fetchCategorySnapshot()
})
</script>

<style scoped>
</style>
