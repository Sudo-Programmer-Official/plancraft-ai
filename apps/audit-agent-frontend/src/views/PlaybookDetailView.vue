<template>
  <div class="app-page-shell">
    <div class="app-page-frame mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section class="rounded-3xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-xl">
        <div v-if="loading" class="space-y-3">
          <div class="h-6 w-40 rounded bg-white/10 animate-pulse"></div>
          <div class="h-10 w-72 rounded bg-white/10 animate-pulse"></div>
          <div class="h-2 w-full rounded bg-white/10 animate-pulse"></div>
        </div>
        <template v-else-if="playbook">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/70">Playbook</p>
              <h1 class="mt-2 text-3xl font-bold text-white">{{ playbook.name }}</h1>
              <p class="mt-2 text-sm text-indigo-100/75">
                {{ playbook.progress?.completed || 0 }} of {{ playbook.progress?.total || 0 }} steps complete
              </p>
            </div>
            <RouterLink
              to="/playbooks"
              class="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Back to Playbooks
            </RouterLink>
          </div>

          <div class="mt-5 space-y-3">
            <div class="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-sky-400"
                :style="{ width: `${progressPercent(playbook.progress)}%` }"
              ></div>
            </div>
            <div class="flex items-center justify-between text-xs text-indigo-100/60">
              <span>Started {{ formatDate(playbook.createdAt) }}</span>
              <span>Updated {{ formatDate(playbook.updatedAt) }}</span>
            </div>
          </div>
        </template>
      </section>

      <section class="rounded-3xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-xl">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white">Steps</h2>
          <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-indigo-100/75">
            {{ steps.length }} total
          </span>
        </div>

        <div v-if="!loading && !steps.length" class="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-indigo-100/70">
          No steps yet. Add one below.
        </div>

        <div class="mt-4 space-y-3">
          <label
            v-for="step in steps"
            :key="step.id"
            class="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <input
              :checked="step.completed"
              type="checkbox"
              class="mt-1 h-5 w-5 rounded border-white/20 bg-slate-950/60 text-fuchsia-500 focus:ring-fuchsia-400"
              @change="toggleStep(step)"
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-white" :class="{ 'line-through text-indigo-100/45': step.completed }">
                  {{ step.title }}
                </p>
                <span
                  v-if="step.dueDate"
                  class="rounded-full border border-white/10 bg-slate-950/40 px-2 py-0.5 text-[11px] text-indigo-100/70"
                >
                  Due {{ formatDate(step.dueDate, true) }}
                </span>
              </div>
              <p class="mt-1 text-xs text-indigo-100/50">Step {{ Number(step.order || 0) + 1 }}</p>
            </div>
          </label>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-xl">
        <h2 class="text-xl font-semibold text-white">Add Step</h2>
        <div class="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
          <label class="space-y-2">
            <span class="text-sm text-indigo-100">Title</span>
            <input
              v-model.trim="newStepTitle"
              type="text"
              class="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white placeholder:text-indigo-100/35 focus:border-fuchsia-300/50 focus:outline-none"
              placeholder="e.g. Draft launch email"
            />
          </label>
          <label class="space-y-2">
            <span class="text-sm text-indigo-100">Due date</span>
            <input
              v-model="newStepDueDate"
              type="date"
              class="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-white focus:border-fuchsia-300/50 focus:outline-none"
            />
          </label>
          <button
            type="button"
            class="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-60"
            :disabled="savingStep"
            @click="createStep"
          >
            {{ savingStep ? 'Adding…' : 'Add Step' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  addPlaybookStep,
  fetchPlaybookDetail,
  updatePlaybookStep,
} from '@/services/playbookService'

const route = useRoute()
const loading = ref(true)
const savingStep = ref(false)
const playbook = ref(null)
const steps = ref([])
const newStepTitle = ref('')
const newStepDueDate = ref('')

function progressPercent(progress = {}) {
  const total = Number(progress?.total || 0)
  const completed = Number(progress?.completed || 0)
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)))
}

function formatDate(value, dateOnly = false) {
  if (!value) return 'just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'just now'
  return date.toLocaleString(undefined, dateOnly ? { month: 'short', day: 'numeric' } : {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

async function loadDetail() {
  loading.value = true
  try {
    const payload = await fetchPlaybookDetail(route.params.id)
    playbook.value = payload?.playbook || null
    steps.value = payload?.steps || []
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to load playbook')
  } finally {
    loading.value = false
  }
}

async function toggleStep(step) {
  try {
    const payload = await updatePlaybookStep(route.params.id, step.id, {
      completed: !step.completed,
    })
    playbook.value = payload?.playbook || playbook.value
    steps.value = payload?.steps || steps.value
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to update step')
  }
}

async function createStep() {
  const title = String(newStepTitle.value || '').trim()
  if (!title) {
    ElMessage.warning('Add a step title first')
    return
  }

  savingStep.value = true
  try {
    const payload = await addPlaybookStep(route.params.id, {
      title,
      dueDate: newStepDueDate.value || null,
    })
    playbook.value = payload?.playbook || playbook.value
    steps.value = payload?.steps || steps.value
    newStepTitle.value = ''
    newStepDueDate.value = ''
    ElMessage.success('Step added')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to add step')
  } finally {
    savingStep.value = false
  }
}

onMounted(loadDetail)
</script>
