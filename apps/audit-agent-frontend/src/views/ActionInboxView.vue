<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#0f172a] to-[#0b1020] text-slate-100">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <header class="space-y-2 animate-fade-in">
        <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/80">Inbox</p>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <h1 class="text-2xl sm:text-3xl font-semibold">Review what matters</h1>
            <p class="max-w-3xl text-sm text-slate-300/90">
              Submit notes once. PlanCraft detects eligible actions automatically, prioritizes what matters today, and
              leaves final confirmation in your hands.
            </p>
          </div>
          <div class="inline-flex rounded-xl border border-white/10 bg-slate-900/50 p-1 text-xs">
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 transition"
              :class="!showAdvancedInbox ? 'bg-indigo-500/90 text-white' : 'text-slate-300 hover:text-white'"
              @click="setInboxMode(false)"
            >
              Simple
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 transition"
              :class="showAdvancedInbox ? 'bg-indigo-500/90 text-white' : 'text-slate-300 hover:text-white'"
              @click="setInboxMode(true)"
            >
              Advanced
            </button>
          </div>
        </div>
      </header>

      <section class="grid gap-4">
        <div class="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-indigo-500/10 to-slate-900/50 p-5 shadow-lg">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-2 min-w-0">
              <p class="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Today’s Runway</p>
              <h2 class="text-2xl font-semibold text-white">{{ todayHeading }}</h2>
              <p class="text-sm text-slate-300">
                {{ todaySummary }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/60"
              @click="router.push('/today')"
            >
              Open Today view
            </button>
          </div>

          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span class="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1 text-cyan-100">
              {{ pendingTodayTasks.length }} pending today
            </span>
            <span class="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-emerald-100">
              {{ completedTodayCount }} completed
            </span>
            <span
              v-if="todayScheduledCount"
              class="rounded-full border border-indigo-300/30 bg-indigo-500/10 px-3 py-1 text-indigo-100"
            >
              {{ todayScheduledCount }} with time blocks
            </span>
          </div>

          <div v-if="pendingTodayPreview.length" class="mt-5 space-y-3">
            <article
              v-for="task in pendingTodayPreview"
              :key="task.id"
              class="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="min-w-0 space-y-1">
                <p class="truncate text-sm font-semibold text-white">{{ taskTitle(task) }}</p>
                <div class="flex flex-wrap gap-2 text-[11px] text-slate-300">
                  <span
                    class="rounded-full border px-2.5 py-1"
                    :class="task.scheduledTime ? 'border-cyan-300/25 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-white/5 text-slate-300'"
                  >
                    {{ taskTiming(task) }}
                  </span>
                  <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-200">
                    {{ task.category || 'Other' }}
                  </span>
                  <span
                    v-if="task.priority != null"
                    class="rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-2.5 py-1 text-fuchsia-100"
                  >
                    Priority {{ task.priority }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                :disabled="taskBusyId === task.id"
                @click="toggleTaskDone(task)"
              >
                {{ taskBusyId === task.id ? 'Updating…' : 'Mark done' }}
              </button>
            </article>
            <p v-if="pendingTodayTasks.length > pendingTodayPreview.length" class="text-xs text-slate-400">
              {{ pendingTodayTasks.length - pendingTodayPreview.length }} more task{{ pendingTodayTasks.length - pendingTodayPreview.length === 1 ? '' : 's' }} waiting in Today view.
            </p>
          </div>

          <div
            v-else
            class="mt-5 rounded-xl border border-dashed border-white/15 bg-slate-950/35 px-4 py-6 text-sm text-slate-300"
          >
            Nothing is committed for today yet. The inbox suggestions below are your best candidates to turn into real tasks.
          </div>
        </div>
      </section>

      <ActionInboxPanel
        title="Eligible actions waiting for review"
        description="Napkin, Journal, voice, and resurfacing logic all feed the same inbox. Confirm what belongs and ignore what does not."
        empty-message="No suggestions are waiting. Submit a note from Napkin or Journal and the system will add eligible tasks here automatically."
        :compact="!showAdvancedInbox"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ActionInboxPanel from '@/components/ActionInboxPanel.vue'
import { useDayClock } from '@/composables/useDayClock'
import { useTasks } from '@/composables/useTasks'
import { toLocalDateKey } from '@/utils/dateHelper'

const router = useRouter()
const INBOX_MODE_KEY = 'pcai:inbox:view-mode:v1'
const showAdvancedInbox = ref(false)
const { now } = useDayClock()
const { allTasks, refreshAllTasks, toggleComplete, getTaskPlannedDate } = useTasks()
const taskBusyId = ref('')

const todayKey = computed(() => toLocalDateKey(now.value || new Date()))
const todayHeading = computed(() =>
  `Your committed work for ${ (now.value || new Date()).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) }`,
)

const todaysTasks = computed(() => {
  const key = todayKey.value
  return [...(allTasks.value || [])]
    .filter((task) => (getTaskPlannedDate(task) || key) === key)
    .sort((a, b) => {
      if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1
      const aScheduled = a?.scheduledTime ? new Date(a.scheduledTime).getTime() : Number.POSITIVE_INFINITY
      const bScheduled = b?.scheduledTime ? new Date(b.scheduledTime).getTime() : Number.POSITIVE_INFINITY
      if (aScheduled !== bScheduled) return aScheduled - bScheduled
      const aPriority = Number.isFinite(a?.priority) ? a.priority : -Infinity
      const bPriority = Number.isFinite(b?.priority) ? b.priority : -Infinity
      if (aPriority !== bPriority) return bPriority - aPriority
      return Number(b?.createdAt || 0) - Number(a?.createdAt || 0)
    })
})

const pendingTodayTasks = computed(() =>
  todaysTasks.value.filter((task) => !task?.completed && task?.status !== 'completed'),
)
const pendingTodayPreview = computed(() => pendingTodayTasks.value.slice(0, 4))
const completedTodayCount = computed(() =>
  todaysTasks.value.filter((task) => task?.completed || task?.status === 'completed').length,
)
const todayScheduledCount = computed(() => todaysTasks.value.filter((task) => !!task?.scheduledTime).length)
const todaySummary = computed(() => {
  if (!todaysTasks.value.length) return 'No tasks are committed yet, so the inbox suggestions below are your best place to start.'
  if (!pendingTodayTasks.value.length) return `You cleared today’s committed work. Use the inbox below to pull the next best task forward.`
  return `You have ${pendingTodayTasks.value.length} task${pendingTodayTasks.value.length === 1 ? '' : 's'} already committed for today. Clear those first, then confirm anything new from the inbox.`
})

function taskTitle(task) {
  return task?.title || task?.text || 'Untitled task'
}

function taskTiming(task) {
  if (task?.scheduledTime) {
    const date = new Date(task.scheduledTime)
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
  }
  return 'Any time today'
}

async function toggleTaskDone(task) {
  if (!task?.id) return
  taskBusyId.value = task.id
  try {
    await toggleComplete(task)
    await refreshAllTasks()
  } finally {
    taskBusyId.value = ''
  }
}

function setInboxMode(next) {
  showAdvancedInbox.value = !!next
  try {
    localStorage.setItem(INBOX_MODE_KEY, showAdvancedInbox.value ? 'advanced' : 'simple')
  } catch {
    /* noop */
  }
}

onMounted(() => {
  try {
    const saved = localStorage.getItem(INBOX_MODE_KEY)
    if (saved === 'advanced') showAdvancedInbox.value = true
    else if (saved === 'simple') showAdvancedInbox.value = false
  } catch {
    /* noop */
  }
  refreshAllTasks().catch((err) => {
    console.warn('[ActionInboxView] today task load failed', err?.message || err)
  })
})
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.45s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
