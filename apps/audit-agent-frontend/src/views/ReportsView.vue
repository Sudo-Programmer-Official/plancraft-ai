<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      <header class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 class="text-2xl sm:text-3xl font-semibold">📈 Reports & Insights</h1>
            <p class="text-sm text-slate-300">
              Generate fresh summaries and review how your focus evolved over time.
            </p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              @click="run('weekly')"
              :disabled="generating"
              class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm shadow-sm transition"
            >
              Generate Weekly
            </button>
            <button
              @click="run('monthly')"
              :disabled="generating"
              class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm shadow-sm transition"
            >
              Generate Monthly
            </button>
            <label class="text-xs text-slate-300 flex items-center gap-1 ml-1">
              <input type="checkbox" v-model="sendEmail" /> Email me the report
            </label>
          </div>
        </div>
        <p v-if="generating" class="text-xs text-indigo-200">Generating report… hang tight.</p>
      </header>

      <section class="report-section bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-indigo-950/70 border border-slate-800 rounded-2xl shadow-lg px-5 sm:px-7 py-6 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 class="text-lg sm:text-xl font-semibold text-slate-100">📂 Tasks by Category (last 30 days)</h2>
          <span v-if="!categoryLoading && totalCategoryCount" class="text-xs text-slate-300">
            {{ totalCategoryCount }} task{{ totalCategoryCount === 1 ? '' : 's' }} analysed
          </span>
        </div>

        <el-skeleton v-if="categoryLoading" :rows="3" animated />

        <div v-else-if="hasCategoryData" class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div
            v-for="category in categories"
            :key="category"
            class="rounded-xl p-4 bg-slate-900/70 border border-slate-700/50 shadow-inner shadow-slate-950/50 space-y-2"
          >
            <div class="text-2xl">{{ categoryIconLabel(category) }}</div>
            <div class="text-sm font-medium text-slate-200">{{ category }}</div>
            <div class="text-xl font-bold" :class="categoryColorLabel(category)">
              {{ categoryCounts[category] || 0 }}
            </div>
          </div>
        </div>

        <div v-else class="text-sm text-slate-300 py-4 text-center border border-dashed border-slate-700 rounded-xl">
          <div class="text-2xl mb-1">🧭</div>
          No recent tasks to analyse yet. Capture a few plans to see category insights.
        </div>
      </section>

      <section class="report-section bg-gradient-to-br from-slate-950/80 via-slate-900/70 to-indigo-950/70 border border-slate-800 rounded-2xl shadow-lg px-5 sm:px-7 py-6 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 class="text-lg sm:text-xl font-semibold text-slate-100">🧾 Generated Reports</h2>
          <span v-if="reports.length" class="text-xs text-slate-300">Most recent summaries</span>
        </div>

        <div v-if="loadingReports" class="space-y-4">
          <el-skeleton v-for="i in 2" :key="i" :rows="3" animated />
        </div>

        <div v-else-if="reports.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="r in reports"
            :key="r.id"
            class="p-4 rounded-xl bg-slate-900/80 border border-slate-700/50 shadow-inner shadow-slate-950/50 space-y-3"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm font-semibold text-slate-100">
                {{ resolveReportTitle(r) }}
              </div>
              <small class="text-[11px] text-slate-400">{{ formatDate(r.createdAt) }}</small>
            </div>
            <div class="text-xs text-slate-300 flex flex-wrap items-center gap-2">
              <span>Completed <b>{{ r.metrics?.totalCompleted || 0 }}</b></span>
              <span class="text-slate-500">•</span>
              <span>Total <b>{{ r.metrics?.totalTasks || 0 }}</b></span>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <a
                v-if="r.urls?.html"
                :href="r.urls.html"
                target="_blank"
                class="px-3 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white text-xs transition"
              >
                View HTML
              </a>
              <a
                v-if="r.urls?.pdf"
                :href="r.urls.pdf"
                target="_blank"
                class="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs transition"
              >
                Download PDF
              </a>
              <a
                v-if="r.urls?.json"
                :href="r.urls.json"
                target="_blank"
                class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs transition"
              >
                View JSON
              </a>
            </div>
          </div>
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center gap-2 py-8 text-slate-300 border border-dashed border-slate-700 rounded-xl"
        >
          <div class="text-3xl">📊</div>
          <p class="font-semibold">No reports yet</p>
          <p class="text-sm text-slate-400 max-w-sm text-center">
            Generate a weekly or monthly report to view your productivity trends and notes.
          </p>
        </div>
      </section>
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

const reports = ref([])
const loadingReports = ref(true)
const generating = ref(false)
const sendEmail = ref(false)
const categories = TASK_CATEGORY_FILTERS.filter((c) => c !== 'All')
const categoryCounts = ref({})
const categoryLoading = ref(true)

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

async function fetchCategorySnapshot() {
  try {
    categoryLoading.value = true
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
  } catch (err) {
    console.warn('Failed to load category snapshot', err?.message || err)
    categoryCounts.value = {}
  } finally {
    categoryLoading.value = false
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
    console.warn('Report generation failed', e?.message || e)
    ElMessage({ type: 'error', message: 'Failed to generate report', duration: 2000 })
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  fetchReports(true)
  fetchCategorySnapshot()
})

const totalCategoryCount = computed(() =>
  categories.reduce((sum, key) => sum + (categoryCounts.value[key] || 0), 0)
)

const hasCategoryData = computed(() => totalCategoryCount.value > 0)
</script>

<style scoped>
</style>
