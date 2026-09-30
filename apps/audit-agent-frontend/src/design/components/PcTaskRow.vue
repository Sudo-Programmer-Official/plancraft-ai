<template>
  <div class="pc-task-row" :class="{ 'pc-task-row--done': done }">
    <button
      type="button"
      role="checkbox"
      class="pc-task-row__check"
      :aria-checked="done"
      :aria-label="done ? `Mark “${title}” not done` : `Complete “${title}”`"
      @click="$emit('toggle')"
    >
      <CircleCheck v-if="done" :size="22" aria-hidden="true" />
      <Circle v-else :size="22" aria-hidden="true" />
    </button>

    <div
      class="pc-task-row__body"
      role="button"
      tabindex="0"
      :aria-label="`Open task: ${title}`"
      @click="$emit('open')"
      @keydown.enter="$emit('open')"
      @keydown.space.prevent="$emit('open')"
    >
      <div class="pc-task-row__line">
        <span class="pc-task-row__title">{{ title }}</span>
        <span v-if="time" class="pc-task-row__time">{{ time }}</span>
      </div>
      <div v-if="meta || $slots.action" class="pc-task-row__line pc-task-row__line--meta">
        <span class="pc-task-row__meta">{{ meta }}</span>
        <div v-if="$slots.action" class="pc-task-row__action" @click.stop>
          <slot name="action" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Circle, CircleCheck } from 'lucide-vue-next'
import '../tokens.css'

defineProps({
  title: { type: String, required: true },
  time: { type: String, default: '' },
  meta: { type: String, default: '' },
  done: { type: Boolean, default: false },
})
defineEmits(['toggle', 'open'])
</script>

<style scoped>
.pc-task-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--pc-space-3);
  padding: var(--pc-space-3) var(--pc-space-2);
  border-radius: var(--pc-radius-md);
  transition: background-color var(--pc-duration-fast) var(--pc-ease);
}

.pc-task-row:hover {
  background: var(--pc-surface-hover);
}

.pc-task-row__check {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex-shrink: 0;
  margin-top: -1px;
  padding: 0;
  border: none;
  background: none;
  color: var(--pc-text-subtle);
  cursor: pointer;
  border-radius: var(--pc-radius-full);
}

.pc-task-row__check:hover {
  color: var(--pc-accent-text);
}

.pc-task-row--done .pc-task-row__check {
  color: var(--pc-success);
}

.pc-task-row__body {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: var(--pc-space-1);
  cursor: pointer;
  border-radius: var(--pc-radius-sm);
}

.pc-task-row__body:focus-visible {
  outline: 2px solid var(--pc-focus-ring);
  outline-offset: 3px;
}

.pc-task-row__line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--pc-space-3);
}

.pc-task-row__line--meta {
  align-items: center;
}

.pc-task-row__title {
  min-width: 0;
  color: var(--pc-text);
  font-size: var(--pc-text-body);
  font-weight: 500;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pc-task-row--done .pc-task-row__title {
  color: var(--pc-text-subtle);
  text-decoration: line-through;
}

.pc-task-row__time {
  flex-shrink: 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  font-variant-numeric: tabular-nums;
}

.pc-task-row__meta {
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.pc-task-row__action {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
</style>
