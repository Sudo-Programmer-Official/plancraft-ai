<template>
  <div class="pc-theme pc-shell">
    <a href="#pc-main" class="pc-shell__skip">Skip to content</a>

    <PcSidebar
      class="pc-shell__sidebar"
      :active="active"
      :inbox-count="inboxCount"
      :user="user"
      :is-pro="isPro"
      @navigate="go"
      @more="moreOpen = true"
      @upgrade="$emit('upgrade')"
    />

    <main id="pc-main" class="pc-shell__main" tabindex="-1">
      <slot />
    </main>

    <PcTabBar :active="active" :inbox-count="inboxCount" @select="onTab" @capture="captureOpen = true" />

    <PcMoreSheet
      v-model:open="moreOpen"
      :is-pro="isPro"
      :can-install="canInstall"
      @navigate="onMoreNavigate"
      @upgrade="onMoreUpgrade"
      @install="onMoreInstall"
    />
    <PcCaptureSheet v-model:open="captureOpen" :busy="captureBusy" @submit="$emit('capture', $event)" @voice="$emit('voice')" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PcSidebar from './PcSidebar.vue'
import PcTabBar from './PcTabBar.vue'
import PcMoreSheet from './PcMoreSheet.vue'
import PcCaptureSheet from './PcCaptureSheet.vue'
import { PRIMARY_NAV } from '../navigation.js'

// App chrome for migrated screens: sidebar from 768px, tab bar below it,
// plus the More and capture sheets. Presentational only; the layout that
// uses it maps `navigate` to the router and `capture` to task creation.
defineProps({
  active: { type: String, default: 'today' },
  inboxCount: { type: Number, default: 0 },
  user: { type: Object, default: () => ({}) },
  isPro: { type: Boolean, default: false },
  canInstall: { type: Boolean, default: false },
  captureBusy: { type: Boolean, default: false },
})
const emit = defineEmits(['navigate', 'focus', 'capture', 'voice', 'upgrade', 'install'])

// v-model:capture-open lets the layout close capture once the task is saved.
const captureOpen = defineModel('captureOpen', { type: Boolean, default: false })
const moreOpen = ref(false)

// Every navigation source (sidebar, tab bar, More) goes through here so
// action items like Focus behave the same everywhere.
function go(item) {
  if (item?.key === 'capture') captureOpen.value = true
  else if (item?.action === 'focus') emit('focus')
  else if (item) emit('navigate', item)
}

function onTab(key) {
  if (key === 'more') {
    moreOpen.value = true
    return
  }
  go(PRIMARY_NAV.find((entry) => entry.key === key))
}

function onMoreNavigate(item) {
  moreOpen.value = false
  go(item)
}

function onMoreInstall() {
  moreOpen.value = false
  emit('install')
}

function onMoreUpgrade() {
  moreOpen.value = false
  emit('upgrade')
}
</script>

<style scoped>
.pc-shell {
  display: flex;
  width: 100%;
  height: 100%;
  max-height: 100dvh;
  min-width: 0;
  min-height: 100dvh;
  overflow: hidden;
  background: var(--pc-bg);
}

.pc-shell__skip {
  position: absolute;
  left: var(--pc-space-3);
  top: -3rem;
  z-index: var(--pc-z-menu);
  padding: var(--pc-space-2) var(--pc-space-3);
  border-radius: var(--pc-radius-sm);
  background: var(--pc-surface);
  color: var(--pc-text);
  box-shadow: var(--pc-shadow-overlay);
}

.pc-shell__skip:not(:focus) {
  box-shadow: none;
}

.pc-shell__skip:focus {
  top: var(--pc-space-3);
}

.pc-shell__sidebar {
  display: none;
}

.pc-shell__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  padding-bottom: calc(5.5rem + env(safe-area-inset-bottom));
  outline: none;
}

@media (min-width: 768px) {
  .pc-shell {
    min-height: 0;
  }

  .pc-shell__sidebar {
    display: flex;
  }

  .pc-shell__main {
    padding-bottom: var(--pc-space-12);
  }
}
</style>
