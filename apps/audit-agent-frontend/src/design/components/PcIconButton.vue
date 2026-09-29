<template>
  <button type="button" class="pc-icon-button" :class="`pc-icon-button--${size}`" :aria-label="label" :title="label">
    <component :is="icon" :size="size === 'sm' ? 16 : 20" aria-hidden="true" />
  </button>
</template>

<script setup>
import '../tokens.css'

defineProps({
  icon: { type: [Object, Function], required: true },
  // Required: icon-only buttons need an accessible name.
  label: { type: String, required: true },
  size: { type: String, default: 'md', validator: (value) => ['sm', 'md'].includes(value) },
})
</script>

<style scoped>
.pc-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--pc-radius-sm);
  background: transparent;
  color: var(--pc-text-muted);
  cursor: pointer;
  transition:
    background-color var(--pc-duration-fast) var(--pc-ease),
    color var(--pc-duration-fast) var(--pc-ease);
}

.pc-icon-button--sm {
  width: 2rem;
  height: 2rem;
}

.pc-icon-button--md {
  width: 2.5rem;
  height: 2.5rem;
}

.pc-icon-button:hover {
  background: var(--pc-surface-hover);
  color: var(--pc-text);
}
</style>
