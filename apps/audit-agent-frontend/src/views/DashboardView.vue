<!-- src/views/DashboardView.vue -->
<template>
  <main
    class="px-2 py-4 sm:px-4 md:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
  >
    <GuestBanner :isGuest="authStore.guest" @login="redirectToLogin" />

    <!-- Daily Card -->
    <!-- Daily Card -->
  <!-- Daily Card -->
<div class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg">
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
        <!-- Edit button -->
        <button
          @click.stop="openDialog(task)"
          class="text-gray-400 hover:text-indigo-400 mr-4"
          title="Edit Task"
        >
          ✏️
        </button>

        <!-- Toggle complete -->
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

  <!-- Task Planner Dialog -->
  <TaskPlannerDialog
    v-if="showPlanner"
    :open="showPlanner"
    :date="selectedDate"
    :task="selectedTask"
    :edit-mode="!!selectedTask"
    @close="closePlanner"
    @saved="handleSave"
  />

  <!-- Focus (mirrors AI Insights focus) -->
  <div
    v-if="aiSummary && aiSummary.focus"
    class="mt-4 bg-indigo-900/40 p-3 rounded border border-indigo-600"
  >
    <p class="text-sm">
      <strong>🎯 Focus:</strong> {{ aiSummary.focus }}
    </p>
  </div>
</div>

    <!-- Weekly Card -->
    <div
      class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-purple-500/40 transition"
    >
      <h3 class="font-semibold mb-3">📆 Weekly Overview</h3>
      <p class="text-sm text-gray-400">
        {{ doneWeekly }}/{{ weeklyTasks.length }} completed this week
      </p>
      <ul class="mt-3 space-y-2 text-sm">
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
    <div class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-pink-500/40 transition">
      <h3 class="font-semibold mb-3">🌙 Monthly Goals</h3>
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

    <!-- Journal Snapshot Card -->
    <!-- Journal Snapshot Card -->
<div
  class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-indigo-500/40 transition"
>
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
    <!-- Streak -->
    <div class="p-3 rounded-xl bg-slate-900/40 text-center">
      <p class="text-2xl">🔥</p>
      <p class="font-medium">{{ journalStreak }}-day streak</p>
    </div>

    <!-- Last Mood -->
    <div class="p-3 rounded-xl bg-slate-900/40 text-center">
      <p class="text-2xl">{{ journalLogs[0].mood?.emoji || "📝" }}</p>
      <p class="font-medium">Last Mood</p>
    </div>

    <!-- Total -->
    <div class="p-3 rounded-xl bg-slate-900/40 text-center">
      <p class="text-2xl">📒</p>
      <p class="font-medium">{{ journalLogs.length }} reflections</p>
    </div>
  </div>

  <!-- 🔹 Journal Focus -->
  <div
    v-if="journalFocus"
    class="mt-4 bg-indigo-900/40 p-3 rounded border border-indigo-600"
  >
    <p class="text-sm">
      <strong>🎯 Journal Focus:</strong> {{ journalFocus }}
    </p>
  </div>

  <p v-else class="text-gray-400 text-sm">No reflections yet. Start journaling today!</p>
</div>


    <!-- AI Insights Card -->
    <div
      class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-green-500/40 transition col-span-1 sm:col-span-2 lg:col-span-3"
    >
      <h3 class="font-semibold text-lg mb-4 flex items-center gap-2">🤖 AI Insights</h3>

      <div v-if="aiSummary" class="text-sm space-y-4">
        <!-- Progress Overview -->
        <div class="flex justify-between items-center">
          <span><strong>✅ Completed:</strong> {{ aiSummary.completedPct }}%</span>
          <span><strong>📌 Pending:</strong> {{ aiSummary.pending }}</span>
        </div>

        <!-- Focus -->
        <div class="bg-indigo-900/40 p-3 rounded border border-indigo-600">
          <p><strong>🎯 Focus:</strong> {{ aiSummary.focus }}</p>
        </div>

        <!-- Quick Wins -->
        <div
          v-if="aiSummary.quickWins.length"
          class="bg-green-900/30 p-3 rounded border border-green-600"
        >
          <p class="font-medium mb-2">⚡ Quick Wins</p>
          <ul class="list-disc list-inside space-y-1 text-gray-300">
            <li v-for="(q, i) in aiSummary.quickWins" :key="i">{{ q }}</li>
          </ul>
        </div>

        <!-- Heavy Lifts -->
        <div
          v-if="aiSummary.heavyLifts.length"
          class="bg-yellow-900/30 p-3 rounded border border-yellow-600"
        >
          <p class="font-medium mb-2">🏋 Heavy Lifts</p>
          <ul class="list-disc list-inside space-y-1 text-gray-300">
            <li v-for="(h, i) in aiSummary.heavyLifts" :key="i">{{ h }}</li>
          </ul>
        </div>

        <!-- Weekly Warning -->
        <div v-if="aiSummary.weeklyWarning" class="bg-red-900/30 p-3 rounded border border-red-600">
          <p><strong>⚠ Weekly Warning:</strong> {{ aiSummary.weeklyWarning }}</p>
        </div>
      </div>

      <p v-else class="text-gray-400">Fetching AI insights…</p>
    </div>
  </main>
</template>

<script setup>
import { ref, nextTick, computed, onMounted, onUnmounted, watchEffect } from 'vue'
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
const { tasks, toggleComplete: toggleFromComposable, loadTasks } = useTasks()
import { summarizeJournalFocus } from '@/services/aiService'  // new import

const authStore = useAuthStore()

const aiSummary = ref(null)
const dailyTasks = ref([])
const weeklyTasks = ref([])
const monthlyTasks = ref([])
const showPlanner = ref(false)

const selectedTask = ref(null)
const dailyList = ref(null)

/* ----------------- JOURNAL STATE ----------------- */
const journalLogs = ref([])
const journalFocus = ref('')

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

/* ----------------- JOURNAL LOAD ----------------- */
// onMounted(async () => {
//   journalLogs.value = await fetchEntries()
// })

onMounted(async () => {
  journalLogs.value = await fetchEntries()
  if (journalLogs.value.length) {
  try {
    // Use latest 3 reflections for context
    const latest = journalLogs.value.slice(0, 3).map(l => l.text);
    journalFocus.value = await summarizeJournalFocus(latest);
  } catch (err) {
    console.error('❌ Journal focus generation failed:', err);
  }
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

const reloadDaily = async () => {
  await loadTasks()
  dailyTasks.value = tasks.value.filter((t) => t.date === toYMD(today))
}

const today = new Date()
// const selectedDate = ref(today)
const selectedDate = toLocalDateKey(today)

// Helpers
function toYMD(date) {
  if (typeof date === 'string') return date
  return toLocalDateKey(date)
}

async function handleSave(payload) {
  // Same pattern as TaskBoard
  if (Array.isArray(payload)) {
    await loadTasks()
    return reloadDaily()
  }

  if (payload.id) {
    await updateTaskInFirebase(payload)   // 🔹 persist edit
  } else {
    await addTaskToFirebase(payload)      // 🔹 persist new
  }

  

  await reloadDaily()   // refresh local dailyTasks
  closePlanner()
   // 🔹 scroll to top after tasks reload
  await nextTick()
  scrollDailyTop()
}
function scrollDailyTop() {
  if (dailyList.value) {
    dailyList.value.scrollTop = 0
  }
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

// const openPlanner = () => {
//   showPlanner.value = true
// }
// const reloadDaily = async () => {
//   await loadTasks()
//   dailyTasks.value = tasks.value.filter((t) => t.date === toYMD(today))
// }

// Date ranges
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
          date:
            typeof data.date === 'string' ? data.date : toYMD(data.date?.toDate?.() || data.date),
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

// async function fetchAISummary() {
//   try {
//     const allTasks = [...dailyTasks.value, ...weeklyTasks.value, ...monthlyTasks.value]
//     aiSummary.value = await summarizeTasks(allTasks)
//   } catch (err) {
//     console.error('Task summary failed:', err)
//   }
// }
async function fetchAISummary() {
  try {
    const allTasks = [
      ...dailyTasks.value,
      ...weeklyTasks.value,
      ...monthlyTasks.value
    ]

    // Safety: pass only compact task objects (id, title, completed, date)
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
  [...dailyTasks.value].sort((a, b) => {
    // First: incomplete tasks before completed
    if (a.completed !== b.completed) return a.completed - b.completed

    // Then: newest first by createdAt
    return (b.createdAt || 0) - (a.createdAt || 0)
  }),
)

const doneWeekly = computed(() => weeklyTasks.value.filter((t) => t.completed).length)
const doneMonthly = computed(() => monthlyTasks.value.filter((t) => t.completed).length)

async function toggleComplete(task) {
  task.completed = !task.completed // optimistic UI
  await updateDoc(doc(db, 'tasks', task.id), { completed: task.completed })
}
</script>

<style scoped>
/* nice thin scrollbar */
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
