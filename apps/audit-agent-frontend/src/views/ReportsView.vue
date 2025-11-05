<template>
  <div class="p-4 sm:p-6">
    <h2 class="text-xl font-semibold mb-3">📈 Reports</h2>
    <p class="text-gray-400 text-sm mb-4">Generate weekly or monthly summaries and access recent reports.</p>

    <div class="flex items-center gap-2 mb-4">
      <button @click="run('weekly')" :disabled="generating" class="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Generate Weekly</button>
      <button @click="run('monthly')" :disabled="generating" class="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm">Generate Monthly</button>
      <label class="text-xs text-gray-300 flex items-center gap-1 ml-2">
        <input type="checkbox" v-model="sendEmail" /> Email me the report
      </label>
    </div>

    <div v-if="generating" class="text-gray-400 text-sm mb-4">Generating report…</div>

    <div class="mt-8">
      <h3 class="text-lg font-semibold mb-3">🧩 Tasks by Category</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div
          v-for="category in categories"
          :key="category"
          class="rounded-xl p-4 bg-slate-800 text-slate-100 shadow-md"
        >
          <div class="text-2xl">{{ categoryIconLabel(category) }}</div>
          <div class="text-sm font-medium mt-1">{{ category }}</div>
          <div class="text-xl font-bold" :class="categoryColorLabel(category)">
            {{ categoryCounts[category] || 0 }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="loadingReports" class="flex flex-col items-center justify-center py-8">
      <el-skeleton :rows="4" animated style="width: 80%;" />
      <p class="text-slate-400 text-sm mt-2">Loading reports…</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div v-for="r in reports" :key="r.id" class="p-3 rounded-xl bg-gray-900/70 border border-gray-700">
        <div class="flex items-center justify-between mb-1">
          <div class="font-medium">{{ resolveReportTitle(r) }} • {{ r.start }} → {{ r.end }}</div>
          <small class="opacity-70">{{ formatDate(r.createdAt) }}</small>
        </div>
        <div class="text-sm text-gray-300 mb-2">
          Completed: <b>{{ r.metrics?.totalCompleted || 0 }}</b>
          <span class="mx-2">•</span>
          Total: <b>{{ r.metrics?.totalTasks || 0 }}</b>
        </div>
        <div class="flex items-center gap-3">
          <a v-if="r.urls?.html" :href="r.urls.html" target="_blank" class="px-3 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white text-xs">View HTML</a>
          <a v-if="r.urls?.pdf" :href="r.urls.pdf" target="_blank" class="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs">Download PDF</a>
          <a v-if="r.urls?.json" :href="r.urls.json" target="_blank" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs">View JSON</a>
        </div>
      </div>
    </div>
  </div>
  
</template>

<script setup>
import { ref, onMounted } from 'vue'
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
