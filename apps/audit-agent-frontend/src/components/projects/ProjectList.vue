<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-[11px] uppercase tracking-[0.25em] text-slate-400">Projects</p>
        <h1 class="text-2xl font-semibold text-white">Team execution</h1>
        <p class="text-sm text-slate-300">Organize projects without touching personal tasks.</p>
      </div>
      <div class="text-sm text-slate-300">
        {{ projects.length }} total
      </div>
    </div>

    <div v-if="loading" class="text-slate-300 text-sm">Loading projects…</div>
    <div v-else-if="!projects.length" class="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-slate-200">
      No projects yet. Create one from the backend or import later.
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <RouterLink
        v-for="project in projects"
        :key="project.id"
        :to="`/projects/${project.id}`"
        class="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-indigo-400/60 hover:bg-white/10 transition"
      >
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">{{ project.name }}</h3>
            <p class="text-sm text-slate-300 line-clamp-2">{{ project.description || 'No description yet.' }}</p>
          </div>
          <span
            class="text-xs px-2 py-1 rounded-full border"
            :class="project.isActive ? 'border-emerald-300/50 text-emerald-200 bg-emerald-500/10' : 'border-slate-500/50 text-slate-200 bg-slate-500/10'"
          >
            {{ project.isActive ? 'Active' : 'Paused' }}
          </span>
        </div>
        <div class="mt-4 flex items-center gap-3 text-xs text-slate-400">
          <span>Created {{ formatDate(project.createdAt) }}</span>
          <span class="w-1 h-1 rounded-full bg-slate-500"></span>
          <span>Updated {{ formatDate(project.updatedAt) }}</span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

defineProps({
  projects: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

function formatDate(value) {
  if (!value) return '—'
  return dayjs(value).format('MMM D, YYYY')
}
</script>
