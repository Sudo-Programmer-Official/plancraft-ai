<template>
  <header class="navbar">
    <div class="left">
      <slot name="logo">
        <strong>PlanCraftAI</strong>
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

<script setup>
import OrgSwitcher from './OrgSwitcher.vue'
</script>

<style scoped>
.navbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  background: var(--pcai-navbar-bg, #fff);
  color: var(--pcai-navbar-fg, #111);
}
.left { justify-self: start; }
.center { justify-self: center; opacity: 0.8; }
.right { justify-self: end; display: flex; align-items: center; gap: 8px; }
</style>

