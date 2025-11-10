<template>
  <aside
    v-if="goal"
    class="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/70 via-slate-900/40 to-black/40 p-6 shadow-2xl"
  >
    <header class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-widest text-slate-400">Focus Goal</p>
        <h2 class="text-2xl font-semibold text-white">{{ goal.title }}</h2>
        <p class="text-sm text-slate-300/90">{{ goal.description || 'Stay consistent and celebrate small wins.' }}</p>
      </div>
      <button
        type="button"
        class="rounded-full border border-white/20 px-3 py-1 text-sm text-slate-200 hover:border-white/60"
        @click="$emit('close')"
      >
        Close
      </button>
    </header>

    <section class="mt-6 grid gap-6 md:grid-cols-[160px_1fr]">
      <GoalProgress :value="goal.progress || 0" label="Progress" />
      <div class="grid gap-4 text-sm text-slate-200/90 sm:grid-cols-2">
        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p class="text-xs uppercase tracking-widest text-slate-400">Category</p>
          <p class="text-lg font-semibold">{{ goal.category || 'General' }}</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p class="text-xs uppercase tracking-widest text-slate-400">Target Date</p>
          <p class="text-lg font-semibold">{{ formatTarget(goal.targetDate) }}</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p class="text-xs uppercase tracking-widest text-slate-400">Milestones</p>
          <p class="text-lg font-semibold">{{ completedMilestones }}/{{ goal.milestones?.length || 0 }}</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p class="text-xs uppercase tracking-widest text-slate-400">Linked Tasks</p>
          <p class="text-lg font-semibold">{{ goal.linkedTasks?.length || 0 }}</p>
        </div>
      </div>
    </section>

    <section v-if="goal.motivationNote" class="mt-6 rounded-2xl border border-white/10 bg-fuchsia-500/10 p-4 text-sm text-fuchsia-100/90">
      <p class="text-xs uppercase tracking-widest text-fuchsia-200/80">Why it matters</p>
      <p class="mt-1">{{ goal.motivationNote }}</p>
    </section>

    <section class="mt-8 space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-white">Milestones</h3>
        <button
          type="button"
          class="text-sm text-fuchsia-300 hover:text-fuchsia-100"
          @click="$emit('refresh')"
        >
          Sync
        </button>
      </div>
      <ul class="space-y-3">
        <li
          v-for="milestone in goal.milestones || []"
          :key="milestone.id"
          class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
        >
          <input
            type="checkbox"
            class="h-4 w-4 accent-fuchsia-400"
            :checked="milestone.completed"
            @change="$emit('toggle-milestone', milestone)"
          />
          <div>
            <p class="font-medium text-white">{{ milestone.title }}</p>
            <p class="text-xs text-slate-300">{{ formatTarget(milestone.deadline) }}</p>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="goal.linkedTasks?.length" class="mt-8">
      <h3 class="text-base font-semibold text-white">Linked Tasks</h3>
      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        <span
          v-for="taskId in goal.linkedTasks"
          :key="taskId"
          class="rounded-full border border-white/20 px-3 py-1 text-slate-200"
        >
          {{ taskId }}
        </span>
      </div>
    </section>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import GoalProgress from '@/components/goals/GoalProgress.vue'

const props = defineProps({
  goal: { type: Object, default: null },
})

defineEmits(['close', 'toggle-milestone', 'refresh'])

const completedMilestones = computed(() => {
  if (!props.goal?.milestones) return 0
  return props.goal.milestones.filter((m) => m?.completed).length
})

function formatTarget(targetDate) {
  if (!targetDate) return 'TBD'
  const date = new Date(targetDate)
  if (Number.isNaN(date.getTime())) return targetDate
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}
</script>
