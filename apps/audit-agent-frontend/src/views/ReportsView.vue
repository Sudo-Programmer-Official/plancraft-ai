<template>
  <div class="p-4 sm:p-6">
    <h2 class="text-xl font-semibold mb-3">📈 Reports</h2>
    <p class="text-gray-400 text-sm mb-4">Generate weekly or monthly summaries and access recent reports.</p>

    <div class="flex items-center gap-2 mb-4">
      <button @click="run('weekly')" :disabled="loading" class="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">Generate Weekly</button>
      <button @click="run('monthly')" :disabled="loading" class="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm">Generate Monthly</button>
      <label class="text-xs text-gray-300 flex items-center gap-1 ml-2">
        <input type="checkbox" v-model="sendEmail" /> Email me the report
      </label>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm">Generating report…</div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div v-for="r in reports" :key="r.id" class="p-3 rounded-xl bg-gray-900/70 border border-gray-700">
        <div class="flex items-center justify-between mb-1">
          <div class="font-medium">{{ r.period.toUpperCase() }} • {{ r.start }} → {{ r.end }}</div>
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

const reports = ref([])
const loading = ref(false)
const sendEmail = ref(false)

function formatDate(d) {
  try {
    const dt = (d?.toDate ? d.toDate() : (typeof d === 'string' ? new Date(d) : d))
    return dt ? dt.toLocaleString() : ''
  } catch { return '' }
}

async function fetchReports() {
  try { reports.value = await listReports(3) } catch { reports.value = [] }
}

async function run(period) {
  loading.value = true
  try {
    const r = await generateReport(period, sendEmail.value)
    if (r) {
      ElMessage({ type: 'success', message: 'Report generated', duration: 1500 })
      await fetchReports()
    }
  } catch (e) {
    ElMessage({ type: 'error', message: 'Failed to generate report', duration: 2000 })
  } finally {
    loading.value = false
  }
}

onMounted(fetchReports)
</script>

<style scoped>
</style>
