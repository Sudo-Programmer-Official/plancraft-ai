<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6">
    <div class="max-w-6xl mx-auto space-y-6">
      <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Planner</p>
          <h1 class="text-3xl font-bold mt-1">Your Tasks</h1>
          <p class="text-slate-400 text-sm">Today, this week, and upcoming—stay on top of it all.</p>
        </div>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:border-indigo-500"
            @click="refresh"
          >
            Refresh
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
            @click="openPlanner"
          >
            + New Task
          </button>
        </div>
      </header>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="mode in modes"
          :key="mode.value"
          @click="setMode(mode.value)"
          :class="[
            'px-3 py-1.5 rounded-full text-sm font-semibold transition border',
            viewMode === mode.value
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-indigo-500/60',
          ]"
        >
          {{ mode.label }}
        </button>
      </div>

      <section class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 shadow space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">Tasks</p>
            <p class="text-sm text-slate-300">
              {{ viewSubtitle }}
            </p>
          </div>
          <span class="text-[11px] px-2 py-1 rounded-full bg-slate-800 border border-slate-700">
            {{ totalCount }} total
          </span>
        </div>

        <div v-if="loading" class="space-y-2">
          <div v-for="n in 3" :key="n" class="h-12 bg-slate-800/60 rounded-lg animate-pulse" />
        </div>
        <div v-else-if="groupedDates.length === 0" class="text-sm text-slate-400 space-y-2">
          <p>No tasks yet for this view.</p>
          <button class="text-indigo-300 hover:text-white text-sm underline" @click="openPlanner">
            Add your first task
          </button>
        </div>
        <div v-else class="space-y-4">
          <div v-for="day in groupedDates" :key="day.date" class="space-y-2">
            <div class="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide">
              <span class="h-px flex-1 bg-slate-800" />
              <span class="whitespace-nowrap">{{ day.label }}</span>
              <span class="h-px flex-1 bg-slate-800" />
            </div>
            <div class="space-y-2">
              <article
                v-for="task in day.tasks"
                :key="task.id"
                class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3"
              >
                <div class="space-y-1">
                  <p class="font-semibold" :class="{ 'line-through text-slate-500': task.completed }">
                    {{ task.title || 'Untitled task' }}
                  </p>
                  <p v-if="task.details" class="text-xs text-slate-400 whitespace-pre-line">
                    {{ task.details }}
                  </p>
                  <div class="flex items-center gap-2 text-[11px] text-slate-500">
                    <span class="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                      {{ task.category || 'Uncategorized' }}
                    </span>
                    <span v-if="task.time" class="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                      {{ task.time }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-slate-500 whitespace-nowrap">{{ task.date }}</span>
                  <button class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700" @click="editTask(task)">
                    Edit
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>

    <TaskPlannerDialog
      v-if="plannerOpen"
      :open="plannerOpen"
      :task="selectedTask"
      :date="plannerDate"
      :edit-mode="!!selectedTask"
      @close="closePlanner"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import { useTasks } from '@/composables/useTasks'
import { toLocalDateKey } from '@/utils/dateHelper'

const modes = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'Upcoming', value: 'upcoming' },
]

const viewMode = ref('today')
const loading = ref(false)
const plannerOpen = ref(false)
const selectedTask = ref(null)
const plannerDate = ref(toLocalDateKey(new Date()))

const { tasks, loadTasks, loadTasksForRange } = useTasks()

function startOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() || 7 // make Monday=1...Sunday=7
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (day - 1))
  return d
}

function toYMD(date) {
  return toLocalDateKey(date)
}

async function refresh() {
  loading.value = true
  try {
    const now = new Date()
    if (viewMode.value === 'today') {
      await loadTasks()
    } else if (viewMode.value === 'week') {
      const start = startOfWeek(now)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      await loadTasksForRange(toYMD(start), toYMD(end))
    } else {
      // upcoming: next 30 days
      const start = toYMD(now)
      const endDate = new Date(now)
      endDate.setDate(endDate.getDate() + 30)
      await loadTasksForRange(start, toYMD(endDate))
    }
  } catch (err) {
    console.warn('[Planner] refresh failed', err?.message || err)
  } finally {
    loading.value = false
  }
}

function setMode(mode) {
  viewMode.value = mode
  refresh()
}

const viewSubtitle = computed(() => {
  if (viewMode.value === 'today') return 'Showing tasks for today'
  if (viewMode.value === 'week') return 'Showing tasks for this week'
  return 'Showing tasks for the next 30 days'
})

const groupedDates = computed(() => {
  const groups = {}
  for (const t of tasks.value || []) {
    const key = t?.date || 'unscheduled'
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }
  const sortedDates = Object.keys(groups).sort()
  return sortedDates.map((key) => ({
    date: key,
    label: key === 'unscheduled' ? 'Unscheduled' : key,
    tasks: groups[key],
  }))
})

const totalCount = computed(() => (tasks.value || []).length)

function openPlanner() {
  selectedTask.value = null
  plannerDate.value = toLocalDateKey(new Date())
  plannerOpen.value = true
}
function editTask(task) {
  selectedTask.value = task
  plannerDate.value = task?.date || toLocalDateKey(new Date())
  plannerOpen.value = true
}
function closePlanner() {
  plannerOpen.value = false
  selectedTask.value = null
}

async function handleSaved(payload) {
  // When TaskPlannerDialog emits saved, refresh current view
  await refresh()
  closePlanner()
}

onMounted(refresh)
</script>
