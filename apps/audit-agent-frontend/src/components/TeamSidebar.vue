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
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ orgId: string | null }>()

const items = computed(() => [
  { route: 'team-projects', label: 'Projects', icon: '📁' },
  { route: 'team-boards', label: 'Boards', icon: '🗂️' },
  { route: 'team-tasks', label: 'Tasks', icon: '✅' },
  { route: 'team-meetings', label: 'Meetings', icon: '🗓️' },
  { route: 'team-automations', label: 'Automations', icon: '⚡' },
])
</script>

<style scoped>
.team-sidebar { width: 224px; background: #fff; border-right: 1px solid rgba(15,23,42,0.08); padding: 18px 12px; display: flex; flex-direction: column; gap: 6px; }
nav { display: flex; flex-direction: column; gap: 4px; }
.nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 12px; color: rgba(17,24,39,0.72); text-decoration: none; font-weight: 500; transition: background 0.18s ease, color 0.18s ease; }
.nav-link:hover { background: rgba(79,70,229,0.14); color: #4338ca; }
.nav-link.is-active { background: rgba(99,102,241,0.18); color: #312e81; }
.icon { width: 20px; text-align: center; }
@media (max-width: 960px) {
  .team-sidebar { display: none; }
}
</style>

