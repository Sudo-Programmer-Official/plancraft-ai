<template>
  <Transition name="pc-reminder">
    <section
      v-if="open"
      class="pc-theme pc-reminder"
      role="status"
      aria-live="polite"
      :aria-label="`Reminder: ${title}`"
    >
      <span class="pc-reminder__icon" aria-hidden="true"><Bell :size="20" /></span>

      <div class="pc-reminder__body">
        <p class="pc-reminder__eyebrow">Reminder · {{ when }}</p>
        <p class="pc-reminder__title">{{ title }}</p>
        <p v-if="detail" class="pc-reminder__detail">{{ detail }}</p>

        <div class="pc-reminder__actions">
          <PcButton v-if="canFocus" variant="primary" size="sm" :icon="Play" @click="$emit('focus')">Focus</PcButton>
          <PcButton :variant="canFocus ? 'secondary' : 'primary'" size="sm" :loading="snoozing" @click="$emit('snooze')">
            {{ snoozeLabel }}
          </PcButton>
        </div>
      </div>

      <PcIconButton class="pc-reminder__close" :icon="X" label="Dismiss reminder" size="sm" @click="open = false" />
    </section>
  </Transition>
</template>

<script setup>
import { Bell, Play, X } from 'lucide-vue-next'
import PcButton from './PcButton.vue'
import PcIconButton from './PcIconButton.vue'
import '../tokens.css'

// In-app "reminder due" state: what the user sees when a reminder fires while
// PlanCraft is open. Focus is the one primary action; snoozing is secondary.
defineProps({
  title: { type: String, required: true },
  when: { type: String, default: 'Now' },
  detail: { type: String, default: '' },
  snoozeLabel: { type: String, default: 'Snooze 10 min' },
  canFocus: { type: Boolean, default: true },
  snoozing: { type: Boolean, default: false },
})
defineEmits(['focus', 'snooze'])

const open = defineModel('open', { type: Boolean, default: false })
</script>

<style scoped>
.pc-reminder {
  position: fixed;
  top: calc(env(safe-area-inset-top) + var(--pc-space-3));
  left: 50%;
  z-index: calc(var(--pc-z-overlay) - 1);
  display: flex;
  align-items: flex-start;
  gap: var(--pc-space-3);
  width: min(calc(100% - 2 * var(--pc-space-4)), 26rem);
  padding: var(--pc-space-4);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-lg);
  background: var(--pc-surface);
  box-shadow: var(--pc-shadow-overlay);
  transform: translateX(-50%);
}

.pc-reminder__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--pc-radius-md);
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
}

.pc-reminder__body {
  flex: 1;
  min-width: 0;
}

.pc-reminder__eyebrow {
  margin: 0;
  color: var(--pc-accent-text);
  font-size: var(--pc-text-caption);
  font-weight: 600;
}

.pc-reminder__title {
  margin: var(--pc-space-1) 0 0;
  color: var(--pc-text);
  font-size: var(--pc-text-body-lg);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.pc-reminder__detail {
  margin: 2px 0 0;
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.pc-reminder__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pc-space-2);
  margin-top: var(--pc-space-3);
}

.pc-reminder__close {
  flex-shrink: 0;
  margin: calc(-1 * var(--pc-space-1)) calc(-1 * var(--pc-space-1)) 0 0;
}

.pc-reminder-enter-active,
.pc-reminder-leave-active {
  transition:
    opacity var(--pc-duration) var(--pc-ease),
    transform var(--pc-duration) var(--pc-ease);
}

.pc-reminder-enter-from,
.pc-reminder-leave-to {
  opacity: 0;
  transform: translate(-50%, -0.75rem);
}
</style>
