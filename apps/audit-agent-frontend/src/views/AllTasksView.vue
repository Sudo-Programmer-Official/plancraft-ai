<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 px-4 sm:px-6 py-8">
    <div class="max-w-6xl mx-auto space-y-6">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/80">Task HQ</p>
          <h1 class="text-3xl font-bold mt-1">🗂 All Tasks</h1>
          <p class="text-slate-400 text-sm">One list for everything — filter, search, and never lose a task.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            class="px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800 text-sm hover:border-indigo-400/60 transition"
            @click="resetFilters"
          >
            Reset
          </button>
          <button
            class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
            :disabled="loading"
            @click="reload"
          >
            {{ loading ? 'Refreshing…' : 'Refresh' }}
          </button>
        </div>
      </header>

      <section class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-[0.2em] text-slate-500">Search</label>
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Title or details"
              class="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-[0.2em] text-slate-500">Status</label>
            <select
              v-model="statusFilter"
              class="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-[0.2em] text-slate-500">Date</label>
            <select
              v-model="dateFilter"
              class="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="overdue">Overdue</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-[0.2em] text-slate-500">Category</label>
            <select
              v-model="categoryFilter"
              class="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              <option value="All">All</option>
              <option v-for="cat in TASK_CATEGORY_FILTERS" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-[0.2em] text-slate-500">Workspace</label>
            <select
              v-model="selectedWorkspace"
              class="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              @change="onWorkspaceChange"
            >
              <option v-for="ws in workspaceStore.workspaces" :key="ws.id" :value="ws.id">
                {{ ws.icon || '📦' }} {{ ws.name }}
              </option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-[0.2em] text-slate-500">Sort by</label>
            <select
              v-model="sortField"
              class="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            >
              <option value="dueDate">Due date</option>
              <option value="createdAt">Created</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        <div v-if="dateFilter === 'custom'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-[0.2em] text-slate-500">Start</label>
            <input
              v-model="customStart"
              type="date"
              class="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-[0.2em] text-slate-500">End</label>
            <input
              v-model="customEnd"
              type="date"
              class="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
        </div>
      </section>

      <section class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-sm text-slate-300">
            <span class="px-2 py-1 rounded-full bg-slate-800 border border-slate-700">Total {{ filteredTasks.length }}</span>
            <span class="px-2 py-1 rounded-full bg-slate-800 border border-slate-700">Pending {{ pendingCount }}</span>
            <span class="px-2 py-1 rounded-full bg-slate-800 border border-slate-700">Completed {{ completedCount }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="hidden sm:inline">Sort</span>
            <button
              class="px-2 py-1 rounded-lg border border-slate-700 hover:border-indigo-400 transition"
              @click="toggleSortDir"
            >
              {{ sortDir === 'asc' ? '↑ Asc' : '↓ Desc' }}
            </button>
          </div>
        </div>

        <div v-if="loading" class="space-y-2">
          <div v-for="n in 4" :key="n" class="h-14 rounded-xl bg-slate-800/60 animate-pulse" />
        </div>
        <div v-else-if="!filteredTasks.length" class="text-sm text-slate-400 space-y-2">
          <p>No tasks match these filters.</p>
          <p class="text-slate-500">Tip: clear the date filter to see everything.</p>
        </div>
        <div v-else class="grid grid-cols-1 gap-2">
          <article
            v-for="task in filteredTasks"
            :key="task.id"
            class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-400/60 transition"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold" :class="{ 'line-through text-slate-500': task.completed }">
                    {{ task.title || 'Untitled task' }}
                  </span>
                  <span
                    class="text-[11px] px-2 py-0.5 rounded-full border"
                    :class="task.completed ? 'border-emerald-400/60 text-emerald-200' : 'border-amber-300/60 text-amber-200'"
                  >
                    {{ task.completed ? 'Completed' : 'Pending' }}
                  </span>
                  <span
                    v-if="task.rolledOver || plannedDate(task) < todayKey"
                    class="text-[11px] px-2 py-0.5 rounded-full bg-indigo-900/60 border border-indigo-500/60 text-indigo-200"
                  >
                    Rolled over
                  </span>
                </div>
                <p v-if="task.details" class="text-xs text-slate-400 whitespace-pre-line">
                  {{ task.details }}
                </p>
                <div class="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span class="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                    {{ plannedDate(task) || 'Unscheduled' }}
                  </span>
                  <span class="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                    {{ task.category || 'Uncategorized' }}
                  </span>
                  <span v-if="task.priority != null" class="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                    Priority {{ task.priority }}
                  </span>
                  <span
                    v-if="task.orphanedWorkspace"
                    class="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-100"
                  >
                    Not assigned to workspace
                  </span>
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 text-right text-xs text-slate-400">
                <span>Created {{ createdLabel(task) }}</span>
                <span class="font-medium text-indigo-200" v-if="task.previousDate">
                  From {{ task.previousDate }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { TASK_CATEGORY_FILTERS, resolveCategory } from '@/constants/taskCategories'
import { toLocalDateKey } from '@/utils/dateHelper'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useTasks } from '@/composables/useTasks'

const workspaceStore = useWorkspaceStore()
const { allTasks, refreshAllTasks, getTaskPlannedDate } = useTasks()

const loading = ref(true)
const searchTerm = ref('')
const statusFilter = ref('all')
const dateFilter = ref('all')
const customStart = ref('')
const customEnd = ref('')
const categoryFilter = ref('All')
const sortField = ref('dueDate')
const sortDir = ref('asc')
const selectedWorkspace = ref(workspaceStore.activeWorkspaceId)

const todayKey = computed(() => toLocalDateKey(new Date()))

function normalizeRange() {
  if (!customStart.value && customEnd.value) customStart.value = customEnd.value
  if (!customEnd.value && customStart.value) customEnd.value = customStart.value
}

function coerceTs(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (value?.seconds) return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6)
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function plannedDate(task) {
  return getTaskPlannedDate(task) || task.date || ''
}

function sortTasks(list) {
  const dir = sortDir.value === 'asc' ? 1 : -1
  const toTs = (ymd) => {
    if (!ymd) return 0
    const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10))
    return new Date(y, m - 1, d).getTime()
  }
  return [...list].sort((a, b) => {
    if (sortField.value === 'dueDate') {
      const diff = (toTs(plannedDate(a)) - toTs(plannedDate(b))) * dir
      if (diff !== 0) return diff
    } else if (sortField.value === 'createdAt') {
      const diff = (coerceTs(a.createdAt) - coerceTs(b.createdAt)) * dir
      if (diff !== 0) return diff
    } else if (sortField.value === 'priority') {
      const pa = Number.isFinite(a.priority) ? a.priority : -Infinity
      const pb = Number.isFinite(b.priority) ? b.priority : -Infinity
      if (pa !== pb) return (pa - pb) * dir
    }
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return coerceTs(b.createdAt) - coerceTs(a.createdAt)
  })
}

const filteredTasks = computed(() => {
  normalizeRange()
  let list = Array.isArray(allTasks.value) ? [...allTasks.value] : []

  if (statusFilter.value === 'pending') list = list.filter((t) => !t.completed)
  else if (statusFilter.value === 'completed') list = list.filter((t) => t.completed)

  if (categoryFilter.value && categoryFilter.value !== 'All') {
    const target = resolveCategory(categoryFilter.value)
    list = list.filter((t) => resolveCategory(t.category) === target)
  }

  if (dateFilter.value === 'today') {
    list = list.filter((t) => plannedDate(t) === todayKey.value)
  } else if (dateFilter.value === 'tomorrow') {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    const target = toLocalDateKey(d)
    list = list.filter((t) => plannedDate(t) === target)
  } else if (dateFilter.value === 'overdue') {
    list = list.filter((t) => {
      const planned = plannedDate(t) || todayKey.value
      return planned < todayKey.value && !t.completed
    })
  } else if (dateFilter.value === 'custom' && customStart.value && customEnd.value) {
    list = list.filter((t) => {
      const planned = plannedDate(t)
      return planned && planned >= customStart.value && planned <= customEnd.value
    })
  }

  if (searchTerm.value) {
    const needle = searchTerm.value.toLowerCase()
    list = list.filter((t) => {
      const title = String(t.title || '').toLowerCase()
      const details = String(t.details || '').toLowerCase()
      return title.includes(needle) || details.includes(needle)
    })
  }

  return sortTasks(list)
})

const pendingCount = computed(() => filteredTasks.value.filter((t) => !t.completed).length)
const completedCount = computed(() => filteredTasks.value.filter((t) => t.completed).length)

function resetFilters() {
  searchTerm.value = ''
  statusFilter.value = 'all'
  dateFilter.value = 'all'
  customStart.value = ''
  customEnd.value = ''
  categoryFilter.value = 'All'
  sortField.value = 'dueDate'
  sortDir.value = 'asc'
}

async function reload() {
  loading.value = true
  try {
    await refreshAllTasks(true)
  } finally {
    loading.value = false
  }
}

function toggleSortDir() {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
}

function createdLabel(task) {
  if (!task?.createdAt) return '—'
  const d = new Date(coerceTs(task.createdAt))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

async function onWorkspaceChange() {
  try {
    if (selectedWorkspace.value) {
      await workspaceStore.setActive(selectedWorkspace.value)
      await reload()
    }
  } catch (err) {
    console.warn('Workspace switch failed', err?.message || err)
  }
}

watch(
  () => workspaceStore.activeWorkspaceId,
  (next) => {
    selectedWorkspace.value = next
  },
  { immediate: true },
)

onMounted(async () => {
  try {
    await refreshAllTasks(true)
  } finally {
    loading.value = false
  }
})
</script>
