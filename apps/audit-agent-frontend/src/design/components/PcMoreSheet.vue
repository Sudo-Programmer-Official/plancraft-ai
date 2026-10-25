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

      <section v-for="group in visibleMoreGroups" :key="group.label" class="pc-more__group" :aria-labelledby="`more-${group.label}`">
        <h3 :id="`more-${group.label}`" class="pc-more__heading">{{ group.label }}</h3>
        <div v-for="item in group.items" :key="item.key" class="pc-more__item-wrap">
          <div class="pc-more__item-row">
            <button
              type="button"
              class="pc-more__item"
              :class="{ 'pc-more__item--mobile-only': item.mobileOnly }"
              @click="$emit('navigate', item)"
            >
              <component :is="item.icon" :size="18" aria-hidden="true" />
              <span>{{ item.label }}</span>
              <span v-if="item.premium" class="pc-more__premium-badge">Premium</span>
            </button>
            <button
              v-if="item.infoTitle"
              type="button"
              class="pc-more__info"
              :aria-label="`About ${item.label}`"
              :aria-expanded="expandedInfoKey === item.key"
              @click.stop="toggleInfo(item.key)"
            >
              <Info :size="16" aria-hidden="true" />
            </button>
          </div>
          <div v-if="expandedInfoKey === item.key" class="pc-more__info-card">
            <strong>{{ item.infoTitle }}</strong>
            <p>{{ item.infoSummary }}</p>
            <ul>
              <li v-for="bullet in item.infoBullets || []" :key="bullet">{{ bullet }}</li>
            </ul>
          </div>
        </div>
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

      <div class="pc-more__logout-area">
        <button type="button" class="pc-more__logout" @click="$emit('logout')">
          <LogOut :size="18" aria-hidden="true" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  </PcSheet>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ChevronRight, Download, Gem, Info, LogOut } from 'lucide-vue-next'
import PcSheet from './PcSheet.vue'
import { ACCOUNT_NAV, MORE_GROUPS } from '../navigation.js'
import { useTheme } from '../useTheme.js'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'

// Everything that doesn't need to be permanently visible: secondary
// destinations, Creator/Leader modes, appearance, install and account.
defineProps({
  open: { type: Boolean, default: false },
  isPro: { type: Boolean, default: false },
  // Set by the layout when a PWA install prompt (or iOS hint) is available.
  canInstall: { type: Boolean, default: false },
})
defineEmits(['update:open', 'navigate', 'upgrade', 'install', 'logout'])

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]
const { preference, setThemePreference } = useTheme()
const featureFlagsStore = useFeatureFlagsStore()
const expandedInfoKey = ref('')
const visibleMoreGroups = computed(() => MORE_GROUPS
  .map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.featureFlag || featureFlagsStore.isEnabled(item.featureFlag)),
  }))
  .filter((group) => group.items.length))

function toggleInfo(key) {
  expandedInfoKey.value = expandedInfoKey.value === key ? '' : key
}

onMounted(() => {
  featureFlagsStore.ensureLoaded().catch(() => {})
})
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

.pc-more__item-row {
  display: flex;
  align-items: center;
  gap: var(--pc-space-1);
}

.pc-more__item-row .pc-more__item {
  flex: 1;
}

.pc-more__item svg {
  color: var(--pc-text-muted);
}

.pc-more__item:hover {
  background: var(--pc-surface-hover);
}

.pc-more__premium-badge {
  margin-left: auto;
  border: 1px solid var(--pc-accent-border);
  border-radius: 9999px;
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1;
  padding: 0.28rem 0.45rem;
  text-transform: uppercase;
}

.pc-more__info {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid transparent;
  border-radius: 9999px;
  background: transparent;
  color: var(--pc-text-subtle);
  cursor: pointer;
}

.pc-more__info:hover,
.pc-more__info:focus-visible {
  border-color: var(--pc-accent-border);
  background: var(--pc-accent-soft);
  color: var(--pc-accent-text);
  outline: none;
}

.pc-more__info-card {
  margin: 0 var(--pc-space-2) var(--pc-space-2) var(--pc-space-2);
  padding: var(--pc-space-3);
  border: 1px solid var(--pc-accent-border);
  border-radius: var(--pc-radius-md);
  background: var(--pc-accent-soft);
  color: var(--pc-text-muted);
  font-size: var(--pc-text-small);
  line-height: 1.45;
}

.pc-more__info-card strong {
  display: block;
  color: var(--pc-text);
}

.pc-more__info-card p {
  margin: var(--pc-space-1) 0 0;
}

.pc-more__info-card ul {
  display: grid;
  gap: 0.25rem;
  margin: var(--pc-space-2) 0 0;
  padding: 0;
  list-style: none;
}

.pc-more__info-card li {
  position: relative;
  padding-left: 1rem;
}

.pc-more__info-card li::before {
  position: absolute;
  left: 0;
  color: var(--pc-accent);
  content: '•';
  font-weight: 800;
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

.pc-more__logout-area {
  padding-top: var(--pc-space-3);
  border-top: 1px solid var(--pc-border);
}

.pc-more__logout {
  display: flex;
  align-items: center;
  gap: var(--pc-space-3);
  width: 100%;
  min-height: 2.875rem;
  padding: 0 var(--pc-space-3);
  border: 1px solid var(--pc-danger);
  border-radius: var(--pc-radius-md);
  background: var(--pc-danger-soft);
  color: var(--pc-danger);
  font-family: var(--pc-font);
  font-size: var(--pc-text-body);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.pc-more__logout:hover {
  background: var(--pc-danger);
  color: var(--pc-surface);
}

.pc-more__logout:active {
  transform: translateY(1px);
}
</style>
