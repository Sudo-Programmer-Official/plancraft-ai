<template>
  <PcSheet :open="open" title="More" @update:open="$emit('update:open', $event)">
    <div class="pc-more">
      <button v-if="!isPro" type="button" class="pc-more__pro" @click="$emit('upgrade')">
        <Gem :size="20" aria-hidden="true" />
        <span class="pc-more__pro-text">
          <strong>PlanCraft Pro</strong>
          <span>Deeper planning, AI Actions and advanced reminders</span>
        </span>
        <ChevronRight :size="18" aria-hidden="true" />
      </button>

      <section v-for="group in MORE_GROUPS" :key="group.label" class="pc-more__group" :aria-labelledby="`more-${group.label}`">
        <h3 :id="`more-${group.label}`" class="pc-more__heading">{{ group.label }}</h3>
        <button
          v-for="item in group.items"
          :key="item.key"
          type="button"
          class="pc-more__item"
          :class="{ 'pc-more__item--mobile-only': item.mobileOnly }"
          @click="$emit('navigate', item)"
        >
          <component :is="item.icon" :size="18" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </button>
      </section>

      <section class="pc-more__group" aria-labelledby="more-app">
        <h3 id="more-app" class="pc-more__heading">App</h3>
        <div class="pc-more__appearance">
          <span id="more-appearance">Appearance</span>
          <div class="pc-more__segmented" role="radiogroup" aria-labelledby="more-appearance">
            <button
              v-for="option in THEME_OPTIONS"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="preference === option.value"
              @click="setThemePreference(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <button v-if="canInstall" type="button" class="pc-more__item" @click="$emit('install')">
          <Download :size="18" aria-hidden="true" />
          <span>Install app</span>
        </button>
        <button v-for="item in ACCOUNT_NAV" :key="item.key" type="button" class="pc-more__item" @click="$emit('navigate', item)">
          <component :is="item.icon" :size="18" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </button>
      </section>
    </div>
  </PcSheet>
</template>

<script setup>
import { ChevronRight, Download, Gem } from 'lucide-vue-next'
import PcSheet from './PcSheet.vue'
import { ACCOUNT_NAV, MORE_GROUPS } from '../navigation.js'
import { useTheme } from '../useTheme.js'

// Everything that doesn't need to be permanently visible: secondary
// destinations, Creator/Leader modes, appearance, install and account.
defineProps({
  open: { type: Boolean, default: false },
  isPro: { type: Boolean, default: false },
  // Set by the layout when a PWA install prompt (or iOS hint) is available.
  canInstall: { type: Boolean, default: false },
})
defineEmits(['update:open', 'navigate', 'upgrade', 'install'])

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]
const { preference, setThemePreference } = useTheme()
</script>

<style scoped>
.pc-more {
  display: grid;
  gap: var(--pc-space-5);
}

.pc-more__pro {
  display: flex;
  align-items: center;
  gap: var(--pc-space-3);
  width: 100%;
  padding: var(--pc-space-3) var(--pc-space-4);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-lg);
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
  font-family: var(--pc-font);
  text-align: left;
  cursor: pointer;
}

.pc-more__pro-text {
  display: grid;
  flex: 1;
  gap: 2px;
  color: var(--pc-text);
  font-size: var(--pc-text-body);
}

.pc-more__pro-text span {
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
}

.pc-more__group {
  display: grid;
  gap: 2px;
}

.pc-more__heading {
  margin: 0 0 var(--pc-space-1);
  padding: 0 var(--pc-space-2);
  color: var(--pc-text-subtle);
  font-size: var(--pc-text-caption);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pc-more__item {
  display: flex;
  align-items: center;
  gap: var(--pc-space-3);
  min-height: 2.75rem;
  padding: 0 var(--pc-space-2);
  border: none;
  border-radius: var(--pc-radius-sm);
  background: none;
  color: var(--pc-text);
  font-family: var(--pc-font);
  font-size: var(--pc-text-body);
  text-align: left;
  cursor: pointer;
}

.pc-more__item svg {
  color: var(--pc-text-muted);
}

.pc-more__item:hover {
  background: var(--pc-surface-hover);
}

@media (min-width: 768px) {
  .pc-more__item--mobile-only {
    display: none;
  }
}

.pc-more__appearance {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pc-space-3);
  min-height: 2.75rem;
  padding: 0 var(--pc-space-2);
  font-size: var(--pc-text-body);
}

.pc-more__segmented {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius-sm);
  background: var(--pc-surface-2);
}

.pc-more__segmented button {
  padding: var(--pc-space-1) var(--pc-space-3);
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--pc-text-muted);
  font-family: var(--pc-font);
  font-size: var(--pc-text-small);
  cursor: pointer;
}

.pc-more__segmented button[aria-checked='true'] {
  background: var(--pc-surface);
  color: var(--pc-text);
  font-weight: 600;
  box-shadow: var(--pc-shadow-sm);
}
</style>
