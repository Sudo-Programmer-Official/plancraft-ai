<template>
  <nav class="pc-tab-bar" :class="{ 'pc-tab-bar--preview': preview }" aria-label="Primary">
    <template v-for="item in TABS" :key="item.key">
      <button
        v-if="item.key === 'capture'"
        type="button"
        class="pc-tab-bar__capture"
        aria-label="Add task"
        @click="$emit('capture')"
      >
        <Plus :size="24" aria-hidden="true" />
      </button>
      <button
        v-else
        type="button"
        class="pc-tab-bar__item"
        :aria-current="active === item.key ? 'page' : undefined"
        @click="$emit('select', item.key)"
      >
        <span class="pc-tab-bar__icon">
          <component :is="item.icon" :size="22" aria-hidden="true" />
          <span v-if="item.key === 'inbox' && inboxCount" class="pc-tab-bar__badge">
            {{ inboxCount > 9 ? '9+' : inboxCount }}
            <span class="pc-sr-only">items need attention</span>
          </span>
        </span>
        <span class="pc-tab-bar__label">{{ item.label }}</span>
      </button>
    </template>
  </nav>
</template>

<script setup>
import { Ellipsis, Plus } from 'lucide-vue-next'
import { PRIMARY_NAV } from '../navigation.js'
import '../tokens.css'

// Mobile navigation built from PRIMARY_NAV: the "capture" entry becomes the
// centre + (quick-capture sheet); the first three other destinations sit
// around it and everything else lives under More.
const destinations = PRIMARY_NAV.filter((item) => item.key !== 'capture').slice(0, 3)
const TABS = [
  ...destinations.slice(0, 2),
  { key: 'capture' },
  ...destinations.slice(2),
  { key: 'more', label: 'More', icon: Ellipsis },
]

defineProps({
  active: { type: String, default: 'today' },
  inboxCount: { type: Number, default: 0 },
  // Renders in-flow for the /design preview instead of fixed to the viewport.
  preview: { type: Boolean, default: false },
})
defineEmits(['select', 'capture'])
</script>

<style scoped>
.pc-tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--pc-z-nav);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  padding: var(--pc-space-2) var(--pc-space-2) calc(var(--pc-space-2) + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--pc-surface) 92%, transparent);
  backdrop-filter: saturate(160%) blur(16px);
  border-top: 1px solid var(--pc-border);
}

.pc-tab-bar--preview {
  position: relative;
  padding-bottom: var(--pc-space-2);
}

@media (min-width: 768px) {
  .pc-tab-bar:not(.pc-tab-bar--preview) {
    display: none;
  }
}

.pc-tab-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 2.75rem;
  padding: var(--pc-space-1) 0;
  border: none;
  background: none;
  color: var(--pc-text-subtle);
  font-family: var(--pc-font);
  cursor: pointer;
}

.pc-tab-bar__item[aria-current='page'] {
  color: var(--pc-accent-text);
}

.pc-tab-bar__icon {
  position: relative;
  display: inline-flex;
}

.pc-tab-bar__label {
  font-size: 0.6875rem;
  font-weight: 600;
}

.pc-tab-bar__badge {
  position: absolute;
  top: -4px;
  right: -8px;
  min-width: 1rem;
  height: 1rem;
  padding: 0 4px;
  border-radius: var(--pc-radius-full);
  background: var(--pc-accent);
  color: var(--pc-on-accent);
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1rem;
  text-align: center;
}

.pc-tab-bar__capture {
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: none;
  border-radius: var(--pc-radius-full);
  background: var(--pc-accent-fill);
  color: var(--pc-on-accent);
  box-shadow: var(--pc-shadow-sm);
  cursor: pointer;
  transition: transform var(--pc-duration-fast) var(--pc-ease);
}

.pc-tab-bar__capture:hover {
  background: var(--pc-accent-fill-hover);
}

.pc-tab-bar__capture:active {
  transform: scale(0.94);
}
</style>
