<template>
  <aside class="team-sidebar">
    <nav>
      <RouterLink
        v-for="item in items"
        :key="item.route"
        :to="{ name: item.route, params: { orgId } }"
        class="nav-link"
        active-class="is-active"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="label">{{ item.label }}</span>
        <span v-if="badgeFor(item.route)" class="badge" aria-label="Unread items">
          {{ badgeFor(item.route) }}
        </span>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { useNotificationStore } from '@/stores/notificationStore'

defineProps<{ orgId: string | null }>()

const route = useRoute()
const notificationStore = useNotificationStore()

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

function badgeFor(routeName: string) {
  const count = notificationStore.badges?.[routeName] || 0
  return count > 0 ? Math.min(99, count) : 0
}

function handleRouteChange(next: RouteLocationNormalizedLoaded) {
  const name = typeof next?.name === 'string' ? next.name : null
  if (!name) return
  const canonical = canonicalRoute(name)
  if (canonical) {
    notificationStore.clear(canonical)
  }
}

function canonicalRoute(name: string) {
  if (!name.startsWith('team-')) return null
  if (name.startsWith('team-meeting')) return 'team-meetings'
  if (name.startsWith('team-task')) return 'team-tasks'
  if (name.startsWith('team-chat')) return 'team-chat'
  if (name.startsWith('team-project')) return 'team-projects'
  if (name.startsWith('team-board')) return 'team-boards'
  if (name.startsWith('team-vault')) return 'team-vault'
  if (name.startsWith('team-analytic')) return 'team-analytics'
  if (name.startsWith('team-automation')) return 'team-automations'
  if (name.startsWith('team-fed') || name === 'team-feed') return 'team-feed'
  if (name.startsWith('team-puls')) return 'team-pulse'
  return name
}

watch(
  () => route.name,
  () => {
    handleRouteChange(route as RouteLocationNormalizedLoaded)
  },
  { immediate: true },
)
</script>

<style scoped>
.team-sidebar {
  width: 224px;
  background: var(--bg-surface-alt);
  border-right: 1px solid var(--border-subtle);
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-link {
  display: grid;
  grid-template-columns: 26px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: background 0.18s ease, color 0.18s ease;
  position: relative;
}

.nav-link:hover {
  background: rgba(99, 102, 241, 0.14);
  color: var(--accent-primary);
}

.nav-link.is-active {
  background: rgba(99, 102, 241, 0.18);
  color: var(--accent-primary-strong);
}

.icon {
  width: 20px;
  text-align: center;
}

.badge {
  justify-self: end;
  min-width: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.16);
  color: var(--accent-primary-strong);
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
}

@media (max-width: 960px) {
  .team-sidebar {
    display: none;
  }
}
</style>
