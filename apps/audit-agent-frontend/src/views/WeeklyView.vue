<template>
  <div
    class="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white overflow-x-hidden overflow-y-auto scrollbar-plan"
  >
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
      <header class="text-center mb-8 space-y-2">
        <h1 class="text-3xl font-bold">Weekly Tasks</h1>
        <div class="flex items-center justify-center gap-2 text-sm text-gray-200">
          <div class="h-2.5 w-32 bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-fuchsia-500 transition-all duration-300"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
          <span class="font-semibold">{{ completedCount }}/{{ totalCount }} done</span>
        </div>
        <p class="text-gray-300 text-sm">{{ remainingCount }} remaining this week</p>
      </header>

      <nav class="flex justify-between mb-6">
        <button
          v-for="day in days"
          :key="day.label"
          @click="
            selectedDate = new Date(
              currentWeekStart.getFullYear(),
              currentWeekStart.getMonth(),
              currentWeekStart.getDate() + day.value,
            )
          "
          :class="[
            'px-3 py-1 rounded-lg font-medium transition',
            selectedDay === day.value
              ? 'bg-indigo-500 text-white'
              : todayIndex !== null && todayIndex === day.value
                ? 'bg-indigo-700/50 text-white border border-indigo-400'
                : 'text-gray-400 hover:text-white',
          ]"
        >
          {{ day.label }}
        </button>
      </nav>

      <section class="bg-black/30 rounded-2xl p-6 shadow-lg">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Tasks for {{ dayLabel }}</h2>
        </div>

        <div class="category-filter-strip flex gap-3 overflow-x-auto pb-2 mb-4">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            @click="activeCategory = category"
            :class="[
              'category-filter-chip flex-shrink-0 px-3 py-1 rounded-lg font-medium text-sm transition-all duration-300 ease-in-out',
              activeCategory === category
                ? 'bg-indigo-700 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
            ]"
          >
            <span class="mr-1 text-base leading-none">{{ categoryIcon(category) }}</span>
            {{ category }}
          </button>
        </div>

        <div class="space-y-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-plan">
          <TransitionGroup
            v-if="activeFiltered.length"
            name="fade-move"
            tag="ul"
            class="space-y-3"
          >
            <li
              v-for="task in activeFiltered"
              :key="task.id"
              class="flex justify-between items-center bg-black/20 px-4 py-3 rounded-xl border border-slate-700/60"
            >
              <div class="flex-1">
                <p class="font-medium text-white">
                  {{ task.title }}
                  <span
                    class="task-category-pill inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/70 text-[11px] font-medium shadow-sm ml-2"
                    :class="categoryColor(task.category)"
                  >
                    <span class="leading-none">{{ categoryIcon(task.category) }}</span>
                    <span>{{ categoryLabel(task.category) }}</span>
                  </span>
                  <span
                    v-if="hasLate(task)"
                    class="ml-2 text-[10px] px-2 py-0.5 rounded bg-red-600/30 border border-red-500/40 text-red-200 align-middle"
                  >
                    Late<span v-if="lateDelay(task) !== null"> ({{ lateDelay(task) }}d)</span>
                  </span>
                </p>
                <p
                  v-if="formattedDetails(task)"
                  class="text-sm text-gray-400 whitespace-pre-line"
                >
                  {{ formattedDetails(task) }}
                </p>
              </div>

              <div class="flex items-center gap-3">
                <button @click="onView(task)" class="text-gray-400 hover:text-white">🍔</button>
                <span class="text-sm text-gray-400">
                  {{ formatDate(task.date) }}
                </span>
                <input
                  type="checkbox"
                  :checked="task.completed"
                  @change="toggleComplete(task)"
                  class="w-5 h-5 accent-indigo-500"
                />
              </div>
            </li>
          </TransitionGroup>
          <p v-else class="text-sm text-slate-300">
            {{ activeCategory === 'All' ? 'No tasks for this day yet.' : 'No tasks for this category on this day.' }}
          </p>

          <div class="pt-2">
            <button
              class="flex items-center gap-2 text-xs text-slate-300 hover:text-indigo-200"
              @click="showCompleted = !showCompleted"
            >
              <span>{{ showCompleted ? '▾' : '▸' }}</span>
              <span>Completed ({{ completedFiltered.length }})</span>
            </button>
            <transition name="fade">
              <div v-if="showCompleted && completedFiltered.length" class="mt-2 space-y-2">
                <div
                  v-for="task in completedFiltered"
                  :key="task.id"
                  class="bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 flex items-start gap-2 text-slate-300"
                >
                  <span class="text-emerald-300">✅</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-100">{{ task.title }}</p>
                    <p class="text-[11px] text-slate-400">
                      Completed • {{ completionLabel(task) }}
                    </p>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </section>
    </div>
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
  <NotificationPrompt v-model="notifPromptOpen" />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useTasks } from '@/composables/useTasks'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import { toLocalDateKey as _toLocalDateKey } from '@/utils/dateHelper.js'
import { updateTaskInFirebase, addTaskToFirebase } from '@/services/firebaseService.js'
// import { authStore, userPrefs } from '@/stores/authStore.js'
import { resolveReminderIso } from '@/utils/timeHelper.js'
import { scheduleReminder } from '@/services/reminderService.js'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage } from 'element-plus'
import { hasNotificationSetup } from '@/utils/notificationCheck'
import NotificationPrompt from '@/components/NotificationPrompt.vue'
import { TASK_CATEGORY_FILTERS, getCategoryIcon, getCategoryColor, resolveCategory } from '@/constants/taskCategories'
import { describeTaskDetails } from '@/utils/taskDisplay'
import { getEffectiveUserTimezone } from '@/utils/userTimezone'
const { tasks, toggleComplete, loadTasksForRange, getTaskPlannedDate } = useTasks()
const formattedDetails = (task) => describeTaskDetails(task)
const completionLabel = (task) =>
  task?.completedAt
    ? new Date(task.completedAt?.toDate?.() || task.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'Just now'
const days = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 6 },
]
const categories = TASK_CATEGORY_FILTERS
const activeCategory = ref('All')
const { authStore, userPrefs } = useAuthStore()
const selectedDate = ref(new Date())
const currentWeekStart = computed(() => startOfWeek(selectedDate.value))

const selectedDay = computed(() => {
  const s = currentWeekStart.value
  const start = new Date(s.getFullYear(), s.getMonth(), s.getDate())
  const sel = new Date(
    selectedDate.value.getFullYear(),
    selectedDate.value.getMonth(),
    selectedDate.value.getDate(),
  )
  return Math.round((sel - start) / (1000 * 60 * 60 * 24))
})

const todayIndex = computed(() => {
  const now = new Date()
  const sameWeek = toYMD(startOfWeek(now)) === toYMD(currentWeekStart.value)
  if (!sameWeek) return null
  return Math.round((now - currentWeekStart.value) / (1000 * 60 * 60 * 24))
})
async function handleSave(payload) {
  if (payload.id) {
    await updateTaskInFirebase(payload)
  } else {
    const saved = await addTaskToFirebase(payload)
    payload.id = saved.id
    if (saved?.__notifyMeta) payload.__notifyMeta = saved.__notifyMeta
  }
  await loadWeek()
  showPlanner.value = false
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
        try { await authStore.fetchUsage() } catch {}
        return
      }
      const iso = resolveReminderIso(payload)
      if (!iso) return
      const prefs = userPrefs.value?.notifications || {}
      try { if (!hasNotificationSetup(prefs)) notifPromptOpen.value = true } catch {}
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
        try {
          await authStore.fetchUsage()
        } catch {}
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
const filteredTasks = computed(() => {
  const target = toYMD(selectedDate.value)
  const byDate = tasks.value.filter((task) => {
    const taskDate = getTaskPlannedDate(task) || (typeof task.date === 'string' ? task.date : toYMD(task.date))
    return taskDate === target
  })
  if (activeCategory.value === 'All') return byDate
  return byDate.filter((task) => resolveCategory(task?.category) === activeCategory.value)
})

function categoryIcon(value) {
  return getCategoryIcon(value)
}

function categoryColor(value) {
  return getCategoryColor(value)
}

function categoryLabel(value) {
  return resolveCategory(value)
}

const dayLabel = computed(() =>
  selectedDate.value.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }),
)

const totalCount = computed(() => filteredTasks.value.length)
const completedCount = computed(() => filteredTasks.value.filter((t) => t.completed).length)
const remainingCount = computed(() => filteredTasks.value.filter((t) => !t.completed).length)
const activeFiltered = computed(() => filteredTasks.value.filter((t) => !t.completed))
const completedFiltered = computed(() => filteredTasks.value.filter((t) => t.completed))
const progressPercent = computed(() =>
  totalCount.value ? Math.round((completedFiltered.value.length / totalCount.value) * 100) : 0,
)
const showCompleted = ref(true)

function startOfWeek(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}
function endOfWeek(d) {
  const s = startOfWeek(d)
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  e.setHours(23, 59, 59, 999)
  return e
}
function toYMD(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toLocaleDateString('en-CA')
}
function formatDate(dateStr) {
  return dateStr
}
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

watch(selectedDate, loadWeek)
onMounted(() => {
  const now = new Date()
  selectedDate.value = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  loadWeek()
})
async function loadWeek() {
  const s = startOfWeek(selectedDate.value)
  const e = endOfWeek(selectedDate.value)
  await loadTasksForRange(toYMD(s), toYMD(e))
}

const showPlanner = ref(false)
const plannerDate = _toLocalDateKey(new Date())
const viewingTask = ref(null)
const notifPromptOpen = ref(false)

function onView(task) {
  viewingTask.value = task
  showPlanner.value = true
}

async function onSaved(updatedTask) {
  const idx = tasks.value.findIndex((t) => t.id === updatedTask.id)
  if (idx !== -1) {
    tasks.value[idx] = { ...updatedTask }
  }
  showPlanner.value = false
  await loadWeek()
}
</script>

<style scoped>
.category-filter-strip {
  align-items: stretch;
  min-height: 3rem;
  overflow-y: visible;
  padding-top: 0.35rem;
  padding-bottom: 0.6rem;
  -webkit-overflow-scrolling: touch;
}

.category-filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.5rem;
  line-height: 1.1;
  white-space: nowrap;
}

.task-category-pill {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
}

.fade-move-enter-active,
.fade-move-leave-active {
  transition: all 200ms ease;
}
.fade-move-enter-from,
.fade-move-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 640px) {
  .category-filter-strip {
    min-height: 2.85rem;
    padding-top: 0.25rem;
    padding-bottom: 0.5rem;
  }

  .category-filter-chip {
    min-height: 2.35rem;
  }
}
</style>
