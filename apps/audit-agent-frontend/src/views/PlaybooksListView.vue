<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <section class="rounded-3xl border border-white/10 bg-slate-950/35 p-6 shadow-xl backdrop-blur-xl">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.35em] text-indigo-300/70">Playbooks</p>
          <h1 class="mt-2 text-3xl font-bold text-white">Action Playbooks</h1>
          <p class="mt-2 text-sm text-indigo-100/75">
            Create repeatable multi-step workflows and track them like a calm checklist.
          </p>
        </div>
        <RouterLink
          to="/playbooks/new"
          class="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
        >
          + New Playbook
        </RouterLink>
      </div>
    </section>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="n in 6"
        :key="n"
        class="h-48 rounded-3xl border border-white/10 bg-white/5 animate-pulse"
      ></div>
    </div>

    <section
      v-else-if="!playbooks.length"
      class="rounded-3xl border border-dashed border-white/15 bg-slate-950/25 p-10 text-center text-indigo-100/75"
    >
      <div class="text-4xl">📚</div>
      <h2 class="mt-4 text-2xl font-semibold text-white">No playbooks yet</h2>
      <p class="mt-2 text-sm">Start with a morning checklist, launch workflow, or meeting prep routine.</p>
      <RouterLink
        to="/playbooks/new"
        class="mt-6 inline-flex rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
      >
        Create your first playbook
      </RouterLink>
    </section>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="playbook in playbooks"
        :key="playbook.id"
        :to="`/playbooks/${playbook.id}`"
        class="rounded-3xl border border-white/10 bg-slate-950/35 p-5 shadow-xl backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-fuchsia-300/30"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.25em] text-indigo-300/70">Playbook</p>
            <h2 class="mt-2 text-xl font-semibold text-white">{{ playbook.name }}</h2>
          </div>
          <span class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-indigo-100/80">
            {{ progressPercent(playbook.progress) }}%
          </span>
        </div>

        <div class="mt-5 space-y-3">
          <div class="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-sky-400"
              :style="{ width: `${progressPercent(playbook.progress)}%` }"
            ></div>
          </div>
          <div class="flex items-center justify-between text-sm text-indigo-100/75">
            <span>{{ playbook.progress?.completed || 0 }} completed</span>
            <span>{{ playbook.progress?.total || 0 }} total steps</span>
          </div>
          <p class="text-xs text-indigo-100/50">
            Updated {{ formatDate(playbook.updatedAt || playbook.createdAt) }}
          </p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { RouterLink } from 'vue-router'
import { fetchPlaybooks } from '@/services/playbookService'

const loading = ref(true)
const playbooks = ref([])

function progressPercent(progress = {}) {
  const total = Number(progress?.total || 0)
  const completed = Number(progress?.completed || 0)
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)))
}

function formatDate(value) {
  if (!value) return 'just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'just now'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

async function loadPlaybooks() {
  loading.value = true
  try {
    playbooks.value = await fetchPlaybooks()
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || err?.message || 'Failed to load playbooks')
  } finally {
    loading.value = false
  }
}

onMounted(loadPlaybooks)
</script>
