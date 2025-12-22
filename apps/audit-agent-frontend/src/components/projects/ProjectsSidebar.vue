<template>
  <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-4 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-[11px] uppercase tracking-[0.25em] text-slate-400">Projects</p>
        <h2 class="text-lg font-semibold text-white">Execution</h2>
      </div>
      <button
        class="text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:border-indigo-400/60 transition"
        :disabled="loading"
        @click="$emit('refresh')"
      >
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <div v-if="!projects.length && !loading" class="text-sm text-slate-300">
      No projects yet.
    </div>

    <div v-else class="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-plan pr-1">
      <RouterLink
        v-for="project in projects"
        :key="project.id"
        :to="`/projects/${project.id}`"
        class="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:border-indigo-400/50 hover:bg-white/10 transition"
        :class="{ 'border-indigo-400/70 bg-indigo-500/10 shadow-inner': project.id === selectedId }"
      >
        <div class="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-lg">
          📁
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-white truncate">{{ project.name }}</p>
          <p class="text-xs text-slate-400 truncate">
            {{ project.description || 'No description' }}
          </p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
defineProps({
  projects: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  loading: { type: Boolean, default: false },
})

defineEmits(['refresh'])
</script>
