<template>
  <button
    :type="type"
    class="pc-button"
    :class="[`pc-button--${variant}`, `pc-button--${size}`, { 'pc-button--block': block }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="pc-button__spinner" aria-hidden="true"></span>
    <component :is="icon" v-else-if="icon" class="pc-button__icon" :size="size === 'sm' ? 16 : 18" aria-hidden="true" />
    <span class="pc-button__label"><slot /></span>
  </button>
</template>

<script setup>
import '../tokens.css'

// Rule: one `primary` per screen or context; `secondary` for the one
// intelligent action; everything else lives behind a PcMenu.
defineProps({
  variant: {
    type: String,
    default: 'secondary',
    validator: (value) => ['primary', 'secondary', 'ghost', 'danger'].includes(value),
  },
  size: { type: String, default: 'md', validator: (value) => ['sm', 'md', 'lg'].includes(value) },
  icon: { type: [Object, Function], default: null },
  type: { type: String, default: 'button' },
  block: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
</script>

<style scoped>
.pc-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--pc-space-2);
  border: 1px solid transparent;
  border-radius: var(--pc-radius-md);
  font-family: var(--pc-font);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--pc-duration-fast) var(--pc-ease),
    border-color var(--pc-duration-fast) var(--pc-ease),
    color var(--pc-duration-fast) var(--pc-ease);
}

.pc-button--sm {
  min-height: 2rem;
  padding: 0 var(--pc-space-3);
  font-size: var(--pc-text-small);
}

.pc-button--md {
  min-height: 2.5rem;
  padding: 0 var(--pc-space-4);
  font-size: var(--pc-text-body);
}

.pc-button--lg {
  min-height: 3rem;
  padding: 0 var(--pc-space-6);
  font-size: var(--pc-text-body-lg);
}

.pc-button--block {
  width: 100%;
}

.pc-button--primary {
  background: var(--pc-accent-fill);
  color: var(--pc-on-accent);
}

.pc-button--primary:hover:not(:disabled) {
  background: var(--pc-accent-fill-hover);
}

.pc-button--secondary {
  background: var(--pc-surface);
  border-color: var(--pc-border-strong);
  color: var(--pc-text);
}

.pc-button--secondary:hover:not(:disabled) {
  background: var(--pc-surface-hover);
}

.pc-button--ghost {
  background: transparent;
  color: var(--pc-text-muted);
}

.pc-button--ghost:hover:not(:disabled) {
  background: var(--pc-surface-hover);
  color: var(--pc-text);
}

.pc-button--danger {
  background: var(--pc-danger-soft);
  color: var(--pc-danger);
}

.pc-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pc-button__icon {
  flex-shrink: 0;
}

.pc-button__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--pc-radius-full);
  animation: pc-spin 0.7s linear infinite;
}

@keyframes pc-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
