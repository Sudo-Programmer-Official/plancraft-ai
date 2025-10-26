<template>
  <header class="nav-bar" v-if="enabled">
    <button
      type="button"
      class="hamburger"
      aria-label="Open navigation"
      :aria-expanded="mobileSidebarOpen ? 'true' : 'false'"
      @click="uiStore.toggleMobileSidebar(!mobileSidebarOpen)"
      :class="{ active: mobileSidebarOpen }"
    >
      ☰
    </button>
    <div class="left">
      <slot name="logo">
        <RouterLink to="/dashboard" class="logo-link" aria-label="Go to dashboard">
          <span class="logo-mark" aria-hidden="true">🌙</span>
          <span class="sr-only">PlanCraftAI</span>
        </RouterLink>
      </slot>
    </div>
    <div class="center">
      <slot name="title">Workspace</slot>
    </div>
    <div class="right">
      <ThemeToggle />
      <OrgSwitcher />
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrgStore } from '@/stores/orgStore'
import { useUiStore } from '@/stores/uiStore'
import OrgSwitcher from './OrgSwitcher.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const orgStore = useOrgStore()
const { enabled } = storeToRefs(orgStore)
const uiStore = useUiStore()
const mobileSidebarOpen = computed(() => uiStore.mobileSidebarOpen)
</script>

<style scoped>
.nav-bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-surface);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  z-index: 20;
  gap: 16px;
}

.hamburger {
  display: none;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px;
}

.hamburger.active {
  color: var(--accent-primary-strong);
}

.left {
  justify-self: start;
}

.center {
  justify-self: center;
  color: var(--text-secondary);
  font-weight: 500;
}

.right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--bg-surface-alt);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
  text-decoration: none;
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.logo-link:hover {
  transform: translateY(-1px);
  box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.45), 0 8px 18px rgba(99, 102, 241, 0.18);
}

.logo-mark {
  font-size: 1.2rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 768px) {
  .hamburger {
    display: inline-flex;
  }
  .center {
    display: none;
  }
}
</style>
