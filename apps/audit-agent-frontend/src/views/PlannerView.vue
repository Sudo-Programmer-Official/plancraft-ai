<template>
  <div class="app-page-shell planner-page">
    <div class="app-page-frame">
      <header class="app-page-hero flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p class="app-page-eyebrow">Planner</p>
          <h1 class="app-page-title">Planner</h1>
          <p class="app-page-description">See what is next and choose one thing to move forward.</p>
        </div>
        <div class="app-page-toolbar">
          <PcButton variant="primary" @click="openPlanner">New task</PcButton>
        </div>
      </header>

      <div class="app-page-section app-page-section--compact flex flex-wrap gap-2">
        <button
          v-for="mode in modes"
          :key="mode.value"
          @click="setMode(mode.value)"
          :class="[
            'px-3 py-1.5 rounded-full text-sm font-semibold transition border',
            viewMode === mode.value
              ? 'bg-indigo-500/90 text-white border-indigo-300/70 shadow-lg shadow-indigo-950/30'
              : 'bg-slate-950/25 text-slate-200 border-white/10 hover:border-indigo-300/50',
          ]"
        >
          {{ mode.label }}
        </button>
      </div>

      <section class="app-page-section space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="app-page-eyebrow !tracking-[0.24em]">Tasks</p>
            <p class="text-sm text-slate-200/80">
              {{ viewSubtitle }}
            </p>
          </div>
          <span class="text-[11px] px-2 py-1 rounded-full bg-slate-950/35 border border-white/10 text-indigo-100/85">
            {{ totalCount }} total
          </span>
        </div>

        <div v-if="loading" class="space-y-2">
          <div v-for="n in 3" :key="n" class="app-page-skeleton h-12" />
        </div>
        <div v-else-if="groupedDates.length === 0" class="app-page-empty text-sm space-y-2">
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
                class="p-3 rounded-2xl bg-slate-950/30 border border-white/10 flex items-start justify-between gap-3 shadow-lg shadow-slate-950/10"
              >
                <div class="space-y-1">
                  <p class="font-semibold" :class="{ 'line-through text-slate-500': task.completed }">
                    {{ task.title || 'Untitled task' }}
                  </p>
                  <p v-if="task.details" class="text-xs text-slate-400 whitespace-pre-line">
                    {{ task.details }}
                  </p>
                  <div class="flex items-center gap-2 text-[11px] text-slate-500">
                    <span class="px-2 py-0.5 rounded-full bg-slate-950/35 border border-white/10 text-indigo-100/85">
                      {{ task.category || 'Uncategorized' }}
                    </span>
                    <span v-if="task.time" class="px-2 py-0.5 rounded-full bg-slate-950/35 border border-white/10 text-indigo-100/85">
                      {{ task.time }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-slate-500 whitespace-nowrap">{{ task.date }}</span>
                  <button class="text-xs px-2 py-1 rounded-xl bg-slate-950/35 border border-white/10 text-slate-100 hover:border-indigo-300/50 transition" @click="editTask(task)">
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
import { PcButton } from '@/design'
import { useTasks } from '@/composables/useTasks'
import { toLocalDateKey } from '@/utils/dateHelper'
import { updateTaskInFirebase } from '@/services/firebaseService'

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

const { tasks, loadTasks, loadTasksForRange, addTask } = useTasks()

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

function modeForTaskDate(dateKey) {
  if (!dateKey) return viewMode.value

  const todayKey = toLocalDateKey(new Date())
  if (dateKey === todayKey) return 'today'

  const weekStart = startOfWeek(new Date())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartKey = toLocalDateKey(weekStart)
  const weekEndKey = toLocalDateKey(weekEnd)

  return dateKey >= weekStartKey && dateKey <= weekEndKey ? 'week' : 'upcoming'
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

async function handleSaved(savedTask = null) {
  try {
    // Generated tasks are persisted by TaskPlannerDialog as a batch. Manual
    // creates and edits are emitted here so every Planner entry point writes
    // to the same task store.
    const savedItems = Array.isArray(savedTask)
      ? savedTask.filter(Boolean)
      : savedTask
        ? [savedTask]
        : []

    if (Array.isArray(savedTask)) {
      // Already persisted by TaskPlannerDialog.persistPreparedTasks().
    } else if (savedTask?.id) {
      await updateTaskInFirebase(savedTask)
    } else if (savedTask?.title) {
      await addTask(savedTask)
    }

    // A task created for tomorrow should not appear to disappear just because
    // the Planner opened on Today. Move to the smallest useful date view after
    // saving, then load that view from Firebase.
    const savedDate = savedItems.find((task) => task?.date)?.date
    if (savedDate) viewMode.value = modeForTaskDate(savedDate)

    await refresh()
    closePlanner()
  } catch (err) {
    console.warn('[Planner] save failed', err?.message || err)
  }
}

onMounted(refresh)
</script>

<style scoped>
.planner-page {
  min-height: 100%;
  min-width: 0;
  overflow-x: hidden;
}

@media (max-width: 639px) {
  .planner-page {
    padding-bottom: calc(6.5rem + var(--safe-area-bottom));
  }
}
</style>
