<template>
  <div class="p-6 space-y-6">
    <header class="text-center">
      <h1 class="text-3xl font-bold">🌞 Good Morning</h1>
      <p class="text-gray-400">Here’s your focus for today, {{ todayDate }}</p>
    </header>

    <section class="bg-slate-900/70 border border-slate-800 p-5 rounded-xl shadow space-y-3">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="text-left">
          <p class="text-xs uppercase tracking-[0.25em] text-indigo-200/70">AI assist</p>
          <h2 class="text-lg font-semibold text-slate-100">Plan my day</h2>
          <p class="text-xs text-slate-400">Workspace-aware suggestions using your tasks and events.</p>
        </div>
        <button
          class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-60"
          :disabled="planning"
          @click="planMyDay"
        >
          <span v-if="planning" class="loader-dot" aria-hidden="true"></span>
          <span>{{ planning ? 'Generating…' : 'AI Plan My Day' }}</span>
        </button>
      </div>
      <div class="text-sm text-slate-200 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 space-y-2">
        <p v-if="planning" class="text-slate-400">Pulling tasks and events…</p>
        <ul v-else-if="aiPlanLines.length" class="space-y-1 list-disc list-inside marker:text-indigo-300">
          <li v-for="(line, idx) in aiPlanLines" :key="idx">{{ line }}</li>
        </ul>
        <p v-else class="text-slate-400">Let AI propose your top priorities and time blocks.</p>
        <p v-if="planError" class="text-rose-300 text-xs">{{ planError }}</p>
      </div>
    </section>

    <!-- Focus Tasks -->
    <section class="bg-indigo-600/20 p-6 rounded-xl shadow">
      <h2 class="text-xl font-semibold mb-3">🎯 Top 3 Focus Tasks</h2>
      <ul class="space-y-2">
        <li
          v-for="task in focusTasks"
          :key="task.id"
          class="bg-gray-900/60 p-3 rounded flex justify-between items-center"
        >
          <span>{{ task.text }}</span>
          <button @click="toggleComplete(task)" class="text-xs px-2 py-1 rounded bg-green-500">
            {{ task.completed ? 'Done' : 'Mark Done' }}
          </button>
        </li>
      </ul>
    </section>

    <!-- Other Tasks -->
    <section class="bg-gray-800/40 p-6 rounded-xl shadow">
      <h2 class="text-lg font-semibold mb-3">📋 Other Tasks Today</h2>
      <ul v-if="otherTasks.length" class="space-y-2">
        <li v-for="task in otherTasks" :key="task.id" class="bg-gray-700 p-3 rounded">
          {{ task.text }}
        </li>
      </ul>
      <p v-else class="text-gray-400 text-sm">No other tasks 🎉</p>
    </section>

    <!-- Progress -->
    <section class="bg-gray-900/60 p-6 rounded-xl shadow">
      <h2 class="text-lg font-semibold mb-3">📊 Progress</h2>
      <div class="w-full bg-gray-700 h-3 rounded">
        <div class="h-3 bg-indigo-500 rounded" :style="{ width: progressBarWidth }"></div>
      </div>
      <p class="mt-2 text-sm text-indigo-300">{{ completedCount }}/{{ totalCount }} tasks done</p>
      <p class="mt-1 text-xs italic text-gray-400">💡 Tip: Start with the smallest task to build momentum!</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useTasks } from '@/composables/useTasks'
import { askWorkspaceSummary } from '@/services/workspaceAiService'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { trackAISuggestionAccepted } from '@/services/analytics'

const todayDate = new Date().toLocaleDateString()
const { tasks, loadTasks, toggleComplete } = useTasks()
const workspaceStore = useWorkspaceStore()
const aiPlan = ref('')
const planError = ref('')
const planning = ref(false)

onMounted(() => {
  loadTasks().catch(() => {})
})

const focusTasks = computed(() => tasks.value.slice(0, 3))
const otherTasks = computed(() => tasks.value.slice(3))
const totalCount = computed(() => tasks.value.length)
const completedCount = computed(() => tasks.value.filter(t => t.completed).length)
const progressBarWidth = computed(() =>
  totalCount.value ? `${(completedCount.value / totalCount.value) * 100}%` : '0%'
)
const aiPlanLines = computed(() =>
  aiPlan.value
    ? aiPlan.value
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [],
)

async function planMyDay() {
  planning.value = true
  planError.value = ''
  try {
    const workspaceId = workspaceStore?.activeWorkspaceId || null
    if (!workspaceId) {
      planError.value = 'Select a workspace first.'
      planning.value = false
      return
    }
    const { answer } = await askWorkspaceSummary({
      workspaceId,
      question: 'Help me plan my day based on my tasks and events. Suggest the top 3 tasks and time blocks.',
    })
    aiPlan.value = answer || ''
    if (answer) {
      try { trackAISuggestionAccepted({ suggestion_type: 'daily_plan' }) } catch (_) {}
    }
  } catch (err) {
    planError.value =
      err?.response?.data?.error || err?.message || 'Failed to generate a plan for your day.'
  } finally {
    planning.value = false
  }
}
</script>

<style scoped>
.loader-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
