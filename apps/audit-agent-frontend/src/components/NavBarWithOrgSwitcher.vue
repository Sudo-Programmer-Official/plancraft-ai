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
      <OrgSwitcher />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useOrgStore } from '@/stores/orgStore'
import OrgSwitcher from './OrgSwitcher.vue'

const orgStore = useOrgStore()
const enabled = orgStore.enabled
</script>

<style scoped>
.nav-bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 12px 20px; background: rgba(255,255,255,0.92); backdrop-filter: blur(14px); border-bottom: 1px solid rgba(15,23,42,0.08); position: sticky; top: 0; z-index: 20; }
.left { justify-self: start; }
.center { justify-self: center; color: rgba(17,24,39,0.65); font-weight: 500; }
.right { justify-self: end; display: flex; align-items: center; gap: 12px; }
.logo-link { font-weight: 600; color: #1f2937; text-decoration: none; font-size: 1.1rem; }
.logo-link:hover { color: #111827; }
</style>

