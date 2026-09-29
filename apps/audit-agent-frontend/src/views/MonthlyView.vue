<template>
  <div
    class="min-h-screen bg-gradient-to-br from-indigo-950 via-blue-900 to-blue-800 text-white overflow-y-auto scrollbar-plan"
  >
    <div class="monthly-tasks max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-16 space-y-8">
      <header class="space-y-3">
        <h1 class="flex items-center gap-2 text-3xl font-semibold text-slate-50">
          <span>📆</span>
          <span>Monthly Task Overview</span>
        </h1>
        <p class="text-sm sm:text-base text-slate-300">
          {{ tasksForSelectedDay.length }} {{ tasksForSelectedDay.length === 1 ? 'task' : 'tasks' }}
          planned for {{ formattedDate }}
        </p>
      </header>

      <section
        class="calendar-section bg-slate-950/40 rounded-3xl border border-slate-800/60 shadow-xl shadow-indigo-900/30 p-6 sm:p-8 space-y-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-4">
          <button
            @click="prevMonth"
            class="rounded-full bg-indigo-600/80 hover:bg-indigo-500 transition px-4 py-2 text-lg"
            aria-label="Previous month"
          >
            ‹
          </button>
          <div class="text-center">
            <h2 class="text-xl font-semibold text-slate-100">
              {{ currentMonthLabel }} {{ currentYear }}
            </h2>
            <p class="text-xs text-slate-400 tracking-wide uppercase">Tap a date to focus</p>
          </div>
          <button
            @click="nextMonth"
            class="rounded-full bg-indigo-600/80 hover:bg-indigo-500 transition px-4 py-2 text-lg"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div class="grid grid-cols-7 gap-2 text-center text-sm sm:text-base">
          <div v-for="d in daysOfWeek" :key="d" class="text-slate-400 font-semibold uppercase">
            {{ d }}
          </div>
          <div
            v-for="day in calendarDays"
            :key="day.date.toISOString()"
            @click="selectDate(day.date)"
            :class="[
              'cursor-pointer rounded-xl py-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
              day.isCurrentMonth ? 'text-white' : 'text-slate-500',
              isToday(day.date) ? 'border border-indigo-400/80 shadow-inner shadow-indigo-500/30' : '',
              isSelected(day.date)
                ? 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-400 text-white shadow-lg shadow-indigo-900/40'
                : 'hover:bg-indigo-500/30 hover:text-white',
            ]"
          >
            {{ day.date.getDate() }}
          </div>
        </div>
      </section>

      <hr class="border-slate-700/40 my-6" />

      <section
        class="tasks-section bg-slate-950/40 rounded-3xl border border-slate-800/60 shadow-xl shadow-indigo-900/30 p-6 sm:p-8 space-y-5"
      >
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 class="text-lg sm:text-xl font-semibold text-slate-100">
            Tasks for {{ formattedDate }}
          </h3>
          <button
            v-if="tasksForSelectedDay.length"
            @click="loadMonth"
            class="self-start sm:self-auto inline-flex items-center gap-2 text-xs font-medium text-indigo-200/80 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 px-3 py-1.5 rounded-lg transition-colors"
          >
            🔄 Refresh day snapshot
          </button>
        </div>

        <div
          v-if="categorySummaryText"
          class="flex flex-wrap items-center gap-2 sm:gap-3 rounded-2xl bg-gradient-to-r from-indigo-700/30 via-indigo-600/20 to-emerald-600/30 border border-indigo-500/30 px-4 py-3 text-xs sm:text-sm text-indigo-100 shadow-inner shadow-indigo-900/40"
        >
          <span class="font-medium text-indigo-200/90">Highlights:</span>
          <span class="text-slate-100/80">{{ categorySummaryText }}</span>
        </div>

        <TransitionGroup
          v-if="tasksForSelectedDay.length"
          name="fade-move"
          tag="ul"
          class="space-y-4 max-h-[430px] overflow-y-auto pr-1 scrollbar-plan"
        >
          <li
            v-for="task in tasksForSelectedDay"
            :key="task.id"
            class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-slate-900/50 border border-slate-800/70 px-4 py-4 shadow-lg shadow-indigo-950/20 transition hover:border-indigo-500/50 hover:shadow-indigo-900/40"
          >
            <div class="flex-1 space-y-2">
              <div
                class="flex items-center gap-3 text-xs font-medium text-slate-400 uppercase tracking-wide"
              >
                <div class="flex items-center gap-2 text-sm normal-case">
                  <span class="text-base">{{ categoryIcon(task.category) }}</span>
                  <span :class="categoryColor(task.category)">{{ categoryLabel(task.category) }}</span>
                </div>
                <span
                  v-if="hasLate(task)"
                  class="text-[11px] px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-200 shadow-sm"
                >
                  Late<span v-if="lateDelay(task) !== null"> ({{ lateDelay(task) }}d)</span>
                </span>
              </div>

              <p
                :class="[
                  'text-base sm:text-lg font-semibold leading-tight',
                  task.completed ? 'line-through text-slate-500' : 'text-slate-100',
                ]"
              >
                {{ task.title }}
              </p>

              <p
                v-if="formattedDetails(task)"
                class="text-sm text-slate-400 max-w-2xl whitespace-pre-line"
              >
                {{ formattedDetails(task) }}
              </p>
            </div>

            <div class="flex items-center gap-3 self-end sm:self-auto">
              <button
                @click="onView(task)"
                class="text-slate-400 hover:text-white transition-colors text-xl leading-none"
                aria-label="View task details"
              >
                🍔
              </button>
              <input
                type="checkbox"
                :checked="task.completed"
                @change="toggleComplete(task)"
                class="w-5 h-5 accent-indigo-500 rounded"
                :aria-label="`Mark ${task.title} as ${task.completed ? 'incomplete' : 'complete'}`"
              />
            </div>
          </li>
        </TransitionGroup>

        <p v-else class="text-sm text-indigo-100/70">
          No tasks scheduled yet for this date. Use the planner to add something meaningful.
        </p>
      </section>
    </div>

    <!-- <TaskPlannerDialog
      v-if="showPlanner"
      :open="showPlanner"
      :date="plannerDate"
      :edit-mode="true"
      :task="viewingTask"
      :lockDate="true"
      :disableReminder="true"
      @saved="onSaved"
      @close="showPlanner = false"
    /> -->
    <TaskPlannerDialog
      v-if="showPlanner"
      :open="showPlanner"
      :date="plannerDate"
      :readonly="true"
      :edit-mode="true"
      :task="viewingTask"
      @close="showPlanner = false"
      @saved="handleSaveAndSchedule"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useTasks } from '@/composables/useTasks'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import { updateTaskInFirebase, addTaskToFirebase } from '@/services/firebaseService'
// import { authStore, userPrefs } from '@/stores/authStore.js'
import { resolveReminderIso } from '@/utils/timeHelper.js'
import { scheduleReminder } from '@/services/reminderService.js'
import api from '@/services/api'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { getCategoryIcon, getCategoryColor, resolveCategory } from '@/constants/taskCategories'
import { describeTaskDetails } from '@/utils/taskDisplay'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'

const { tasks, toggleComplete, loadTasksForRange, getTaskPlannedDate } = useTasks()
const formattedDetails = (task) => describeTaskDetails(task)

const { authStore, userPrefs } = useAuthStore()

const showPlanner = ref(false)
const viewingTask = ref(null)
const plannerDate = ref(new Date())

function categoryIcon(value) {
  return getCategoryIcon(value)
}

function categoryColor(value) {
  return getCategoryColor(value)
}

function categoryLabel(value) {
  return resolveCategory(value)
}

const selectedDate = ref(new Date())
const currentMonth = ref(selectedDate.value.getMonth())
const currentYear = ref(selectedDate.value.getFullYear())

function onView(task) {
  viewingTask.value = task
  showPlanner.value = true
  plannerDate.value = task.date
}

async function onSaved(updatedTask) {
  const idx = tasks.value.findIndex((t) => t.id === updatedTask.id)
  if (idx !== -1) {
    tasks.value[idx] = { ...updatedTask }
  }
  showPlanner.value = false
  await loadMonth()
}

async function handleSave(payload) {
  if (payload.id) {
    await updateTaskInFirebase(payload)
  } else {
    const saved = await addTaskToFirebase(payload)
    payload.id = saved.id
    if (saved?.__notifyMeta) payload.__notifyMeta = saved.__notifyMeta
  }
  await loadMonth()
  showPlanner.value = false
}


async function fetchUsage() {
  try {
    // const uid = auth?.currentUser?.uid || localStorage.getItem('uid')
    const uid = authStore?.user?.uid || localStorage.getItem('uid')
    if (!uid) return
    const { data } = await api.get('/reminders/usage', { params: { userId: uid } })
    if (data?.success) authStore.usage = { used: data.used || 0, limit: data.limit || 0, plan: data.plan || '' }
  } catch {
    authStore.usage = { used: 0, limit: 0, plan: '' }
  }
}

async function handleSaveAndSchedule(payload) {
  await handleSave(payload)
  try {
    const uid = authStore?.user?.uid
    const taskId = payload?.id
    if (!uid || !taskId) return
    const notifyMeta = payload.__notifyMeta || null
    if (payload.__notifyMeta) delete payload.__notifyMeta
    const scheduledByBackend = !!notifyMeta?.scheduled

    if (payload?.reminderTime) {
      if (scheduledByBackend) {
        try {
          await fetchUsage()
        } catch {}
        return
      }
      const iso = resolveReminderIso(payload)
      if (!iso) return
      const prefs = userPrefs.value?.notifications || {}
      const tz = getEffectiveUserTimezone()

      try {
        const resp = await api.post('/reminders/text', {
          userId: uid,
          text: payload.title,
          scheduledTime: iso,
          taskId,
          channels: Array.isArray(prefs?.channels) ? prefs.channels : undefined,
          timezone: tz,
        })
        const warn = resp?.headers?.['x-plan-warning'] || resp?.headers?.['X-Plan-Warning']
        if (warn) ElMessage({ message: warn, type: 'warning', duration: 5000 })
        // try {
        //   await fetchUsage()
        // } catch {}
      } catch (err) {
        await scheduleReminder(uid, taskId, payload.title, iso, prefs)
        if (err?.response?.status === 403) {
          const msg =
            err?.response?.data?.error ||
            'Daily reminder limit reached. Upgrade to Pro for unlimited reminders.'
          ElMessage({ message: msg, type: 'warning', duration: 6000 })
        }
      }
    } else {
      await api.post('/reminders/cancel', { userId: uid, taskId })
    }
  } catch (e) {
    console.warn('Reminder sync (weekly) failed:', e?.response?.data || e?.message)
  }
}

function ymd(d) {
  return new Date(d).toISOString().split('T')[0]
}
function toYMD(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toLocaleDateString('en-CA')
}

const tasksForSelectedDay = computed(() => {
  const target = toYMD(selectedDate.value)
  return tasks.value.filter((task) => {
    const taskDate = getTaskPlannedDate(task) || (typeof task.date === 'string' ? task.date : toYMD(task.date))
    return taskDate === target
  })
})

const calendarDays = computed(() => getCalendarDays(currentMonth.value, currentYear.value))

function getCalendarDays(month, year) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days = []

  const startDayOfWeek = firstDay.getDay()
  const totalDays = lastDay.getDate()

  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ date: new Date(year, month, i - startDayOfWeek + 1), isCurrentMonth: false })
  }

  for (let i = 1; i <= totalDays; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
  }

  return days
}

const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const categoryBreakdown = computed(() => {
  if (!tasksForSelectedDay.value.length) return []
  const tally = tasksForSelectedDay.value.reduce((acc, task) => {
    const label = categoryLabel(task.category)
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})
  return Object.entries(tally)
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
})

const categorySummaryText = computed(() => {
  if (!categoryBreakdown.value.length) return ''
  return categoryBreakdown.value
    .map(({ label, count }) => {
      const unit = count === 1 ? 'task' : 'tasks'
      return `${count} ${label} ${unit}`
    })
    .join(', ')
})

function isToday(date) {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function isSelected(date) {
  return (
    date.getDate() === selectedDate.value.getDate() &&
    date.getMonth() === selectedDate.value.getMonth() &&
    date.getFullYear() === selectedDate.value.getFullYear()
  )
}

function selectDate(date) {
  selectedDate.value = date
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

async function loadMonth() {
  const start = new Date(currentYear.value, currentMonth.value, 1)
  const end = new Date(currentYear.value, currentMonth.value + 1, 0)
  await loadTasksForRange(ymd(start), ymd(end))
}

watch([currentMonth, currentYear], loadMonth)
watch(selectedDate, loadMonth)

onMounted(() => {
  const now = new Date()
  selectedDate.value = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  loadMonth()
})

function hasLate(t) {
  try {
    return (
      Array.isArray(t?.logs) &&
      t.logs.some((l) => l && (l.late === true || (l.type === 'completed' && l.late)))
    )
  } catch {
    return false
  }
}
function lateDelay(t) {
  try {
    if (!Array.isArray(t?.logs)) return null
    const late = t.logs.filter((l) => l && (l.late === true || (l.type === 'completed' && l.late)))
    if (!late.length) return null
    const last = late[late.length - 1]
    return typeof last.delayDays === 'number' ? last.delayDays : null
  } catch {
    return null
  }
}

const currentMonthLabel = computed(() =>
  new Date(currentYear.value, currentMonth.value).toLocaleString('default', { month: 'long' }),
)

const selectedDateLabel = computed(() =>
  selectedDate.value.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }),
)

const formattedDate = computed(() => selectedDateLabel.value)
</script>

<style scoped>
.fade-move-enter-active,
.fade-move-leave-active {
  transition: all 200ms ease;
}
.fade-move-enter-from,
.fade-move-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
