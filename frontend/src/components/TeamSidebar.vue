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

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  orgId: {
    type: String,
    default: null,
  },
})

const router = useRouter()

const items = computed(() => [
  { route: 'team-projects', label: 'Projects', icon: '📁' },
  { route: 'team-boards', label: 'Boards', icon: '🗂️' },
  { route: 'team-tasks', label: 'Tasks', icon: '✅' },
  { route: 'team-meetings', label: 'Meetings', icon: '🗓️' },
  { route: 'team-automations', label: 'Automations', icon: '⚡' },
])

if (props.orgId && !router.hasRoute('team-projects')) {
  // safety guard if routes not yet registered
  console.warn('[TeamSidebar] Team routes missing. Did you call installTeamRoutes(router)?')
}
</script>

<style scoped>
.team-sidebar { width: 220px; background: #fff; border-right: 1px solid rgba(15,23,42,0.08); padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; }
nav { display: flex; flex-direction: column; gap: 4px; }
.nav-link { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; color: rgba(17,24,39,0.72); text-decoration: none; font-weight: 500; transition: background 0.18s ease; }
.nav-link:hover { background: rgba(59,130,246,0.12); color: #1d4ed8; }
.nav-link.is-active { background: rgba(37,99,235,0.15); color: #1d4ed8; }
.icon { width: 20px; text-align: center; }
</style>

