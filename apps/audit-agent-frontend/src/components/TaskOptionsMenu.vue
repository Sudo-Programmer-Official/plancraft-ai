<template>
  <div class="task-options-menu relative inline-block text-left">
    <button
      type="button"
      class="task-options-trigger"
      aria-label="More task actions"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click.stop="open = !open"
    >
      <span aria-hidden="true">···</span>
    </button>
    <div v-if="open" class="task-options-popover absolute right-0 z-10 mt-1 w-40" role="menu">
      <button v-if="showFocus" type="button" @click.stop="startFocus" class="task-options-item" role="menuitem">
        Start Focus Session
      </button>
      <button type="button" @click.stop="edit" class="task-options-item" role="menuitem">Edit</button>
      <button type="button" @click.stop="toggleDone" class="task-options-item" role="menuitem">
        {{ task?.completed ? 'Mark as Pending' : 'Mark as Done' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const props = defineProps({
  task: { type: Object, required: true },
  showFocus: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'toggle', 'start-focus'])
const open = ref(false)
function edit(){ open.value=false; emit('edit', props.task) }
function toggleDone(){ open.value=false; emit('toggle', props.task) }
function startFocus(){ open.value=false; emit('start-focus', props.task) }
</script>

<style scoped>
.task-options-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 0.55rem;
  background: transparent;
  color: #64748b;
  font-size: 0.85rem;
  cursor: pointer;
}

.task-options-trigger:hover,
.task-options-trigger:focus-visible {
  background: #f1f5f9;
  color: #4f46e5;
  outline: none;
}

.task-options-popover {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 0.7rem;
  background: #ffffff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
}

.task-options-item {
  display: block;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 0;
  background: transparent;
  color: #334155;
  font-size: 0.78rem;
  text-align: left;
  cursor: pointer;
}

.task-options-item:hover,
.task-options-item:focus-visible {
  background: #f8fafc;
  color: #4f46e5;
  outline: none;
}
</style>
