<template>
  <div
    class="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white overflow-x-hidden"
  >
    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
      <header class="text-center mb-8">
        <h1 class="text-3xl font-bold">Weekly Tasks</h1>
        <p class="text-gray-300">
          {{ completedCount }} tasks completed, {{ remainingCount }} remaining
        </p>
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

        <TransitionGroup name="fade-move" tag="ul" class="space-y-3">
          <li
            v-for="task in filteredTasks"
            :key="task.id"
            class="flex justify-between items-center bg-black/20 px-4 py-3 rounded-xl"
          >
            <div>
              <p
                :class="[
                  'font-medium',
                  task.completed ? 'line-through text-gray-400' : 'text-white',
                ]"
              >
                {{ task.title }}
                <span
                  v-if="hasLate(task)"
                  class="ml-2 text-[10px] px-2 py-0.5 rounded bg-red-600/30 border border-red-500/40 text-red-200 align-middle"
                >
                  Late<span v-if="lateDelay(task) !== null"> ({{ lateDelay(task) }}d)</span>
                </span>
              </p>
              <p v-if="task.details" class="text-sm text-gray-400">{{ task.details }}</p>
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
import { buildLocalIso } from '@/utils/timeHelper.js'
import { scheduleReminder } from '@/services/reminderService.js'
import api from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { ElMessage } from 'element-plus'
import { hasNotificationSetup } from '@/utils/notificationCheck'
import NotificationPrompt from '@/components/NotificationPrompt.vue'
const { tasks, toggleComplete, loadTasksForRange } = useTasks()
const days = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 6 },
]
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

    if (payload?.reminderTime) {
      const iso = buildLocalIso(payload.date, payload.reminderTime)
      const prefs = userPrefs.value?.notifications || {}
      try { if (!hasNotificationSetup(prefs)) notifPromptOpen.value = true } catch {}
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
  return tasks.value.filter((task) => {
    const taskDate = typeof task.date === 'string' ? task.date : toYMD(task.date)
    return taskDate === target
  })
})

const completedCount = computed(() => tasks.value.filter((t) => t.completed).length)
const remainingCount = computed(() => tasks.value.filter((t) => !t.completed).length)

const dayLabel = computed(() =>
  selectedDate.value.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }),
)

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
