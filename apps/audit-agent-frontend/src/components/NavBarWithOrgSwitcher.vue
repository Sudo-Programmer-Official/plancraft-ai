<template>
  <header class="nav-bar" v-if="enabled">
    <div class="left">
      <slot name="logo">
        <RouterLink to="/dashboard" class="logo-link">🌙 PlanCraftAI</RouterLink>
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
import { useOrgStore } from '@/stores/orgStore'
import OrgSwitcher from './OrgSwitcher.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const orgStore = useOrgStore()
const enabled = orgStore.enabled
</script>

<style scoped>
.nav-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-surface);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  z-index: 20;
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
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  font-size: 1.1rem;
  transition: color 0.18s ease;
}

.logo-link:hover {
  color: var(--accent-primary-strong);
}

@media (max-width: 640px) {
  .nav-bar {
    grid-template-columns: auto 1fr auto;
    padding: 10px 14px;
  }

  .center {
    display: none;
  }
}
</style>
