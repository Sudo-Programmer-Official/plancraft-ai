<template>
  <div class="team-layout">
    <header class="team-header">
      <div class="title">
        <h1>Team Workspace</h1>
        <p v-if="orgLabel">{{ orgLabel }}</p>
      </div>
      <OrgSwitcher />
    </header>

    <div class="team-body">
      <TeamSidebar :org-id="orgId" />
      <main class="team-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import OrgSwitcher from '../components/OrgSwitcher.vue'
import TeamSidebar from '../components/TeamSidebar.vue'
import { useOrgStore } from '../stores/orgStore'

const route = useRoute()
const orgStore = useOrgStore()

const orgId = computed(() => {
  const param = route.params.orgId
  return typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
})

const orgLabel = computed(() => orgStore.currentOrg?.name || '')
</script>

<style scoped>
.team-layout { display: flex; flex-direction: column; height: 100%; min-height: 100vh; background: #f6f7fb; }
.team-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid rgba(15,23,42,0.08); background: #fff; }
.team-header .title { display: flex; flex-direction: column; gap: 2px; }
.team-header h1 { margin: 0; font-size: 1.6rem; font-weight: 600; color: #111827; }
.team-header p { margin: 0; color: rgba(17,24,39,0.6); font-size: 0.95rem; }
.team-body { display: flex; flex: 1; min-height: 0; }
.team-content { flex: 1; padding: 24px; overflow-y: auto; }
</style>
