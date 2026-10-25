<template>
  <div class="intelligence-page min-h-full overflow-y-auto bg-pc-bg text-pc-text">
    <div class="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section class="overflow-hidden rounded-3xl border border-pc-border bg-pc-surface shadow-pc-card">
        <div class="relative p-5 sm:p-8">
          <div class="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
          <div class="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div class="max-w-3xl">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-pc-accent-border bg-pc-accent-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-pc-accent-text">
                  <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
                  Live desk
                </span>
                <span class="rounded-full border border-pc-border bg-pc-surface-2 px-3 py-1.5 text-xs text-pc-text-muted">Read-only research</span>
              </div>
              <h1 class="mt-4 text-3xl font-semibold tracking-tight text-pc-text sm:text-4xl">Your intelligence desk</h1>
              <p class="mt-3 max-w-2xl text-sm leading-6 text-pc-text-muted sm:text-base">
                Turn live external signals into a clearer next move for the goals already on your planner.
              </p>
            </div>
            <button
              type="button"
              :disabled="loading"
              class="inline-flex items-center justify-center gap-2 rounded-xl bg-[image:var(--pc-accent-fill)] px-4 py-2.5 text-sm font-semibold text-white shadow-pc-button transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              @click="refreshBrief"
            >
              <RefreshCw :size="16" :class="{ 'animate-spin': loading }" aria-hidden="true" />
              {{ loading ? 'Researching…' : 'Refresh brief' }}
            </button>
          </div>
        </div>

        <div class="border-t border-pc-border bg-pc-surface-2/60 p-5 sm:p-6">
          <div v-if="goals.length" class="mb-5 rounded-2xl border border-pc-accent-border bg-pc-accent-soft/50 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <span class="eyebrow">Watch a goal</span>
                <p class="mt-1 text-sm text-pc-text-muted">Research is filtered through the outcome you are trying to move forward.</p>
              </div>
              <label class="sm:w-80">
                <span class="sr-only">Choose a goal to watch</span>
                <select
                  v-model="selectedGoalId"
                  class="w-full rounded-xl border border-pc-border-strong bg-pc-surface px-3 py-2.5 text-sm font-medium text-pc-text outline-none focus:border-pc-accent"
                >
                  <option v-for="goal in goals" :key="goal.goalId || goal.id" :value="goal.goalId || goal.id">
                    {{ goal.title || 'Untitled goal' }}
                  </option>
                </select>
              </label>
            </div>
            <div v-if="selectedGoal" class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-pc-accent-text">
              <span class="font-semibold">{{ selectedGoal.title }}</span>
              <span v-if="selectedGoal.targetDate">Target {{ selectedGoal.targetDate }}</span>
              <span v-if="selectedGoal.category">{{ selectedGoal.category }}</span>
            </div>
          </div>
          <div v-else class="mb-5 rounded-2xl border border-dashed border-pc-border-strong bg-pc-surface px-4 py-3 text-sm text-pc-text-muted">
            Create a goal to turn this desk into a personalized watchlist. You can still explore the wider tech landscape below.
          </div>

          <div class="flex flex-col gap-4 lg:flex-row lg:items-end">
            <label class="min-w-0 flex-1">
              <span class="eyebrow">Ask the desk</span>
              <div class="mt-2 flex items-center gap-2 rounded-xl border border-pc-border-strong bg-pc-surface px-3 py-2.5 focus-within:border-pc-accent">
                <Search :size="17" class="shrink-0 text-pc-text-subtle" aria-hidden="true" />
                <input
                  v-model="question"
                  type="text"
                  maxlength="500"
                  class="min-w-0 flex-1 bg-transparent text-sm text-pc-text outline-none placeholder:text-pc-text-subtle"
                  :placeholder="selectedGoal ? 'What changed that could affect this goal?' : 'What is the best tech news today, and where is the money flowing?'"
                  @keyup.enter="refreshBrief"
                />
              </div>
            </label>
            <label class="lg:w-72">
              <span class="eyebrow">Your angle</span>
              <input
                v-model="interests"
                type="text"
                maxlength="300"
                class="mt-2 w-full rounded-xl border border-pc-border-strong bg-pc-surface px-3 py-2.5 text-sm text-pc-text outline-none placeholder:text-pc-text-subtle focus:border-pc-accent"
                placeholder="e.g. AI infra, dev tools, fintech"
                @keyup.enter="refreshBrief"
              />
            </label>
          </div>

          <div class="mt-5">
            <div class="flex items-center gap-2">
              <SlidersHorizontal :size="16" class="text-pc-text-subtle" aria-hidden="true" />
              <span class="eyebrow">Specialists in this brief</span>
            </div>
            <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <button
                v-for="agent in INTELLIGENCE_AGENTS"
                :key="agent.id"
                type="button"
                class="rounded-xl border px-3 py-3 text-left transition"
                :class="selectedAgentIds.includes(agent.id)
                  ? 'border-pc-accent bg-pc-accent-soft text-pc-accent-text'
                  : 'border-pc-border bg-pc-surface text-pc-text-muted hover:border-pc-border-strong hover:text-pc-text'"
                @click="toggleAgent(agent.id)"
              >
                <span class="flex items-center justify-between gap-2">
                  <span class="text-sm font-semibold">{{ agent.label }}</span>
                  <span
                    class="h-2.5 w-2.5 rounded-full"
                    :class="selectedAgentIds.includes(agent.id) ? 'bg-pc-accent' : 'bg-pc-border-strong'"
                    aria-hidden="true"
                  />
                </span>
                <span class="mt-1 block text-xs opacity-80">{{ agent.description }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {{ error }}
      </div>

      <section v-if="loading && !brief" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-64 animate-pulse rounded-3xl bg-pc-surface-2" />
      </section>

      <template v-if="brief">
        <section class="rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-pc-card sm:p-7">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="eyebrow">Editor’s brief</p>
              <h2 class="mt-2 text-2xl font-semibold tracking-tight text-pc-text">What deserves your attention</h2>
            </div>
            <span class="inline-flex items-center gap-1.5 self-start rounded-full border border-pc-border bg-pc-surface-2 px-3 py-1.5 text-xs text-pc-text-muted">
              <span class="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              {{ formatTime(brief.generatedAt) }}
            </span>
          </div>
          <p class="mt-5 whitespace-pre-line text-sm leading-7 text-pc-text sm:text-base">{{ brief.synthesis }}</p>
        </section>

        <section v-if="brief.suggestedTasks?.length" class="rounded-3xl border border-pc-accent-border bg-pc-accent-soft/40 p-5 shadow-pc-card sm:p-6">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="eyebrow text-pc-accent-text">Signal → action</p>
              <h2 class="mt-2 text-xl font-semibold text-pc-text">Suggested next moves</h2>
              <p class="mt-1 text-sm text-pc-text-muted">Nothing is added automatically. Approve the moves that belong on your planner.</p>
            </div>
            <span class="rounded-full border border-pc-accent-border bg-pc-surface px-3 py-1.5 text-xs text-pc-accent-text">{{ brief.suggestedTasks.length }} suggestions</span>
          </div>
          <div class="mt-5 grid gap-3 lg:grid-cols-2">
            <article v-for="task in brief.suggestedTasks" :key="`${task.title}-${task.date || 'open'}`" class="rounded-2xl border border-pc-border bg-pc-surface p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-sm font-semibold text-pc-text">{{ task.title }}</h3>
                  <p v-if="task.details" class="mt-2 text-sm leading-6 text-pc-text-muted">{{ task.details }}</p>
                  <p v-if="task.reason" class="mt-2 text-xs leading-5 text-pc-accent-text">Why it matters: {{ task.reason }}</p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-lg border border-pc-accent-border px-3 py-2 text-xs font-semibold text-pc-accent-text transition hover:bg-pc-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="addingTaskTitle === task.title || addedTaskTitles.includes(task.title)"
                  @click="addSuggestedTask(task)"
                >
                  {{ addedTaskTitles.includes(task.title) ? 'Added' : addingTaskTitle === task.title ? 'Adding…' : 'Add task' }}
                </button>
              </div>
              <p v-if="task.date" class="mt-3 text-xs text-pc-text-subtle">Suggested date: {{ task.date }}</p>
            </article>
          </div>
        </section>

        <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article
            v-for="agent in brief.agents || []"
            :key="agent.id"
            class="rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-pc-card sm:p-6"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="eyebrow">Specialist</p>
                <h3 class="mt-2 text-xl font-semibold text-pc-text">{{ agent.label }}</h3>
                <p class="mt-1 text-sm text-pc-text-muted">{{ agent.description }}</p>
              </div>
              <Sparkles :size="20" class="shrink-0 text-pc-accent" aria-hidden="true" />
            </div>
            <p class="mt-5 whitespace-pre-line text-sm leading-6 text-pc-text-muted">{{ agent.text }}</p>
            <div v-if="agent.sources?.length" class="mt-5 border-t border-pc-border pt-4">
              <p class="eyebrow">Sources</p>
              <div class="mt-2 grid gap-2">
                <a
                  v-for="source in agent.sources.slice(0, 5)"
                  :key="source.url"
                  :href="source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex min-w-0 items-center gap-1.5 text-xs text-pc-accent-text hover:underline"
                >
                  <span class="truncate">{{ source.title }}</span>
                  <ArrowUpRight :size="13" class="shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>
          </article>
        </section>

        <section v-if="brief.sources?.length" class="rounded-3xl border border-pc-border bg-pc-surface p-5 shadow-pc-card sm:p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="eyebrow">Traceability</p>
              <h2 class="mt-2 text-xl font-semibold text-pc-text">All sources consulted</h2>
            </div>
            <span class="rounded-full border border-pc-border bg-pc-surface-2 px-3 py-1.5 text-xs text-pc-text-muted">{{ brief.sources.length }} links</span>
          </div>
          <div class="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <a
              v-for="source in brief.sources"
              :key="source.url"
              :href="source.url"
              target="_blank"
              rel="noopener noreferrer"
              class="group flex min-w-0 items-center justify-between gap-2 rounded-xl border border-pc-border bg-pc-surface-2 px-3 py-2.5 text-xs text-pc-text-muted transition hover:border-pc-accent-border hover:text-pc-accent-text"
            >
              <span class="truncate">{{ source.title }}</span>
              <ArrowUpRight :size="14" class="shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
          </div>
        </section>
      </template>

      <section v-else-if="!loading" class="rounded-3xl border border-dashed border-pc-border-strong bg-pc-surface p-10 text-center shadow-pc-card">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pc-accent-soft text-2xl">🛰️</div>
        <h2 class="mt-5 text-xl font-semibold text-pc-text">Your live desk is ready</h2>
        <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-pc-text-muted">Choose the specialists you want, add your angle, and run a source-backed brief.</p>
        <button type="button" class="mt-5 rounded-xl bg-[image:var(--pc-accent-fill)] px-4 py-2.5 text-sm font-semibold text-white shadow-pc-button" @click="refreshBrief">Run first brief</button>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowUpRight, RefreshCw, Search, SlidersHorizontal, Sparkles } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { listGoals, updateGoal } from '@/services/goalService'
import { addTaskToFirebase } from '@/services/firebaseService'
import { fetchIntelligenceBrief, INTELLIGENCE_AGENTS } from '@/services/intelligenceService'

const STORAGE_KEY = 'plancraft-intelligence-preferences'
const defaultAgentIds = ['tech-news', 'capital-flows']

function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      agentIds: Array.isArray(saved.agentIds) && saved.agentIds.length ? saved.agentIds : defaultAgentIds,
      interests: typeof saved.interests === 'string' ? saved.interests : '',
      goalId: typeof saved.goalId === 'string' ? saved.goalId : '',
    }
  } catch {
    return { agentIds: defaultAgentIds, interests: '', goalId: '' }
  }
}

const savedPreferences = loadPreferences()
const authStore = useAuthStore()
const selectedAgentIds = ref(savedPreferences.agentIds)
const interests = ref(savedPreferences.interests)
const goals = ref([])
const selectedGoalId = ref(savedPreferences.goalId)
const question = ref('')
const brief = ref(null)
const loading = ref(false)
const error = ref('')
const addingTaskTitle = ref('')
const addedTaskTitles = ref([])
const selectedGoal = computed(() => goals.value.find((goal) => (goal.goalId || goal.id) === selectedGoalId.value) || null)

watch([selectedAgentIds, interests, selectedGoalId], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      agentIds: selectedAgentIds.value,
      interests: interests.value,
      goalId: selectedGoalId.value,
    }))
  } catch {
    // Preference persistence is optional; the brief still works in private mode.
  }
}, { deep: true })

async function loadGoals() {
  const userId = authStore.user?.uid
  if (!userId) return
  try {
    goals.value = await listGoals(userId)
    const goalIds = goals.value.map((goal) => goal.goalId || goal.id).filter(Boolean)
    if (!goalIds.includes(selectedGoalId.value)) selectedGoalId.value = goalIds[0] || ''
  } catch (err) {
    // The desk remains useful as an exploration surface if goals are unavailable.
    console.warn('[Intelligence] goals unavailable', err?.message || err)
  }
}

function toggleAgent(id) {
  if (selectedAgentIds.value.includes(id)) {
    if (selectedAgentIds.value.length === 1) return
    selectedAgentIds.value = selectedAgentIds.value.filter((candidate) => candidate !== id)
    return
  }
  selectedAgentIds.value = [...selectedAgentIds.value, id].slice(0, 4)
}

function formatTime(value) {
  if (!value) return 'Just now'
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
  } catch {
    return 'Just now'
  }
}

async function refreshBrief() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    brief.value = await fetchIntelligenceBrief({
      agentIds: selectedAgentIds.value,
      question: question.value,
      interests: interests.value,
      goalContext: selectedGoal.value
        ? {
            title: selectedGoal.value.title,
            description: selectedGoal.value.description,
            category: selectedGoal.value.category,
            targetDate: selectedGoal.value.targetDate,
          }
        : null,
    })
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || 'The intelligence desk could not complete this brief.'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

async function addSuggestedTask(task) {
  const title = String(task?.title || '').trim()
  if (!title || addingTaskTitle.value || addedTaskTitles.value.includes(title)) return
  addingTaskTitle.value = title
  try {
    const savedTask = await addTaskToFirebase({
      title,
      details: [task.details, task.reason ? `Why it matters: ${task.reason}` : ''].filter(Boolean).join('\n\n'),
      date: task.date || null,
      category: selectedGoal.value?.category || 'Work',
      source: 'intelligence',
      goalId: selectedGoalId.value || null,
      goalTitle: selectedGoal.value?.title || null,
      goalTargetDate: selectedGoal.value?.targetDate || null,
    })
    let goalLinked = true
    const goalId = selectedGoalId.value || null
    if (goalId && savedTask?.id && selectedGoal.value) {
      try {
        const linkedTasks = Array.isArray(selectedGoal.value.linkedTasks)
          ? selectedGoal.value.linkedTasks
          : []
        if (!linkedTasks.includes(savedTask.id)) {
          const updatedGoal = await updateGoal(
            goalId,
            { linkedTasks: [...linkedTasks, savedTask.id], source: 'intelligence' },
            authStore.user?.uid,
          )
          if (updatedGoal) {
            goals.value = goals.value.map((goal) => (
              (goal.goalId || goal.id) === goalId ? updatedGoal : goal
            ))
          }
        }
      } catch (linkError) {
        goalLinked = false
        console.warn('[Intelligence] task created but goal link failed', linkError?.message || linkError)
      }
    }
    addedTaskTitles.value = [...addedTaskTitles.value, title]
    ElMessage[goalLinked ? 'success' : 'warning'](
      goalLinked ? 'Task added to your planner' : 'Task added, but could not link it to the goal',
    )
  } catch (err) {
    ElMessage.error(err?.message || 'Could not add that task')
  } finally {
    addingTaskTitle.value = ''
  }
}

onMounted(async () => {
  await loadGoals()
  await refreshBrief()
})
</script>
