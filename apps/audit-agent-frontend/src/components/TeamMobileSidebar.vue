<template>
  <transition name="sidebar-slide">
    <aside v-if="open" class="mobile-sidebar">
      <header class="mobile-sidebar__header">
        <span class="logo">🌙 PlanCraftAI</span>
        <button type="button" class="close" @click="close">✕</button>
      </header>
      <nav class="mobile-sidebar__nav" v-if="links.length">
        <RouterLink
          v-for="item in links"
          :key="item.route"
          :to="item.to"
          class="nav-link"
          active-class="is-active"
          @click="close"
        >
          <span class="icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <p v-else class="mobile-sidebar__empty">Select a workspace to explore navigation.</p>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/uiStore'

const props = defineProps<{ open: boolean; orgId: string | null }>()

const uiStore = useUiStore()

const items = computed(() => [
  { route: 'team-feed', label: 'Feed', icon: '📰' },
  { route: 'team-projects', label: 'Projects', icon: '📁' },
  { route: 'team-boards', label: 'Boards', icon: '🗂️' },
  { route: 'team-tasks', label: 'Tasks', icon: '✅' },
  { route: 'team-chat', label: 'Chat', icon: '💬' },
  { route: 'team-pulse', label: 'Pulse', icon: '📊' },
  { route: 'team-meetings', label: 'Meetings', icon: '🗓️' },
  { route: 'team-vault', label: 'Knowledge Vault', icon: '🧠' },
  { route: 'team-analytics', label: 'Analytics', icon: '📈' },
  { route: 'team-automations', label: 'Automations', icon: '⚡' },
])

const links = computed(() => {
  if (!props.orgId) return []
  return items.value.map((item) => ({
    ...item,
    to: { name: item.route, params: { orgId: props.orgId } },
  }))
})

function close() {
  uiStore.closeMobileSidebar()
}
</script>

<style scoped>
.mobile-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: min(280px, 80vw);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  box-shadow: var(--sidebar-shadow);
  z-index: 1300;
  display: flex;
  flex-direction: column;
}

.mobile-sidebar__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.logo {
  font-weight: 600;
  color: var(--text-primary);
}

.close {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
}

.mobile-sidebar__nav {
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 6px;
  overflow-y: auto;
}

.mobile-sidebar__empty {
  margin: 0;
  padding: 24px 18px;
  color: var(--text-tertiary);
  font-size: 0.92rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: background 0.18s ease, color 0.18s ease;
}

.nav-link:hover {
  background: rgba(99, 102, 241, 0.12);
  color: var(--accent-primary-strong);
}

.nav-link.is-active {
  background: rgba(99, 102, 241, 0.18);
  color: var(--accent-primary-strong);
}

.icon {
  width: 20px;
  text-align: center;
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0.6;
}

.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform 0.22s ease-out, opacity 0.22s ease-out;
}
</style>
