<template>
  <div class="team-layout">
    <NavBarWithOrgSwitcher />
    <div class="team-body">
      <TeamSidebar :org-id="orgId" />
      <main class="team-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NavBarWithOrgSwitcher from '@/components/NavBarWithOrgSwitcher.vue'
import TeamSidebar from '@/components/TeamSidebar.vue'

const route = useRoute()

const orgId = computed(() => {
  const param = route.params.orgId
  return typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
})
</script>

<style scoped>
.team-layout { display: flex; flex-direction: column; min-height: 100vh; background: #f5f7fb; }
.team-body { display: flex; flex: 1; min-height: 0; }
.team-content { flex: 1; padding: 24px; overflow-y: auto; }
</style>

