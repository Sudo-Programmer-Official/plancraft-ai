<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-900 via-blue-900 to-blue-800 text-white">
    <header class="px-4 sm:px-8 pt-10 pb-6 space-y-2 text-center sm:text-left">
      <h1 class="text-3xl font-bold">🗓️ Monthly Task Overview</h1>
      <p class="text-gray-300 text-sm sm:text-base">
        {{ headerSubtitle }}
      </p>
    </header>

    <section class="monthly-tasks px-4 sm:px-8 pb-12 space-y-10">
      <div class="calendar-section bg-black/30 rounded-2xl p-6 shadow-lg border border-white/10">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            @click="prevMonth"
            class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            ‹
          </button>
          <h2 class="text-xl font-semibold">{{ currentMonthLabel }} {{ currentYear }}</h2>
          <button
            @click="nextMonth"
            class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            ›
          </button>
        </div>

        <div class="grid grid-cols-7 gap-2 text-center text-sm">
          <div v-for="d in daysOfWeek" :key="d" class="text-gray-400 font-medium uppercase tracking-wide">
            {{ d }}
          </div>
          <div
            v-for="day in calendarDays"
            :key="day.date.toISOString()"
            @click="selectDate(day.date)"
            :class="[
              'cursor-pointer rounded-lg py-2 transition-all duration-200',
              day.isCurrentMonth ? 'text-white' : 'text-gray-500',
              isToday(day.date) ? 'border border-indigo-400' : '',
              isSelected(day.date) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30' : 'hover:bg-indigo-500/40',
            ]"
          >
            {{ day.date.getDate() }}
          </div>
        </div>
      </div>

      <hr class="border-slate-700/40" />

      <div class="tasks-section bg-black/30 rounded-2xl p-6 shadow-lg border border-white/10">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 class="text-lg sm:text-xl font-semibold">Tasks for {{ selectedDateLabel }}</h3>
          <span class="text-sm text-indigo-200">
            {{ tasksForSelectedDay.length }} task{{ tasksForSelectedDay.length === 1 ? '' : 's' }}
          </span>
        </div>

        <div
          v-if="tasksForSelectedDay.length"
          class="flex flex-wrap gap-2 text-xs text-slate-300 mb-4"
        >
          <span
            v-for="entry in categorySummaryEntries"
            :key="entry.name"
            class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/70 border border-slate-700/70 shadow-sm"
          >
            <span>{{ entry.icon }}</span>
            <span class="text-slate-200">{{ entry.name }}</span>
            <span class="text-slate-400 font-semibold">{{ entry.count }}</span>
          </span>
        </div>
        <p
          v-else
          class="text-xs text-slate-400 mb-4"
        >
          Nothing scheduled for this day. Use the planner to add your next move.
        </p>

        <TransitionGroup
          v-if="tasksForSelectedDay.length"
          name="fade-move"
          tag="ul"
          class="space-y-3"
        >
          <li
            v-for="task in tasksForSelectedDay"
            :key="task.id"
            class="flex justify-between items-center bg-black/25 px-4 py-3 rounded-xl border border-slate-800/80 hover:border-indigo-500/40 transition"
          >
            <div class="flex-1 pr-4">
              <div class="flex items-center gap-2 flex-wrap">
                <p
                  :class="[
                    'font-medium',
                    task.completed ? 'line-through text-gray-400' : 'text-white',
                  ]"
                >
                  {{ task.title }}
                </p>
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/70 text-[11px] font-medium shadow-sm"
                  :class="categoryColor(task.category)"
                >
                  <span class="leading-none">{{ categoryIcon(task.category) }}</span>
                  <span>{{ categoryLabel(task.category) }}</span>
                </span>
                <span
                  v-if="hasLate(task)"
                  class="text-[10px] px-2 py-0.5 rounded bg-red-600/30 border border-red-500/40 text-red-200 align-middle"
                >
                  Late<span v-if="lateDelay(task) !== null"> ({{ lateDelay(task) }}d)</span>
                </span>
              </div>
              <p v-if="task.details" class="text-sm text-gray-400 mt-1">
                {{ task.details }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button @click="onView(task)" class="text-gray-400 hover:text-white">🍔</button>
              <input
                type="checkbox"
                :checked="task.completed"
                @change="toggleComplete(task)"
                class="w-5 h-5 accent-indigo-500"
              />
            </div>
          </li>
        </TransitionGroup>
      </div>
    </section>

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
import { buildLocalIso } from '@/utils/timeHelper.js'
import { scheduleReminder } from '@/services/reminderService.js'
import api from '@/services/api'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { getCategoryIcon, getCategoryColor, resolveCategory } from '@/constants/taskCategories'

const { tasks, toggleComplete, loadTasksForRange } = useTasks()

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

    if (payload?.reminderTime) {
      const iso = buildLocalIso(payload.date, payload.reminderTime)
      const prefs = userPrefs.value?.notifications || {}
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

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
    const taskDate = typeof task.date === 'string' ? task.date : toYMD(task.date)
    return taskDate === target
  })
})

const categorySummaryEntries = computed(() => {
  if (!tasksForSelectedDay.value.length) return []
  const counts = tasksForSelectedDay.value.reduce((acc, task) => {
    const key = resolveCategory(task?.category)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      icon: getCategoryIcon(name),
    }))
    .sort((a, b) => {
      if (b.count === a.count) return a.name.localeCompare(b.name)
      return b.count - a.count
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

const headerSubtitle = computed(() => {
  const count = tasksForSelectedDay.value.length
  if (count === 0) {
    return `No tasks scheduled for ${selectedDateLabel.value}.`
  }
  return `${count} task${count === 1 ? '' : 's'} on ${selectedDateLabel.value}`
})
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
