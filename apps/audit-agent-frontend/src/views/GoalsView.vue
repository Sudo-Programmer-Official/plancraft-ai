<template>
  <div class="min-h-screen w-full space-y-8 p-4 sm:p-8">
    <section class="rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-900/80 via-purple-900/60 to-slate-900/70 p-6 sm:p-8">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="space-y-3 text-white">
          <p class="text-sm uppercase tracking-[0.3em] text-fuchsia-200/80">PlanCraft Goal Hub</p>
          <h1 class="text-3xl font-bold sm:text-4xl">Design the person you’re becoming</h1>
          <p class="text-base text-slate-200/90">
            Link every reminder to a higher intention. Visualize milestones, celebrate momentum, and let PlanCraft generate
            the next set of moves for you.
          </p>
          <div class="flex flex-wrap gap-3 text-sm text-slate-200/80">
            <span class="rounded-full border border-white/20 px-3 py-1">Voice-ready</span>
            <span class="rounded-full border border-white/20 px-3 py-1">AI milestone builder</span>
            <span class="rounded-full border border-white/20 px-3 py-1">Task linked</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <button
            type="button"
            class="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:bg-white/20"
            @click="openCreateModal"
          >
            + Set a Goal
          </button>
          <GoalProgress :value="overallProgress" :size="120" label="Portfolio" />
        </div>
      </div>
    </section>

    <section
      v-if="summary && !summaryLoading"
      class="grid gap-4 lg:grid-cols-4"
    >
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Active goals</p>
        <p class="mt-2 text-3xl font-semibold text-white">{{ summaryTotals.activeGoals || 0 }}</p>
        <p class="text-sm text-slate-300/80">Out of {{ summaryTotals.totalGoals || 0 }}</p>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Avg progress</p>
        <p class="mt-2 text-3xl font-semibold text-white">{{ Math.round((summaryTotals.avgProgress || 0) * 100) }}%</p>
        <p class="text-sm text-slate-300/80">Across all goals</p>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">Completed</p>
        <p class="mt-2 text-3xl font-semibold text-white">{{ summaryTotals.completedGoals || 0 }}</p>
        <p class="text-sm text-slate-300/80">Lifetime wins</p>
      </div>
      <div class="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4">
        <p class="text-xs uppercase tracking-[0.3em] text-fuchsia-200/80">Reflection</p>
        <p class="mt-2 text-3xl font-semibold text-white">
          {{ reflectionMeta.due ? 'Due' : 'Logged' }}
        </p>
        <p class="text-sm text-fuchsia-100/80">
          {{ reflectionMeta.lastEntryAt ? new Date(reflectionMeta.lastEntryAt).toLocaleDateString() : 'No entry yet' }}
        </p>
      </div>
    </section>

    <section
      v-if="(summaryCategories.length || summaryUpcoming.length) && !summaryLoading"
      class="grid gap-6 lg:grid-cols-2"
    >
      <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Categories</h3>
          <span class="text-xs text-slate-400">Avg progress</span>
        </div>
        <div class="mt-4 space-y-3">
          <div
            v-for="category in summaryCategories"
            :key="category.name"
            class="space-y-1"
          >
            <div class="flex items-center justify-between text-sm text-slate-200/90">
              <span>{{ category.name }}</span>
              <span>{{ Math.round((category.avgProgress || 0) * 100) }}%</span>
            </div>
            <div class="h-2 rounded-full bg-slate-800/80">
              <div
                class="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 transition-all"
                :style="{ width: `${Math.min(100, Math.round((category.avgProgress || 0) * 100))}%` }"
              />
            </div>
          </div>
          <p v-if="!summaryCategories.length" class="text-sm text-slate-400">We’ll analyze categories once you add more goals.</p>
        </div>
      </div>
      <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Upcoming milestones</h3>
          <span class="text-xs text-slate-400">Soonest first</span>
        </div>
        <ul class="mt-4 space-y-3 text-sm text-slate-200/90">
          <li
            v-for="milestone in summaryUpcoming"
            :key="`${milestone.goalId}-${milestone.milestoneId}`"
            class="rounded-2xl border border-white/10 bg-black/30 p-3"
          >
            <p class="font-semibold text-white">{{ milestone.title }}</p>
            <p class="text-xs text-slate-400">{{ milestone.goalTitle }}</p>
            <p class="text-xs text-slate-300">
              Due {{ new Date(milestone.deadline).toLocaleDateString() }} · {{ milestone.daysRemaining }} days left
            </p>
          </li>
          <li v-if="!summaryUpcoming.length" class="text-slate-400">No upcoming milestones yet.</li>
        </ul>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <GoalList
        :goals="goals"
        :loading="loading"
        :selected-goal-id="selectedGoalId"
        @select="selectGoal"
      >
        <template #empty>
          <p class="text-base font-medium text-white">No goals yet</p>
          <p class="mt-2 text-sm text-slate-300">Every task can ladder up to a vision. Start with one goal.</p>
          <button
            type="button"
            class="mt-4 rounded-full bg-fuchsia-500/80 px-6 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500"
            @click="openCreateModal"
          >
            Create your first goal
          </button>
        </template>
      </GoalList>
      <GoalDetail
        v-if="selectedGoal"
        :goal="selectedGoal"
        @toggle-milestone="handleMilestoneToggle"
        @refresh="refreshSelected"
        @close="selectedGoalId = null"
      />
      <div v-else class="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-slate-300">
        Select a goal to see milestones, insights, and linked tasks.
      </div>
    </div>

    <section class="grid gap-6 lg:grid-cols-2">
      <div class="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Weekly reflection</h3>
          <span
            class="text-xs rounded-full px-3 py-1"
            :class="[
              reflectionMeta.due
                ? 'bg-fuchsia-600/30 text-fuchsia-100'
                : 'bg-emerald-500/20 text-emerald-100'
            ]"
          >
            {{ reflectionMeta.due ? 'Due' : 'Logged' }}
          </span>
        </div>
        <p class="mt-2 text-sm text-slate-300">{{ reflectionMeta.prompt || 'What energized you this week?' }}</p>
        <textarea
          v-model="reflectionInput"
          rows="4"
          class="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
          placeholder="Capture a quick insight..."
        />
        <p v-if="reflectionError" class="mt-2 text-sm text-red-300">{{ reflectionError }}</p>
        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="rounded-full bg-fuchsia-500/80 px-5 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
            :disabled="reflectionSubmitting"
            @click="submitReflection"
          >
            {{ reflectionSubmitting ? 'Saving...' : 'Save reflection' }}
          </button>
        </div>
      </div>
      <div class="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Recent reflections</h3>
          <button
            type="button"
            class="text-xs text-slate-300 hover:text-white"
            @click="loadReflections"
          >
            Refresh
          </button>
        </div>
        <ul class="mt-4 space-y-3 text-sm text-slate-200/80">
          <li
            v-for="entry in reflections"
            :key="entry.id"
            class="rounded-2xl border border-white/10 bg-black/30 p-3"
          >
            <p class="text-white">{{ entry.text }}</p>
            <p class="mt-2 text-xs text-slate-400">{{ entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '' }}</p>
          </li>
          <li v-if="!reflections.length && !reflectionsLoading" class="text-slate-400">No reflections saved yet.</li>
          <li v-if="reflectionsLoading" class="text-slate-400">Loading reflections...</li>
        </ul>
      </div>
    </section>

    <transition name="fade">
      <div
        v-if="showCreate"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
        @click.self="closeCreateModal"
      >
        <form
          class="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl"
          @submit.prevent="submitGoal"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-fuchsia-200/80">New goal</p>
              <h2 class="text-2xl font-semibold text-white">What future are we architecting?</h2>
            </div>
            <button type="button" class="text-sm text-slate-300 hover:text-white" @click="closeCreateModal">Close</button>
          </div>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <label class="text-sm text-slate-200">
              Title
              <input v-model="form.title" type="text" required class="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none" />
            </label>
            <label class="text-sm text-slate-200">
              Category
              <input v-model="form.category" type="text" placeholder="Health, Career..." class="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none" />
            </label>
            <label class="sm:col-span-2 text-sm text-slate-200">
              Description
              <textarea v-model="form.description" rows="3" class="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none" />
            </label>
            <label class="text-sm text-slate-200">
              Target Date
              <input v-model="form.targetDate" type="date" class="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none" />
            </label>
            <label class="text-sm text-slate-200">
              Motivation
              <input v-model="form.motivationNote" type="text" placeholder="Why this matters" class="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white focus:outline-none" />
            </label>
          </div>

          <div class="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-white">Milestones</p>
              <div class="flex items-center gap-3 text-xs text-slate-200">
                <label class="inline-flex items-center gap-2">
                  <input v-model="form.useAiMilestones" type="checkbox" class="accent-fuchsia-400" /> Use AI
                </label>
                <button type="button" class="rounded-full border border-white/30 px-3 py-1" @click="generateMilestones" :disabled="aiLoading">
                  {{ aiLoading ? 'Thinking...' : 'Suggest' }}
                </button>
              </div>
            </div>
            <div v-if="!form.milestones.length" class="text-sm text-slate-300">AI will craft milestones once you save, or you can add your own below.</div>
            <ul v-else class="space-y-2 text-sm text-slate-100">
              <li
                v-for="(milestone, index) in form.milestones"
                :key="milestone.id || index"
                class="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2"
              >
                <span>{{ milestone.title }}</span>
                <button type="button" class="text-xs text-slate-400 hover:text-white" @click="removeMilestone(index)">Remove</button>
              </li>
            </ul>
            <div class="flex gap-2">
              <input
                v-model="milestoneDraft"
                type="text"
                placeholder="Add custom milestone"
                class="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none"
              />
              <button type="button" class="rounded-xl bg-white/20 px-3 py-2 text-sm font-medium text-white" @click="addMilestoneDraft">
                Add
              </button>
            </div>
          </div>

          <p v-if="createError" class="mt-4 text-sm text-red-300">{{ createError }}</p>

          <div class="mt-6 flex items-center justify-end gap-3">
            <button type="button" class="rounded-full border border-white/20 px-5 py-2 text-sm text-slate-200" @click="closeCreateModal">
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-full bg-fuchsia-500/80 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:bg-fuchsia-500"
              :disabled="submitting"
            >
              {{ submitting ? 'Creating...' : 'Save Goal' }}
            </button>
          </div>
        </form>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import GoalList from '@/components/goals/GoalList.vue'
import GoalDetail from '@/components/goals/GoalDetail.vue'
import GoalProgress from '@/components/goals/GoalProgress.vue'
import { useAuthStore } from '@/stores/authStore'
import {
  createGoal,
  listGoals,
  suggestMilestones,
  updateGoal,
  fetchGoalSummary,
  createGoalReflection,
  listGoalReflections,
} from '@/services/goalService'

const authStore = useAuthStore()
const goals = ref([])
const loading = ref(true)
const submitting = ref(false)
const aiLoading = ref(false)
const selectedGoalId = ref(null)
const showCreate = ref(false)
const createError = ref('')
const milestoneDraft = ref('')
const summary = ref(null)
const summaryLoading = ref(true)
const reflections = ref([])
const reflectionsLoading = ref(true)
const reflectionInput = ref('')
const reflectionSubmitting = ref(false)
const reflectionError = ref('')

const form = reactive({
  title: '',
  description: '',
  category: '',
  targetDate: '',
  motivationNote: '',
  useAiMilestones: true,
  milestones: [],
})

const selectedGoal = computed(() => goals.value.find((goal) => (goal.goalId || goal.id) === selectedGoalId.value) || null)
const overallProgress = computed(() => {
  if (!goals.value.length) return 0
  const sum = goals.value.reduce((acc, goal) => acc + (goal.progress || 0), 0)
  return sum / goals.value.length
})
const summaryTotals = computed(() => summary.value?.totals || {})
const summaryCategories = computed(() => summary.value?.categories || [])
const summaryUpcoming = computed(() => summary.value?.upcomingMilestones || [])
const reflectionMeta = computed(() => summary.value?.reflection || {})

function openCreateModal() {
  createError.value = ''
  showCreate.value = true
}

function closeCreateModal() {
  showCreate.value = false
  Object.assign(form, {
    title: '',
    description: '',
    category: '',
    targetDate: '',
    motivationNote: '',
    useAiMilestones: true,
    milestones: [],
  })
  milestoneDraft.value = ''
}

function selectGoal(goal) {
  selectedGoalId.value = goal.goalId || goal.id
}

async function loadGoals() {
  try {
    loading.value = true
    const userId = authStore.user?.uid
    const data = await listGoals(userId)
    goals.value = data
    if (data.length) {
      selectedGoalId.value = data[0].goalId || data[0].id
    }
  } catch (err) {
    console.error('Failed to load goals', err)
  } finally {
    loading.value = false
  }
}

async function loadSummary() {
  try {
    summaryLoading.value = true
    summary.value = await fetchGoalSummary(authStore.user?.uid)
  } catch (err) {
    console.error('Failed to load goal summary', err)
  } finally {
    summaryLoading.value = false
  }
}

async function loadReflections() {
  try {
    reflectionsLoading.value = true
    reflections.value = await listGoalReflections(authStore.user?.uid, { limit: 6 })
  } catch (err) {
    console.error('Failed to load reflections', err)
  } finally {
    reflectionsLoading.value = false
  }
}

function mergeGoal(goal) {
  if (!goal) return
  const id = goal.goalId || goal.id
  const index = goals.value.findIndex((g) => (g.goalId || g.id) === id)
  if (index > -1) {
    goals.value.splice(index, 1, goal)
  } else {
    goals.value.unshift(goal)
  }
  if (!selectedGoalId.value) selectedGoalId.value = id
}

async function submitGoal() {
  try {
    submitting.value = true
    createError.value = ''
    const payload = {
      title: form.title,
      description: form.description,
      category: form.category,
      targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : null,
      motivationNote: form.motivationNote,
      useAiMilestones: form.useAiMilestones,
      milestones: form.milestones,
      generateTasksForMilestones: false,
    }
    const goal = await createGoal(payload, authStore.user?.uid)
    mergeGoal(goal)
    closeCreateModal()
    await Promise.allSettled([loadSummary()])
  } catch (err) {
    console.error('Failed to create goal', err)
    createError.value = err?.response?.data?.error || err?.message || 'Unable to create goal'
  } finally {
    submitting.value = false
  }
}

async function generateMilestones() {
  if (!form.title && !form.description) {
    createError.value = 'Add a title or description first so AI knows what to plan.'
    return
  }
  try {
    aiLoading.value = true
    const suggestions = await suggestMilestones(
      {
        title: form.title,
        description: form.description,
        category: form.category,
        targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : null,
      },
      authStore.user?.uid,
    )
    form.milestones = suggestions.map((item) => ({
      id: item.id || item.suggestionId,
      title: item.title,
      deadline: item.deadline,
      completed: false,
      autoGenerated: true,
    }))
  } catch (err) {
    console.error('Failed to generate milestones', err)
    createError.value = err?.response?.data?.error || 'Unable to generate milestones right now.'
  } finally {
    aiLoading.value = false
  }
}

function addMilestoneDraft() {
  if (!milestoneDraft.value.trim()) return
  form.milestones.push({ id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), title: milestoneDraft.value.trim(), completed: false })
  milestoneDraft.value = ''
}

function removeMilestone(index) {
  form.milestones.splice(index, 1)
}

async function handleMilestoneToggle(milestone) {
  if (!selectedGoal.value) return
  const updated = (selectedGoal.value.milestones || []).map((entry) =>
    entry.id === milestone.id ? { ...entry, completed: !milestone.completed } : entry,
  )
  try {
    const goal = await updateGoal(selectedGoal.value.goalId || selectedGoal.value.id, { milestones: updated }, authStore.user?.uid)
    mergeGoal(goal)
    await Promise.allSettled([loadSummary()])
  } catch (err) {
    console.error('Failed to update milestone', err)
  }
}

async function refreshSelected() {
  if (!selectedGoal.value) return
  try {
    const goal = await updateGoal(selectedGoal.value.goalId || selectedGoal.value.id, {}, authStore.user?.uid)
    mergeGoal(goal)
    await Promise.allSettled([loadSummary()])
  } catch (err) {
    console.error('Refresh failed', err)
  }
}

async function submitReflection() {
  if (!reflectionInput.value.trim()) {
    reflectionError.value = 'Share a quick note before saving.'
    return
  }
  try {
    reflectionSubmitting.value = true
    reflectionError.value = ''
    const entry = await createGoalReflection(
      {
        text: reflectionInput.value.trim(),
      },
      authStore.user?.uid,
    )
    reflections.value.unshift(entry)
    reflections.value = reflections.value.slice(0, 6)
    reflectionInput.value = ''
    await loadSummary()
  } catch (err) {
    console.error('Failed to save reflection', err)
    reflectionError.value = err?.response?.data?.error || err?.message || 'Unable to save reflection right now.'
  } finally {
    reflectionSubmitting.value = false
  }
}

watch(
  () => authStore.user?.uid,
  (uid) => {
    if (!uid) return
    loadGoals()
    loadSummary()
    loadReflections()
  },
  { immediate: true },
)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
