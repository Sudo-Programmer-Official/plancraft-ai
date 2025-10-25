<template>
  <nav class="team-mobile-nav">
    <RouterLink
      v-for="item in items"
      :key="item.route"
      :to="{ name: item.route, params: { orgId } }"
      class="nav-pill"
      active-class="is-active"
      replace
    >
      <span class="icon">{{ item.icon }}</span>
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineProps<{ orgId: string | null }>()

const items = computed(() => [
  { route: 'team-feed', label: 'Feed', icon: '📰' },
  { route: 'team-projects', label: 'Projects', icon: '📁' },
  { route: 'team-boards', label: 'Boards', icon: '🗂️' },
  { route: 'team-tasks', label: 'Tasks', icon: '✅' },
  { route: 'team-chat', label: 'Chat', icon: '💬' },
  { route: 'team-pulse', label: 'Pulse', icon: '📊' },
  { route: 'team-meetings', label: 'Meetings', icon: '🗓️' },
  { route: 'team-vault', label: 'Vault', icon: '🧠' },
  { route: 'team-analytics', label: 'Analytics', icon: '📈' },
])
</script>

<style scoped>
.team-mobile-nav {
  display: none;
}

@media (max-width: 960px) {
  .team-mobile-nav {
    position: sticky;
    top: 64px;
    z-index: 15;
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    overflow-x: auto;
    background: linear-gradient(180deg, rgba(245, 247, 251, 0.98), rgba(245, 247, 251, 0.9));
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }

  .team-mobile-nav::-webkit-scrollbar {
    display: none;
  }

  .nav-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: rgba(255, 255, 255, 0.85);
    color: rgba(30, 41, 59, 0.75);
    font-size: 0.85rem;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }

  .nav-pill.is-active {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.4);
    color: #312e81;
  }

  .nav-pill:active {
    transform: scale(0.97);
  }

  .icon {
    font-size: 1rem;
  }
}
</style>
