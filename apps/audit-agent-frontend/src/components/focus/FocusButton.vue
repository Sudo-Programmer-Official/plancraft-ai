<template>
  <button
    v-if="task && !task.completed"
    type="button"
    class="focus-button"
    title="Start a focus session on this task"
    @click.stop="startFocus"
  >
    <span class="text-xs">▶ Focus<span v-if="recommendedMinutes"> {{ recommendedMinutes }}m</span></span>
  </button>
</template>

<script setup>
import { useFocusStore } from '@/stores/focusStore'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps({
  task: { type: Object, default: null },
  recommendedMinutes: { type: Number, default: null },
  autoStart: { type: Boolean, default: false },
})
const emit = defineEmits(['started'])

const focus = useFocusStore()
const authStore = useAuthStore()

function startFocus() {
  focus.open(props.task, authStore.user?.uid, {
    plannedMinutes: props.recommendedMinutes,
    autoStart: props.autoStart,
  })
  if (focus.session?.taskId === props.task?.id) emit('started', props.task)
}
</script>

<style scoped>
.focus-button {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 2rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid rgba(79, 70, 229, 0.26);
  border-radius: 0.6rem;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.focus-button:hover,
.focus-button:focus-visible {
  border-color: rgba(79, 70, 229, 0.48);
  background: #e0e7ff;
  outline: none;
}

.focus-button:active {
  transform: scale(0.97);
}
</style>
