<!-- src/views/DashboardView.vue -->
<template>
  <div v-if="checkingAuth" class="px-4 py-8 text-center text-gray-400">
    Checking session…
  </div>
  <main v-else
    class="px-2 py-4 sm:px-4 md:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
  >
    <GuestBanner :isGuest="authStore.guest" @login="redirectToLogin" />

    <!-- ====== DAILY + QUICK LINKS ====== -->
    <div class="col-span-1 sm:col-span-2 lg:col-span-2 space-y-4">
      <!-- Daily Card -->
      <div v-if="showDaily" class="daily-card bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold">📅 Daily Tasks</h3>
          <button
            @click="openPlanner"
            class="flex items-center text-xs px-3 py-1 rounded-lg font-medium bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white shadow-md transition"
          >
            <span class="mr-1 text-yellow-300 animate-pulse">➕</span>
            Plan My Day
          </button>
        </div>

        <ul
          v-if="sortedDaily.length"
          ref="dailyList"
          class="space-y-2 text-sm max-h-64 overflow-y-auto pr-2 custom-scroll"
        >
          <li
            v-for="task in sortedDaily"
            :key="task.id"
            class="flex justify-between items-center p-2 rounded bg-gray-800"
          >
            <div class="flex flex-col">
              <span :class="{ 'line-through text-gray-500': task.completed }">
                {{ task.title }}
              </span>
              <small class="text-gray-400">{{ task.date }}</small>
            </div>

            <div class="flex items-center gap-2">
              <button
                v-if="reminderActiveByTask[task.id]"
                @click.stop="onReminderClick(task)"
                class="text-yellow-400 hover:opacity-80"
                title="Reminder active — click to manage"
              >
                🔔
              </button>
              <button
                v-else
                @click.stop="openDialog(task)"
                class="text-gray-500 hover:text-gray-300"
                title="No reminder — click to add"
              >
                🔔
              </button>
              <button
                @click.stop="openDialog(task)"
                class="text-gray-400 hover:text-indigo-400 mr-4"
                title="Edit Task"
              >
                ✏️
              </button>
              <button
                @click="toggleComplete(task)"
                class="text-xs px-2 py-1 rounded"
                :class="task.completed ? 'bg-green-600' : 'bg-red-600'"
              >
                {{ task.completed ? 'Done' : 'Pending' }}
              </button>
            </div>
          </li>
        </ul>

        <p v-else class="text-gray-400 text-sm">No tasks today.</p>

        <TaskPlannerDialog
          v-if="showPlanner"
          :open="showPlanner"
          :date="selectedDate"
          :task="selectedTask"
          :edit-mode="!!selectedTask"
          @close="closePlanner"
          @saved="handleSave"
        />
      </div>

      <!-- Quick Links Card -->
      <QuickLinksCard v-if="showQuickLinks" class="quick-links-card col-span-1 sm:col-span-2 lg:col-span-3" />
    </div>

    <!-- ====== WEEKLY + MONTHLY ====== -->
    <div class="col-span-1 sm:col-span-2 lg:col-span-1 space-y-4">
      <!-- Weekly Card -->
      <div v-if="showWeekly" class="weekly-card bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold">📆 Weekly Overview</h3>
          <router-link
            to="/weekly"
            class="text-xs px-3 py-1 rounded-lg font-medium bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white shadow-md transition"
          >
            Go to Weekly →
          </router-link>
        </div>
        <p class="text-sm text-gray-400">
          {{ doneWeekly }}/{{ weeklyTasks.length }} completed this week
        </p>
        <ul class="mt-3 space-y-2 text-sm max-h-40 overflow-y-auto custom-scroll">
          <li
            v-for="task in weeklyTasks.slice(0, 5)"
            :key="task.id"
            class="p-2 rounded bg-gray-800 flex justify-between"
          >
            <span :class="{ 'line-through text-gray-500': task.completed }">
              {{ task.title }}
            </span>
            <small class="text-gray-400">{{ task.date }}</small>
          </li>
        </ul>
      </div>

      <!-- Monthly Card -->
      <div v-if="showMonthly" class="monthly-card bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold">🌙 Monthly Goals</h3>
          <router-link
            to="/monthly"
            class="text-xs px-3 py-1 rounded-lg font-medium bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white shadow-md transition"
          >
            Go to Monthly →
          </router-link>
        </div>
        <p class="text-sm text-gray-400">
          {{ doneMonthly }}/{{ monthlyTasks.length }} completed this month
        </p>
        <div class="h-2 bg-gray-700 rounded mt-2">
          <div
            class="h-2 bg-indigo-500 rounded transition-all duration-500"
            :style="{ width: progressBarWidth }"
          ></div>
        </div>
      </div>
    </div>

    <!-- ====== JOURNAL ====== -->
    <div v-if="showJournal" class="journal-card col-span-1 sm:col-span-2 lg:col-span-3">
      <div class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold">📖 Journal Snapshot</h3>
          <router-link
            to="/journal"
            class="flex items-center text-xs px-3 py-1 rounded-lg font-medium bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white shadow-md transition"
          >
            Go to Journal →
          </router-link>
        </div>
        <div v-if="journalLogs.length" class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm sm:text-base">
          <div class="p-3 rounded-xl bg-slate-900/40 text-center">
            <p class="text-2xl">🔥</p>
            <p class="font-medium">{{ journalStreak }}-day streak</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/40 text-center">
            <p class="text-2xl">{{ journalLogs[0].mood?.emoji || "📝" }}</p>
            <p class="font-medium">Last Mood</p>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/40 text-center">
            <p class="text-2xl">📒</p>
            <p class="font-medium">{{ journalLogs.length }} reflections</p>
          </div>
        </div>
        <p v-else class="text-gray-400 text-sm">No reflections yet. Start journaling today!</p>
      </div>
    </div>

    <!-- ====== AI INSIGHTS ====== -->
    <div
      v-if="showAIInsights"
      class="ai-card bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg col-span-1 sm:col-span-2 lg:col-span-3"
    >
      <h3 class="font-semibold text-lg mb-4 flex items-center gap-2">🤖 AI Insights</h3>
      <div v-if="aiSummary" class="text-sm space-y-4">
        <div class="flex justify-between items-center">
          <span><strong>✅ Completed:</strong> {{ aiSummary.completedPct }}%</span>
          <span><strong>📌 Pending:</strong> {{ aiSummary.pending }}</span>
        </div>
        <div class="bg-indigo-900/40 p-3 rounded border border-indigo-600">
          <p><strong>🎯 Focus:</strong> {{ aiSummary.focus }}</p>
        </div>
        <div v-if="aiSummary.quickWins.length" class="bg-green-900/30 p-3 rounded border border-green-600">
          <p class="font-medium mb-2">⚡ Quick Wins</p>
          <ul class="list-disc list-inside space-y-1 text-gray-300">
            <li v-for="(q, i) in aiSummary.quickWins" :key="i">{{ q }}</li>
          </ul>
        </div>
        <div v-if="aiSummary.heavyLifts.length" class="bg-yellow-900/30 p-3 rounded border border-yellow-600">
          <p class="font-medium mb-2">🏋 Heavy Lifts</p>
          <ul class="list-disc list-inside space-y-1 text-gray-300">
            <li v-for="(h, i) in aiSummary.heavyLifts" :key="i">{{ h }}</li>
          </ul>
        </div>
        <div v-if="aiSummary.weeklyWarning" class="bg-red-900/30 p-3 rounded border border-red-600">
          <p><strong>⚠ Weekly Warning:</strong> {{ aiSummary.weeklyWarning }}</p>
        </div>
      </div>
      <p v-else class="text-gray-400">Fetching AI insights…</p>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watchEffect, watch } from 'vue'
import { useHead } from '@vueuse/head'
import { useRoute } from 'vue-router'
import { collection, onSnapshot, updateDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '@/firebase/init'
import { onAuthStateChanged } from 'firebase/auth'
import { toLocalDateKey } from '@/utils/dateHelper'
import { summarizeTasks } from '@/services/aiService'
import GuestBanner from '@/components/GuestBanner.vue'
import { useAuthStore } from '@/stores/authStore'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import { useTasks } from '@/composables/useTasks'
import { addTaskToFirebase, updateTaskInFirebase, fetchEntries } from '@/services/firebaseService'
import QuickLinksCard from '@/components/QuickLinksCard.vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const authStore = useAuthStore()

// UI Toggles (customizable dashboard)
const showDaily = ref(true)
const showQuickLinks = ref(true)
const showWeekly = ref(true)
const showMonthly = ref(true)
const showJournal = ref(true)
const showAIInsights = ref(true)

/* -------------- Tasks + Journal State -------------- */
const { tasks, toggleComplete: toggleFromComposable, loadTasks } = useTasks()
const aiSummary = ref(null)
const dailyTasks = ref([])
const weeklyTasks = ref([])
const monthlyTasks = ref([])
const showPlanner = ref(false)
const selectedTask = ref(null)
const dailyList = ref(null)
const journalLogs = ref([])

const journalStreak = computed(() => {
  if (!journalLogs.value.length) return 0
  const dates = journalLogs.value
    .map((l) => l.date)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))

  let count = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diff = (prev - curr) / (1000 * 60 * 60 * 24)
    if (diff === 1) count++
    else break
  }
  return count
})

onMounted(async () => {
  journalLogs.value = await fetchEntries()
})

function startTour() {
  const tour = driver({
    animate: true,
    showProgress: true,
    steps: [
      {
        element: '.daily-card',
        popover: {
          title: '📅 Daily Tasks',
          description: 'Plan and track your tasks for today here.',
          position: 'bottom'
        }
      },
      {
        element: '.quick-links-card',
        popover: {
          title: '🔗 Quick Links',
          description: 'Save your frequently used websites or tools here.',
          position: 'bottom'
        }
      },
      {
        element: '.weekly-card',
        popover: {
          title: '📆 Weekly Overview',
          description: 'See what you’ve completed this week and upcoming tasks.',
          position: 'left'
        }
      },
      {
        element: '.monthly-card',
        popover: {
          title: '🌙 Monthly Goals',
          description: 'Track your long-term goals and progress here.',
          position: 'left'
        }
      },
      {
        element: '.journal-card',
        popover: {
          title: '📖 Journal Snapshot',
          description: 'Reflect daily and track your mood & streaks.',
          position: 'top'
        }
      },
      {
        element: '.ai-card',
        popover: {
          title: '🤖 AI Insights',
          description: 'AI analyzes your tasks and provides smart suggestions.',
          position: 'top'
        }
      }
    ]
  })
  tour.drive()
}

onMounted(() => {
  const hasSeenTour = localStorage.getItem('seenTour')
  if (!hasSeenTour) {
    setTimeout(() => {
      startTour()
      localStorage.setItem('seenTour', 'true')
    }, 800) // wait for DOM render
  }
})

function openPlanner() {
  selectedTask.value = null
  showPlanner.value = true
}
function openDialog(task) {
  selectedTask.value = task
  showPlanner.value = true
}
function closePlanner() {
  showPlanner.value = false
  selectedTask.value = null
}

const today = new Date()
const selectedDate = toLocalDateKey(today)

function toYMD(date) {
  if (typeof date === 'string') return date
  return toLocalDateKey(date)
}

function reloadDaily() {
  return loadTasks()
}

async function handleSave(payload) {
  if (Array.isArray(payload)) {
    await loadTasks()
    return reloadDaily()
  }
  if (payload.id) {
    await updateTaskInFirebase(payload)
  } else {
    const saved = await addTaskToFirebase(payload)
    payload.id = saved.id
  }
  await reloadDaily()
  closePlanner()
  await nextTick()
  scrollDailyTop()
}
function scrollDailyTop() {
  if (dailyList.value) dailyList.value.scrollTop = 0
}
function ymdRange(start, end) {
  const days = []
  const d = new Date(start)
  while (d <= end) {
    days.push(toYMD(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

/* Date ranges */
const startOfWeek = new Date(today)
startOfWeek.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1))
startOfWeek.setHours(0, 0, 0, 0)
const endOfWeek = new Date(startOfWeek)
endOfWeek.setDate(startOfWeek.getDate() + 6)
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

const unsubscribe = ref(null)

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      dailyTasks.value = []
      weeklyTasks.value = []
      monthlyTasks.value = []
      if (unsubscribe.value) unsubscribe.value()
      return
    }
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', user.uid))
    if (unsubscribe.value) unsubscribe.value()
    unsubscribe.value = onSnapshot(tasksQuery, (snapshot) => {
      const userTasks = snapshot.docs.map((docSnap) => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          date: typeof data.date === 'string' ? data.date : toYMD(data.date?.toDate?.() || data.date),
        }
      })
      dailyTasks.value = userTasks.filter((t) => t.date === toYMD(today))
      const weekDays = ymdRange(startOfWeek, endOfWeek)
      weeklyTasks.value = userTasks.filter((t) => weekDays.includes(t.date))
      const monthDays = ymdRange(startOfMonth, endOfMonth)
      monthlyTasks.value = userTasks.filter((t) => monthDays.includes(t.date))
    })
  })
})

onUnmounted(() => {
  if (unsubscribe.value) unsubscribe.value()
})

async function redirectToLogin() {
  window.location.href = '/login?redirect=/dashboard'
}

async function fetchAISummary() {
  try {
    const allTasks = [...dailyTasks.value, ...weeklyTasks.value, ...monthlyTasks.value]
    const compacted = allTasks.map(t => ({
      id: t.id,
      title: t.title,
      completed: !!t.completed,
      date: t.date
    }))
    aiSummary.value = await summarizeTasks(compacted)
  } catch (err) {
    console.error('❌ Task summary failed:', err.message || err)
  }
}

watchEffect(() => {
  if (dailyTasks.value.length || weeklyTasks.value.length || monthlyTasks.value.length) {
    fetchAISummary()
  }
})

const progressBarWidth = computed(() => {
  const done = monthlyTasks.value.filter((t) => t.completed).length
  const total = monthlyTasks.value.length || 1
  return `${Math.round((done / total) * 100)}%`
})

const sortedDaily = computed(() =>
  [...dailyTasks.value].sort((a, b) => (a.completed !== b.completed ? a.completed - b.completed : (b.createdAt || 0) - (a.createdAt || 0)))
)

const doneWeekly = computed(() => weeklyTasks.value.filter((t) => t.completed).length)
const doneMonthly = computed(() => monthlyTasks.value.filter((t) => t.completed).length)

async function toggleComplete(task) {
  task.completed = !task.completed
  await updateDoc(doc(db, 'tasks', task.id), { completed: task.completed })
}

// === Reminder badges (Daily list) ===
import { getReminderStatus } from '@/services/reminderService'
import api from '@/services/api'
// import { onAuthStateChanged } from 'firebase/auth'
// import { auth } from '@/firebase/init'

const reminderActiveByTask = ref({})
const checkingAuth = ref(true)

async function refreshReminderBadges(list) {
  try {
    const uid = authStore?.user?.uid
    if (!uid) { reminderActiveByTask.value = {}; return }
    const arr = Array.isArray(list) ? list : []
    const results = await Promise.all(
      arr.map(async (t) => {
        try {
          const r = await getReminderStatus(uid, t.id)
          return [t.id, !!r?.hasActive]
        } catch {
          return [t.id, false]
        }
      })
    )
    const map = {}
    for (const [id, flag] of results) map[id] = flag
    reminderActiveByTask.value = map
  } catch (e) {
    console.warn('refreshReminderBadges failed', e)
  }
}

watch(() => sortedDaily.value.map(t => t.id).join(','), () => {
  refreshReminderBadges(sortedDaily.value)
}, { immediate: true })

async function onReminderClick(task) {
  try {
    const uid = authStore?.user?.uid
    if (!uid || !task?.id) return
    const choice = window.prompt('Reminder active. Type "cancel" to cancel, or leave empty to dismiss:')
    if (choice && choice.toLowerCase() === 'cancel') {
      await api.post('/reminders/cancel', { userId: uid, taskId: task.id })
      await refreshReminderBadges(sortedDaily.value)
    }
  } catch (e) {
    console.warn('Reminder manage failed', e?.response?.data || e?.message)
  }
}

// Resolve auth state before rendering
onMounted(() => {
  try { onAuthStateChanged(auth, () => { checkingAuth.value = false }) } catch { checkingAuth.value = false }
})
</script>

<style scoped>
.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background-color: #4b5563;
  border-radius: 9999px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
</style>
