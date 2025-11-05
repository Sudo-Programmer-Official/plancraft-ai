<!-- src/views/DashboardView.vue -->
<template>
  <div v-if="checkingAuth" class="px-4 py-8 text-center text-gray-400">
    Checking session…
  </div>
  <SetupPrompt v-if="showSetup" @done="showSetup=false" @close="showSetup=false" />
  <main v-else
    class="px-2 py-4 sm:px-4 md:px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
  >
    <GuestBanner :isGuest="authStore.guest" @login="redirectToLogin" />

    <!-- Carryover prompt -->
    <div
      v-if="carryoverCount > 0"
      class="col-span-1 sm:col-span-2 lg:col-span-3 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100 flex items-center justify-between"
    >
      <span class="text-sm">You have {{ carryoverCount }} unfinished task{{ carryoverCount===1?'':'s' }} from today. Move {{ Math.min(3, carryoverCount) }} to tomorrow?</span>
      <div class="flex items-center gap-2">
        <button @click="applyCarryover(3)" class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs">Move {{ Math.min(3, carryoverCount) }}</button>
        <button @click="ignoreCarryover()" class="px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/40 text-amber-50 text-xs">Ignore</button>
      </div>
    </div>

    <!-- Free plan usage banner -->
    <div
      v-if="usage.plan === 'free' && !isPremium"
      class="col-span-1 sm:col-span-2 lg:col-span-3 px-3 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-100 flex items-center justify-between"
    >
      <span class="text-sm">You’ve used {{ usage.used }}/{{ usage.limit }} reminders today.</span>
      <button
        v-if="!isGuest"
        @click="goToUpgrade"
        class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
      >
        Upgrade for unlimited 🚀
      </button>
      <RouterLink
        v-else
        to="/login"
        class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
      >
        🔑 Sign in
      </RouterLink>
    </div>

    <!-- Reactivate instantly banner (during cancel period) -->
    <div
      v-if="reactivateEligible"
      class="col-span-1 sm:col-span-2 lg:col-span-3 px-3 py-2 rounded-xl border border-yellow-400/30 bg-yellow-500/10 text-yellow-100 flex items-start gap-3"
    >
      <span>🔁</span>
      <div class="text-sm">
        <div class="font-medium">
          Premium until {{ cancelAtFmt }}
          <span v-if="daysLeft > 0">({{ daysLeft }} day{{ daysLeft === 1 ? '' : 's' }} left)</span>
        </div>
        <div class="opacity-90">Reactivate instantly to keep all premium features.</div>
      </div>
      <div class="ml-auto">
        <button @click="onReactivate" class="px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-yellow-50 text-sm">Reactivate</button>
      </div>
    </div>

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
            <span class="mr-1 text-yellow-300 animate-pulse">+</span>
            New Task
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
          @saved="handleSaveAndSchedule"
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
          <div class="flex items-center gap-2">
            <router-link
              to="/reports"
              class="text-indigo-400 hover:text-indigo-200 text-xs"
            >
              View Reports →
            </router-link>
            <router-link
              to="/journal"
              class="flex items-center text-xs px-3 py-1 rounded-lg font-medium bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white shadow-md transition"
            >
              Go to Journal →
            </router-link>
          </div>
        </div>
        <div v-if="journalLogs.length" class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm sm:text-base">
          <div class="p-3 rounded-xl bg-slate-900/40 text-center">
            <p class="text-2xl">🔥</p>
            <p class="font-medium" :class="{ 'animate-pulse': displayStreak >= 1 }">{{ displayStreak }}-day streak</p>
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
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-lg flex items-center gap-2">🤖 AI Insights</h3>
        <router-link to="/reports" class="text-indigo-400 hover:text-indigo-200 text-sm">View Reports →</router-link>
      </div>
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

    <!-- ====== REPORTS SNAPSHOT ====== -->
<div
  class="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-indigo-950/80 to-purple-950/70
         shadow-xl border border-indigo-900/40 text-slate-100 transition-all duration-300 hover:shadow-indigo-800/40"
>
  <!-- Header -->


  <!-- Report Content -->
<!-- Reports Snapshot -->
<div
  v-if="latestReport"
  class="rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-slate-900 via-indigo-950/80 to-purple-950/60
         border border-indigo-900/40 shadow-lg hover:shadow-indigo-800/30 text-slate-100
         transition-all duration-300 backdrop-blur-md"
>

  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
    <div class="flex items-center gap-2">
      <span class="text-lg sm:text-xl font-semibold flex items-center gap-2">
        📊 Reports Snapshot
      </span>
      <el-tooltip placement="top" content="Your latest summary for the selected period.">
        <span class="text-[12px] opacity-70 cursor-help align-middle">ⓘ</span>
      </el-tooltip>
    </div>

    Action Buttons
    <div class="flex flex-wrap gap-2 justify-start sm:justify-end">
      <button
        @click="onGenerateWeekly"
        :disabled="generatingWeekly || generatingMonthly"
        class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700
               hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white
               text-xs font-medium transition-all duration-300 shadow-md"
      >
        Generate Weekly
      </button>
      <button
        @click="onGenerateMonthly"
        :disabled="generatingWeekly || generatingMonthly"
        class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-purple-700
               hover:from-fuchsia-500 hover:to-purple-600 disabled:opacity-50 text-white
               text-xs font-medium transition-all duration-300 shadow-md"
      >
        Generate Monthly
      </button>
      <router-link
        to="/reports"
        class="text-indigo-300 hover:text-indigo-100 text-xs font-medium transition"
      >
        Open →
      </router-link>
    </div>
  </div>

  <!-- Report Summary -->
  <div class="space-y-3 mt-2">
    <div class="opacity-80 text-indigo-300 text-sm sm:text-base">
      {{ latestReport.period?.toUpperCase?.() || latestReport.period }}
      • {{ latestReport.start }} → {{ latestReport.end }}
    </div>

    <div class="flex flex-wrap items-center gap-3 sm:gap-4 mt-1">
      <div class="flex items-center gap-1">
        <span class="text-emerald-400 font-semibold text-base sm:text-lg">
          {{ latestReport.metrics?.totalCompleted || 0 }}
        </span>
        <span class="text-sm opacity-80">completed</span>
      </div>

      <span class="hidden sm:block opacity-40">•</span>

      <div class="flex items-center gap-1">
        <span class="text-slate-200 text-base sm:text-lg">
          {{ latestReport.metrics?.totalTasks || 0 }}
        </span>
        <span class="text-sm opacity-70">total</span>
      </div>
    </div>
  </div>

  <!-- Sparkline -->
  <div class="mt-4 sm:mt-5">
    <canvas
      ref="sparklineCanvas"
      width="180"
      height="40"
      class="w-full h-12 opacity-90"
    ></canvas>
  </div>

  <!-- Links -->
  <div class="mt-5 flex flex-wrap gap-3">
    <a
      v-if="latestReport.urls?.html"
      :href="latestReport.urls.html"
      target="_blank"
      class="px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600
             text-white text-xs sm:text-sm font-medium shadow-sm transition"
    >
      View HTML
    </a>
    <a
      v-if="latestReport.urls?.pdf"
      :href="latestReport.urls.pdf"
      target="_blank"
      class="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600
             text-white text-xs sm:text-sm font-medium shadow-sm transition"
    >
      View PDF
    </a>
  </div>
</div>

<!-- Empty State -->
<div
  v-else
  class="rounded-2xl p-6 bg-gradient-to-br from-slate-900 via-indigo-950/70 to-purple-950/60
         text-sm text-indigo-300/80 border border-indigo-900/40 backdrop-blur-md
         shadow-inner shadow-indigo-950/30 text-center"
>
  No reports yet.<br />
  <router-link
    to="/reports"
    class="text-indigo-400 hover:text-indigo-200 font-medium transition-colors"
  >
    Generate one
  </router-link>
  to see your progress ✨
</div>
</div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watchEffect, watch } from 'vue'
import { useHead } from '@vueuse/head'
import { useRoute, useRouter } from 'vue-router'
import { collection, onSnapshot, updateDoc, doc, query, where, serverTimestamp } from 'firebase/firestore'
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
import SetupPrompt from '@/components/SetupPrompt.vue'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { reactivateSubscription } from '@/services/stripeService'
import dayjs from 'dayjs'
import { toUTC } from '@/utils/timezone'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { useAuthFlags } from '@/composables/useAuthFlags'
import { trackLinkedInConversion } from '@/utils/ads'
dayjs.extend(utc)
dayjs.extend(timezone)
// === Reminder badges (Daily list) ===
import { getReminderStatus, scheduleReminder } from '@/services/reminderService'
import { listReports, generateReport } from '@/services/reportsService'
import api from '@/services/api'
import { getPreferences as getUserPreferences } from '@/services/settingsService'
import { ElMessage, ElNotification } from 'element-plus'
// import { onAuthStateChanged } from 'firebase/auth'
// import { auth } from '@/firebase/init'

const authStore = useAuthStore()
const { isPremium, isGuest, isFreeUser } = useAuthFlags()
const routerNav = useRouter()
const subStore = useSubscriptionStore()
const daysLeft = computed(() => {
  const d = subStore.subscription?.cancelAt
  return d ? Math.max(0, dayjs(d).diff(dayjs(), 'day')) : 0
})
const reactivateEligible = computed(() => {
  const status = String(subStore.subscription?.status || '').toLowerCase()
  const hasCancelAt = !!subStore.subscription?.cancelAt
  if (!hasCancelAt) return false
  const remaining = daysLeft.value
  if (remaining > 7) return false
  return status === 'canceled' || status === 'active'
})
const cancelAtFmt = computed(() => subStore.subscription?.cancelAt ? dayjs(subStore.subscription.cancelAt).format('MMM D, YYYY') : '')

// UI Toggles (customizable dashboard)
const showDaily = ref(true)
const showQuickLinks = ref(true)
const showWeekly = ref(true)
const showMonthly = ref(true)
const showJournal = ref(true)
const showAIInsights = ref(true)

// Usage meter (free plan)
const usage = ref({ used: 0, limit: 0, plan: '' })
async function fetchUsage() {
  try {
    const uid = auth?.currentUser?.uid || localStorage.getItem('uid')
    if (!uid) return
    const { data } = await api.get('/reminders/usage', { params: { userId: uid } })
    if (data?.success) usage.value = { used: data.used || 0, limit: data.limit || 0, plan: data.plan || '' }
  } catch {}
}
function goToUpgrade() {
  try { trackLinkedInConversion(import.meta.env.VITE_LI_CONV_UPGRADE_CLICK) } catch {}
  try {
    if (isGuest.value) return routerNav.push('/login')
    routerNav.push('/pricing')
  } catch {}
}

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
const carryoverCount = ref(0)
const latestReport = ref(null)
const generatingWeekly = ref(false)
const generatingMonthly = ref(false)
const sparklineCanvas = ref(null)

const showSetup = ref(false)



const reminderActiveByTask = ref({})
const checkingAuth = ref(true)
const userPrefs = ref({ notifications: {}, integrations: {} })

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

const userStreak = ref(0)
const displayStreak = computed(() => userStreak.value || journalStreak.value || 0)

onMounted(async () => {
  // One-time quick setup gate
  try {
    const seen = localStorage.getItem('pcai_setup_done') === '1'
    const tz = localStorage.getItem('user_timezone')
    const needsTz = !tz || tz === 'UTC'
    const needsPerm = typeof Notification !== 'undefined' && Notification.permission !== 'granted'
    showSetup.value = !seen && (needsTz || needsPerm)
  } catch {}
  journalLogs.value = await fetchEntries()
  // Fetch latest report (non-blocking)
  try { const items = await listReports(1); latestReport.value = Array.isArray(items) ? items[0] : null } catch { latestReport.value = null }

  // If it's after 10pm local and no journal entry today, gently nudge
  try {
    const now = new Date()
    const hours = now.getHours()
    const today = toLocalDateKey(now)
    const hasToday = Array.isArray(journalLogs.value) && journalLogs.value.some(e => e?.date === today)
    const nudged = localStorage.getItem('streak_nudge_today') === today
    if (hours >= 22 && !hasToday && !nudged) {
      ElNotification({
        title: 'Keep the streak alive ✨',
        message: 'Log a quick reflection before midnight to maintain your streak.',
        type: 'info',
        duration: 5000,
        offset: 80,
      })
      try { localStorage.setItem('streak_nudge_today', today) } catch {}
    }
  } catch {}
})

async function onGenerateWeekly() {
  if (generatingWeekly.value) return
  generatingWeekly.value = true
  try {
    await generateReport('weekly', false)
    ElMessage({ type: 'success', message: 'Weekly report generated', duration: 1500 })
    try { const items = await listReports(1); latestReport.value = Array.isArray(items) ? items[0] : null } catch {}
    drawSparkline()
  } catch (e) {
    ElMessage({ type: 'error', message: 'Failed to generate report', duration: 2000 })
  } finally {
    generatingWeekly.value = false
  }
}

async function onGenerateMonthly() {
  if (generatingMonthly.value) return
  generatingMonthly.value = true
  try {
    await generateReport('monthly', false)
    ElMessage({ type: 'success', message: 'Monthly report generated', duration: 1500 })
    try { const items = await listReports(1); latestReport.value = Array.isArray(items) ? items[0] : null } catch {}
    drawSparkline()
  } catch (e) {
    ElMessage({ type: 'error', message: 'Failed to generate report', duration: 2000 })
  } finally {
    generatingMonthly.value = false
  }
}

function getLast7DaysYMD() {
  const out = []
  const d = new Date()
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(d)
    dd.setDate(d.getDate() - i)
    out.push(toLocalDateKey(dd))
  }
  return out
}

function drawSparkline() {
  try {
    const el = sparklineCanvas.value
    if (!el) return
    const ctx = el.getContext('2d')
    const w = el.width
    const h = el.height
    ctx.clearRect(0, 0, w, h)
    const days = getLast7DaysYMD()
    const all = [...weeklyTasks.value, ...dailyTasks.value]
    const counts = days.map((ymd) => all.filter(t => t.date === ymd && t.completed).length)
    const max = Math.max(1, ...counts)
    const stepX = w / (counts.length - 1)
    // line path
    ctx.beginPath()
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    counts.forEach((v, i) => {
      const x = i * stepX
      const y = h - (v / max) * (h - 6) - 3
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
    // fill gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, 'rgba(99,102,241,0.35)')
    grad.addColorStop(1, 'rgba(99,102,241,0.00)')
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
  } catch {}
}

watch(() => weeklyTasks.value.map(t => `${t.date}:${t.completed}`).join(','), () => {
  drawSparkline()
})

watch(() => dailyTasks.value.map(t => `${t.date}:${t.completed}`).join(','), () => {
  drawSparkline()
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
    try {
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
        try { carryoverCount.value = dailyTasks.value.filter((t) => t.is_carryover === true && t.completed === false).length } catch {}
        const weekDays = ymdRange(startOfWeek, endOfWeek)
        weeklyTasks.value = userTasks.filter((t) => weekDays.includes(t.date))
        const monthDays = ymdRange(startOfMonth, endOfMonth)
        monthlyTasks.value = userTasks.filter((t) => monthDays.includes(t.date))
      })
    } catch (e) {
      console.warn('Live tasks listener failed; falling back to one-time load', e?.message || e)
      loadTasks().catch(() => {})
    }
  })
})

onUnmounted(() => {
  if (unsubscribe.value) unsubscribe.value()
})

async function redirectToLogin() {
  window.location.href = '/login?redirect=/dashboard'
}

async function onReactivate() {
  try {
    const uid = authStore?.user?.uid
    if (!uid) return redirectToLogin()
    const url = await reactivateSubscription(uid)
    window.location.href = url
  } catch (e) {
    console.error('Reactivate failed', e)
  }
}

// Carryover actions
async function applyCarryover(limit = 3) {
  try {
    const uid = authStore?.user?.uid
    if (!uid) return
    await api.post('/carryover/apply', { userId: uid, limit })
    await loadTasks()
    ElMessage({ message: 'Moved to tomorrow ✅', type: 'success', duration: 1600 })
  } catch (e) {
    console.warn('applyCarryover failed', e?.response?.data || e?.message)
  }
}

async function ignoreCarryover() {
  try {
    const uid = authStore?.user?.uid
    if (!uid) return
    await api.post('/carryover/ignore', { userId: uid })
    await loadTasks()
    ElMessage({ message: 'Marked as overdue', type: 'info', duration: 1600 })
  } catch (e) {
    console.warn('ignoreCarryover failed', e?.response?.data || e?.message)
  }
}

async function fetchAISummary() {
  try {
    // Merge across ranges but avoid duplicates (today ∈ week ∈ month)
    const all = [...dailyTasks.value, ...weeklyTasks.value, ...monthlyTasks.value]
    const unique = Array.from(new Map(all.map(t => [t.id, t])).values())
    const compacted = unique.map(t => ({
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
  const patch = { completed: task.completed }
  if (task.completed) patch.completedAt = serverTimestamp()
  else patch.completedAt = null
  await updateDoc(doc(db, 'tasks', task.id), patch)
}

// === Reminder scheduling on save (mirror TaskBoard) ===
// function buildLocalIso(ymd, hhmm) {
//   try {
//     const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
//     const dateStr = `${ymd} ${hhmm || '00:00'}`
//     return toUTC(dateStr, tz) || new Date().toISOString()
//   } catch {
//     return new Date().toISOString()
//   }
// }


function buildLocalIso(ymd, hhmm) {
  try {
    const [y, m, d] = String(ymd || '').split('-').map(n => parseInt(n, 10))
    const [hh, mm] = String(hhmm || '00:00').split(':').map(n => parseInt(n, 10))
    if (!y || !m || !d) throw new Error('invalid date parts')

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const yStr = String(y).padStart(4, '0')
    const mStr = String(m).padStart(2, '0')
    const dStr = String(d).padStart(2, '0')
    const hhStr = String(hh || 0).padStart(2, '0')
    const mmStr = String(mm || 0).padStart(2, '0')
    const local = dayjs.tz(`${yStr}-${mStr}-${dStr} ${hhStr}:${mmStr}`, tz, true)
    return local.utc().toISOString()
  } catch (err) {
    console.warn('buildLocalIso failed:', err)
    return new Date().toISOString()
  }
}

async function handleSaveAndSchedule(payload) {
  // Delegate to existing save flow (adds/updates task and may set payload.id)
  await handleSave(payload)
  try {
    const uid = authStore?.user?.uid
    const taskId = payload?.id
    if (!uid || !taskId) return
    if (payload?.reminderTime) {
      const iso = buildLocalIso(payload.date, payload.reminderTime)
      const prefs = userPrefs.value?.notifications || {}
      // Prefer direct API call to catch soft warnings via response headers
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
        // Soft warning header when free limit reached but allowed once
        const warn = resp?.headers?.['x-plan-warning'] || resp?.headers?.['X-Plan-Warning']
        if (warn) ElMessage({ message: warn, type: 'warning', duration: 5000 })
        // Refresh usage banner
        try { await fetchUsage() } catch {}
      } catch (err) {
        // Fallback to existing helper and show upgrade message on hard cap
        await scheduleReminder(uid, taskId, payload.title, iso, prefs)
        const status = err?.response?.status
        if (status === 403) {
          const msg = err?.response?.data?.error || 'Daily reminder limit reached. Upgrade to Pro for unlimited reminders.'
          ElMessage({ message: msg, type: 'warning', duration: 6000 })
        }
      }
    } else {
      await api.post('/reminders/cancel', { userId: uid, taskId })
    }
  } catch (e) {
    console.warn('Reminder sync (dashboard) failed:', e?.response?.data || e?.message)
  }
}

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
  try {
    const uid = authStore?.user?.uid
    if (uid) {
      getUserPreferences(uid)
        .then((res) => { userPrefs.value = res || { notifications: {}, integrations: {} } })
        .catch((e) => console.warn('Failed to load user prefs:', e))
    }
  } catch {}
})

// Reconcile streak state on login/dashboard
watch(
  () => authStore?.user?.uid,
  async (uid) => {
    try {
      if (!uid) { userStreak.value = 0; return }
      await ensureDailyStreakState(uid)
      userStreak.value = await getUserStreak(uid)
    } catch {}
  },
  { immediate: true }
)

// Fetch usage meter on mount
onMounted(fetchUsage)

// Listen for global usage refresh events (e.g., from TaskPlannerDialog)
onMounted(() => {
  try { window.addEventListener('usage-refresh', fetchUsage) } catch {}
})
onUnmounted(() => {
  try { window.removeEventListener('usage-refresh', fetchUsage) } catch {}
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
