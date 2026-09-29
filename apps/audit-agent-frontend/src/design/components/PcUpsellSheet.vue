<template>
  <PcSheet :open="open" :title="title" @update:open="$emit('update:open', $event)">
    <div class="pc-upsell">
      <p class="pc-upsell__body">{{ body }}</p>
      <ul class="pc-upsell__list">
        <li v-for="benefit in benefits" :key="benefit">
          <Check :size="16" aria-hidden="true" />
          <span>{{ benefit }}</span>
        </li>
      </ul>
    </div>
    <template #footer>
      <div class="pc-upsell__actions">
        <PcButton variant="primary" size="lg" block @click="$emit('upgrade')">Try Pro</PcButton>
        <PcButton variant="ghost" block @click="$emit('update:open', false)">Not now</PcButton>
      </div>
    </template>
  </PcSheet>
</template>

<script setup>
import { Check } from 'lucide-vue-next'
import PcSheet from './PcSheet.vue'
import PcButton from './PcButton.vue'

// Contextual premium moment (e.g. free AI Actions used up) instead of a
// permanent upgrade banner.
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Keep PlanCraft working with you' },
  body: { type: String, default: '' },
  benefits: {
    type: Array,
    default: () => ['Deeper planning', 'Unlimited AI Actions', 'Advanced reminders'],
  },
})
defineEmits(['update:open', 'upgrade'])
</script>

<style scoped>
.pc-upsell {
  display: grid;
  gap: var(--pc-space-4);
}

.pc-upsell__body {
  margin: 0;
  color: var(--pc-text-muted);
  line-height: 1.5;
}

.pc-upsell__list {
  display: grid;
  gap: var(--pc-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.pc-upsell__list li {
  display: flex;
  align-items: center;
  gap: var(--pc-space-2);
}

.pc-upsell__list svg {
  color: var(--pc-accent-text);
}

.pc-upsell__actions {
  display: grid;
  gap: var(--pc-space-2);
}
</style>
