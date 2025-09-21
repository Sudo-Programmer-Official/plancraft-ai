<!-- src/views/DashboardView.vue -->
<template>
  <main
    class="px-2 py-4 sm:px-4 md:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
  >
    <GuestBanner :isGuest="authStore.guest" @login="redirectToLogin" /> 

    <!-- Daily Card -->
   <!-- Daily Card -->
<div class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg">
  <div class="flex justify-between items-center mb-3">
    <h3 class="font-semibold">📅 Daily Tasks</h3>
    <button
      @click="openPlanner"
      class="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
    >
      ➕ Plan My Day
    </button>
  </div>

  <ul
    v-if="sortedDaily.length"
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
      <button
        @click="toggleComplete(task)"
        class="text-xs px-2 py-1 rounded"
        :class="task.completed ? 'bg-green-600' : 'bg-red-600'"
      >
        {{ task.completed ? 'Done' : 'Pending' }}
      </button>
    </li>
  </ul>

  <p v-else class="text-gray-400 text-sm">No tasks today.</p>

  <!-- Dialog -->
<TaskPlannerDialog
  :open="showPlanner"
  :date="selectedDate"
  @close="showPlanner = false"
  @saved="reloadDaily"
/>
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
    <div
      class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-pink-500/40 transition"
    >
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

    <!-- AI Insights Card -->
    <div
      class="bg-gray-900/80 rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-green-500/40 transition col-span-1 sm:col-span-2 lg:col-span-3"
    >
      <h3 class="font-semibold text-lg mb-4 flex items-center gap-2">
        🤖 AI Insights
      </h3>

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
        <div
          v-if="aiSummary.weeklyWarning"
          class="bg-red-900/30 p-3 rounded border border-red-600"
        >
          <p><strong>⚠ Weekly Warning:</strong> {{ aiSummary.weeklyWarning }}</p>
        </div>
      </div>

      <p v-else class="text-gray-400">Fetching AI insights…</p>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue'
import { collection, onSnapshot, updateDoc, doc, query, where } from 'firebase/firestore'
import { db, auth } from '@/firebase/init'
import { onAuthStateChanged } from 'firebase/auth'
import { summarizeTasks } from '@/services/aiService'
import GuestBanner from '@/components/GuestBanner.vue'
import { useAuthStore } from '@/stores/authStore'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import { useTasks } from '@/composables/useTasks'

const { tasks, toggleComplete: toggleFromComposable, loadTasks } = useTasks()
const authStore = useAuthStore()

const aiSummary = ref(null)
const dailyTasks = ref([])
const weeklyTasks = ref([])
const monthlyTasks = ref([])
const showPlanner = ref(false)


const today = new Date()
const selectedDate = ref(today)

// Helpers
function toYMD(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toLocaleDateString('en-CA')
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

const openPlanner = () => {
  showPlanner.value = true
}
const reloadDaily = async () => {
  await loadTasks()
  dailyTasks.value = tasks.value.filter(t => t.date === toYMD(today))
}

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
          date: typeof data.date === 'string'
            ? data.date
            : toYMD(data.date?.toDate?.() || data.date),
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
    aiSummary.value = await summarizeTasks(allTasks)
  } catch (err) {
    console.error('Task summary failed:', err)
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
  [...dailyTasks.value].sort((a, b) =>
    (a.completed - b.completed) || (a.order - b.order || 0)
  )
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
