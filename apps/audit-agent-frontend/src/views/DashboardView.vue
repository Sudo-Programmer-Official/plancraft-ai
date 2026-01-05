<template>
  <div v-if="checkingAuth" class="px-4 py-8 text-center text-muted">Checking session…</div>
  <SetupPrompt v-else-if="showSetup" @done="handleSetupDone" @close="handleSetupDone" />
  <main v-else class="min-h-screen px-4 py-8 space-y-6 bg-bg text-text">
    <GuestBanner :isGuest="authStore.guest" @login="redirectToLogin" />

    <section
      class="card p-6 shadow-sm border-border"
      style="background: linear-gradient(120deg, rgb(var(--primary)) 0%, #6366f1 50%, #4338ca 100%); color: #fff;"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <p class="text-xs uppercase tracking-[0.25em] text-white/80">Planner</p>
          <h1 class="text-2xl md:text-3xl font-semibold leading-tight">{{ greetingHeadline }}</h1>
          <p class="text-sm text-white/80">One calm plan for today. Nothing hiding, everything visible.</p>
        </div>
        <div class="text-sm text-white/90 space-y-1 md:text-right">
          <p class="font-medium">Current focus</p>
          <p class="text-white" v-if="currentFocusTask">{{ currentFocusTask.title }}</p>
          <p class="text-white/80" v-else>All caught up — take a mindful pause.</p>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="card p-5 shadow-sm lg:col-span-1">
        <div class="flex items-center justify-between gap-2 mb-3">
          <h2 class="text-lg font-semibold">Quick Add</h2>
          <span class="text-xs text-muted">Always shows instantly</span>
        </div>
        <form class="space-y-3" @submit.prevent="submitQuickAdd">
          <div>
            <label class="text-xs text-muted mb-1 block">Task</label>
            <input
              v-model="quickTaskTitle"
              type="text"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="What needs to happen?"
            />
          </div>
          <div>
            <label class="text-xs text-muted mb-1 block">Date</label>
            <input
              v-model="quickTaskDate"
              type="date"
              class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            type="submit"
            class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-semibold py-2 hover:bg-primary/90 transition disabled:opacity-60"
            :disabled="savingQuickTask"
          >
            <span v-if="savingQuickTask">Saving…</span>
            <span v-else>Add task</span>
          </button>
        </form>
      </div>

      <div class="card p-5 shadow-sm lg:col-span-2">
        <div class="flex items-center justify-between gap-2 mb-3">
          <h2 class="text-lg font-semibold">Coming Up</h2>
          <span class="text-xs text-muted">{{ comingUpTasks.length }} scheduled</span>
        </div>
        <TaskList :tasks="comingUpTasks" empty-copy="No upcoming tasks yet." @edit="openTask" @toggle="onToggleComplete" />
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="card p-5 shadow-sm">
        <div class="flex items-center justify-between gap-2 mb-3">
          <h2 class="text-lg font-semibold">Today</h2>
          <span class="text-xs text-muted">{{ todayTasks.length }} total</span>
        </div>
        <div v-if="!todayTasks.length" class="text-sm text-muted py-2">You’re done for today.</div>
        <TaskList v-else :tasks="todayTasks" @edit="openTask" @toggle="onToggleComplete" />
      </div>

      <div class="card p-5 shadow-sm">
        <div class="flex items-center justify-between gap-2 mb-3">
          <h2 class="text-lg font-semibold text-danger">Overdue</h2>
          <button
            class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-surface/70 disabled:opacity-60"
            @click="moveOverdueToToday"
            :disabled="!overdueTasks.length || movingOverdue"
          >
            {{ movingOverdue ? 'Moving…' : 'Move all to today' }}
          </button>
        </div>
        <TaskList
          :tasks="overdueTasks"
          empty-copy="No overdue tasks. Nice work."
          :highlight-danger="true"
          @edit="openTask"
          @toggle="onToggleComplete"
        />
      </div>
    </section>

    <TaskPlannerDialog
      v-if="showPlanner"
      :open="showPlanner"
      :task="selectedTask"
      :date="selectedTask?.date || todayKey"
      :edit-mode="!!selectedTask"
      @close="closeTaskDialog"
      @saved="handleTaskSaved"
    />
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { ElMessage } from 'element-plus'

import GuestBanner from '@/components/GuestBanner.vue'
import SetupPrompt from '@/components/SetupPrompt.vue'
import TaskPlannerDialog from '@/components/TaskPlannerDialog.vue'
import TaskList from '@/components/TaskList.vue'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useTasks } from '@/composables/useTasks'
import { auth, db } from '@/firebase/init'
import { toLocalDateKey } from '@/utils/dateHelper'

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const router = useRouter()

const { addTask, allTasks, moveTasks, refreshAllTasks, toggleComplete, getTaskPlannedDate } = useTasks()

const checkingAuth = ref(true)
const showSetup = ref(false)
const quickTaskTitle = ref('')
const quickTaskDate = ref(toLocalDateKey(new Date()))
const savingQuickTask = ref(false)
const movingOverdue = ref(false)
const showPlanner = ref(false)
const selectedTask = ref(null)

const todayKey = computed(() => toLocalDateKey(new Date()))

function normalizeTask(task) {
  const date = getTaskPlannedDate(task) || todayKey.value
  return {
    ...task,
    date,
    createdAt: task?.createdAt?.toMillis?.() || task?.createdAt || 0,
    completed: !!task?.completed,
    title: task?.title || 'Untitled task',
  }
}

function sortTasks(list = []) {
  return [...list].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.createdAt || 0) - (b.createdAt || 0)
  })
}

const sortedTasks = computed(() => sortTasks((allTasks.value || []).map(normalizeTask)))

const todayTasks = computed(() => sortedTasks.value.filter((t) => t.date === todayKey.value))
const comingUpTasks = computed(() => sortedTasks.value.filter((t) => t.date > todayKey.value))
const overdueTasks = computed(() => sortedTasks.value.filter((t) => t.date < todayKey.value))

const currentFocusTask = computed(() => {
  const todayPending = todayTasks.value.find((t) => !t.completed)
  if (todayPending) return todayPending
  const overduePending = overdueTasks.value.find((t) => !t.completed)
  if (overduePending) return overduePending
  return comingUpTasks.value.find((t) => !t.completed) || null
})

const greetingHeadline = computed(() => {
  const name = authStore?.user?.displayName?.split?.(' ')?.[0] || 'friend'
  const hour = dayjs().hour()
  if (hour < 4) return `Rest well, ${name}`
  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
})

async function submitQuickAdd() {
  const title = quickTaskTitle.value.trim()
  if (!title) {
    ElMessage.warning('Add a task title first')
    return
  }
  const date = quickTaskDate.value || todayKey.value
  savingQuickTask.value = true
  try {
    await addTask({ title, date, source: 'dashboard_quick_add' })
    quickTaskTitle.value = ''
    quickTaskDate.value = todayKey.value
    ElMessage.success('Task added')
  } catch (err) {
    console.warn('Quick add failed', err)
    ElMessage.error('Could not add task right now')
  } finally {
    savingQuickTask.value = false
  }
}

async function moveOverdueToToday() {
  if (!overdueTasks.value.length) return
  movingOverdue.value = true
  const payload = overdueTasks.value.map((t) => ({ id: t.id, previousDate: t.date }))
  let moved = 0
  try {
    const res = await moveTasks(payload, todayKey.value, { status: 'pending', completed: false })
    moved = Array.isArray(res) ? res.length : payload.length
  } catch (err) {
    const results = await Promise.allSettled(
      payload.map((entry) => moveTasks([entry], todayKey.value, { status: 'pending', completed: false })),
    )
    moved = results.filter((r) => r.status === 'fulfilled').length
  } finally {
    const failed = payload.length - moved
    if (moved) {
      ElMessage.success(`${moved} moved${failed ? `, ${failed} skipped` : ''}`)
    } else {
      ElMessage.warning('Some tasks could not be rescheduled')
    }
    movingOverdue.value = false
    await refreshAllTasks(true).catch(() => {})
  }
}

async function onToggleComplete(task) {
  try {
    await toggleComplete(task)
  } catch {
    ElMessage.error('Unable to update task')
  }
}

function openTask(task = null) {
  selectedTask.value = task ? { ...task } : null
  showPlanner.value = true
}

function closeTaskDialog() {
  showPlanner.value = false
  selectedTask.value = null
}

async function handleTaskSaved() {
  await refreshAllTasks(true).catch(() => {})
  closeTaskDialog()
}

function handleSetupDone() {
  showSetup.value = false
  try {
    localStorage.setItem('pcai_setup_done', '1')
  } catch {
    /* noop */
  }
}

function redirectToLogin() {
  router.push('/login?redirect=/dashboard')
}

const unsubscribe = ref(null)
const authDetach = ref(null)

function detachTaskListener() {
  if (unsubscribe.value) {
    try {
      unsubscribe.value()
    } catch {}
    unsubscribe.value = null
  }
}

function attachTaskListener(user) {
  detachTaskListener()
  if (!user || !workspaceStore.activeWorkspaceId) {
    allTasks.value = []
    return
  }
  const tasksRef = collection(db, 'tasks')
  const q = query(tasksRef, where('workspaceId', '==', workspaceStore.activeWorkspaceId))
  unsubscribe.value = onSnapshot(
    q,
    (snapshot) => {
      const next = snapshot.docs.map((docSnap) => normalizeTask({ id: docSnap.id, ...(docSnap.data() || {}) }))
      allTasks.value = next
    },
    (error) => {
      console.warn('Task listener error', error?.message || error)
    },
  )
}

watch(
  () => workspaceStore.activeWorkspaceId,
  () => {
    attachTaskListener(auth.currentUser)
  },
)

onMounted(async () => {
  await refreshAllTasks(true).catch(() => {})
  try {
    const seen = localStorage.getItem('pcai_setup_done') === '1'
    const tz = localStorage.getItem('user_timezone')
    const needsTz = !tz || tz === 'UTC'
    const needsPerm = typeof Notification !== 'undefined' && Notification.permission !== 'granted'
    showSetup.value = !seen && (needsTz || needsPerm)
  } catch {
    showSetup.value = false
  }

  authDetach.value = onAuthStateChanged(auth, (user) => {
    checkingAuth.value = false
    attachTaskListener(user)
  })
})

onUnmounted(() => {
  detachTaskListener()
  if (authDetach.value) {
    try {
      authDetach.value()
    } catch {}
    authDetach.value = null
  }
})
</script>
