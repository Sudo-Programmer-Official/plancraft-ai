<template>
  <section>
    <div v-if="loading" class="w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-300">
      Syncing your goals...
    </div>
    <div
      v-else-if="!goals.length"
      class="w-full rounded-2xl border border-dashed border-white/20 bg-black/20 p-8 text-center text-slate-300"
    >
      <slot name="empty">
        <p class="text-base font-medium text-white">No goals yet</p>
        <p class="mt-2 text-sm text-slate-300">Start by creating a goal or ask the planner to do it via voice.</p>
      </slot>
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="goal in goals"
        :key="goal.goalId || goal.id"
        class="group rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-fuchsia-400/60 hover:bg-white/10 cursor-pointer"
        :class="{
          'ring-2 ring-fuchsia-400/40': (goal.goalId || goal.id) === selectedGoalId,
        }"
        @click="$emit('select', goal)"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-xs uppercase tracking-widest text-slate-300/80">{{ goal.category || 'General' }}</p>
            <h3 class="text-lg font-semibold leading-snug text-white">
              {{ goal.title }}
            </h3>
            <p class="text-xs text-slate-300/70">{{ formatTarget(goal.targetDate) }}</p>
          </div>
          <GoalProgress :value="goal.progress || 0" :size="72" :stroke="8" />
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-200/80">
          <div>
            <p class="text-[11px] uppercase tracking-widest text-slate-400">Milestones</p>
            <p class="font-semibold">{{ completedMilestones(goal) }}/{{ (goal.milestones || []).length }}</p>
          </div>
          <div>
            <p class="text-[11px] uppercase tracking-widest text-slate-400">Linked Tasks</p>
            <p class="font-semibold">{{ (goal.linkedTasks || []).length }}</p>
          </div>
        </div>
        <p v-if="goal.motivationNote" class="mt-3 text-sm text-slate-200/90">
          “{{ goal.motivationNote }}”
        </p>
      </article>
    </div>
  </section>
</template>

<script setup>
import GoalProgress from '@/components/goals/GoalProgress.vue'

const props = defineProps({
  goals: { type: Array, default: () => [] },
  selectedGoalId: { type: String, default: null },
  loading: { type: Boolean, default: false },
})

defineEmits(['select'])

function completedMilestones(goal) {
  if (!goal?.milestones || !goal.milestones.length) return 0
  return goal.milestones.filter((m) => m?.completed).length
}

function formatTarget(targetDate) {
  if (!targetDate) return 'No deadline yet'
  const date = new Date(targetDate)
  if (Number.isNaN(date.getTime())) return targetDate
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}
</script>
