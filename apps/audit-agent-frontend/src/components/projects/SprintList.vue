<template>
  <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-[11px] uppercase tracking-[0.25em] text-slate-400">Sprints</p>
        <h3 class="text-xl font-semibold text-white">Cadence</h3>
      </div>
      <button
        class="px-4 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:border-indigo-400/60 transition"
        :disabled="loading"
        @click="$emit('create')"
      >
        New sprint
      </button>
    </div>

    <div v-if="loading" class="text-sm text-slate-300">Loading sprints…</div>
    <div v-else-if="!sprints.length" class="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-slate-200">
      No sprints yet. Create one to start tracking execution rhythm.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="sprint in sprints"
        :key="sprint.id"
        class="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h4 class="text-lg font-semibold text-white">{{ sprint.name }}</h4>
          <p class="text-sm text-slate-300">
            {{ formatDate(sprint.startDate) }} – {{ formatDate(sprint.endDate) }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-3 py-1 rounded-full text-xs border" :class="badgeClass(sprint)">
            {{ statusLabel(sprint) }}
          </span>
          <button
            v-if="!sprint.startDate"
            class="text-xs px-3 py-1.5 rounded-lg border border-indigo-300/60 text-indigo-100 hover:bg-indigo-500/10 transition"
            @click="$emit('start', sprint)"
          >
            Start
          </button>
          <button
            v-else-if="!sprint.endDate"
            class="text-xs px-3 py-1.5 rounded-lg border border-emerald-300/60 text-emerald-100 hover:bg-emerald-500/10 transition"
            @click="$emit('complete', sprint)"
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import dayjs from 'dayjs'

defineProps({
  sprints: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

defineEmits(['create', 'start', 'complete'])

function formatDate(value) {
  if (!value) return 'TBD'
  return dayjs(value).format('MMM D')
}

function statusLabel(sprint) {
  if (!sprint.startDate) return 'Planned'
  if (sprint.startDate && !sprint.endDate) return 'Active'
  return 'Completed'
}

function badgeClass(sprint) {
  if (!sprint.startDate) return 'border-slate-400/50 text-slate-200 bg-slate-500/10'
  if (sprint.startDate && !sprint.endDate) return 'border-amber-300/60 text-amber-100 bg-amber-500/10'
  return 'border-emerald-300/60 text-emerald-100 bg-emerald-500/10'
}
</script>
