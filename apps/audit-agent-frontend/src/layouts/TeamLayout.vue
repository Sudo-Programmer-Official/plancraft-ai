<template>
  <div class="team-layout">
    <NavBarWithOrgSwitcher />
    <div class="team-body">
      <TeamSidebar :org-id="orgId" />
      <main class="team-content">
        <div v-if="firstRunCoachVisible" class="coach-placeholder">
          <h3>Welcome to your new team! 🎉</h3>
          <p>Well walk you through projects, invites, and the quick mic in the next update.</p>
        </div>
        <AskTeamsBar v-if="orgId" :org-id="orgId" class="ask-teams-wrapper" />
        <section class="team-content-view">
          <router-view />
        </section>
      </main>
    </div>
    <CommandPalette v-model:open="paletteOpen" :org-id="orgId" :project-id="activeProjectId" />
    <button
      v-if="showFab"
      class="command-fab"
      type="button"
      @click="paletteOpen = true"
      aria-label="Open command palette"
    >
      🎤
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import NavBarWithOrgSwitcher from '@/components/NavBarWithOrgSwitcher.vue'
import TeamSidebar from '@/components/TeamSidebar.vue'
import AskTeamsBar from '@/components/AskTeamsBar.vue'
import CommandPalette from '@/components/CommandPalette.vue'
import { useTeamTaskStore } from '@/stores/teamTaskStore'
import { useProjectStore } from '@/stores/projectStore'

const route = useRoute()
const paletteOpen = ref(false)
const taskStore = useTeamTaskStore()
const projectStore = useProjectStore()

const orgId = computed(() => {
  const param = route.params.orgId
  return typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
})

const activeProjectId = computed(() => {
  if (taskStore.activeProjectId) return taskStore.activeProjectId
  const firstProject = projectStore.projects[0]
  return firstProject ? firstProject.id : null
})

const showFab = computed(() => !!orgId.value && !!activeProjectId.value)
const firstRunCoachVisible = ref(false)

function handleKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
    event.preventDefault()
    paletteOpen.value = true
  }
  if (event.key === 'Escape') {
    paletteOpen.value = false
  }
}

function handleFirstRunEvent(event: Event) {
  const detail = (event as CustomEvent)?.detail || {}
  if (!orgId.value || !detail?.orgId || detail.orgId === orgId.value) {
    firstRunCoachVisible.value = true
    setTimeout(() => {
      firstRunCoachVisible.value = false
    }, 6000)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('teams:first-run', handleFirstRunEvent)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('teams:first-run', handleFirstRunEvent)
})
</script>

<style scoped>
.team-layout { display: flex; flex-direction: column; min-height: 100vh; background: #f5f7fb; }
.team-body { display: flex; flex: 1; min-height: 0; }
.team-content { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; }
.ask-teams-wrapper { position: sticky; top: 0; z-index: 10; }
.team-content-view { flex: 1; display: flex; flex-direction: column; }
.team-content-view :deep(> *) { flex: 1; }
.coach-placeholder {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.18), rgba(99, 102, 241, 0.18));
  border: 1px solid rgba(99, 102, 241, 0.25);
  color: #1f2937;
  padding: 18px;
  border-radius: 16px;
  box-shadow: 0 16px 28px rgba(79, 70, 229, 0.15);
  backdrop-filter: blur(6px);
}
.coach-placeholder h3 {
  margin: 0 0 6px;
  font-size: 1.15rem;
  color: #1e1b4b;
}
.coach-placeholder p {
  margin: 0;
  color: rgba(30, 41, 59, 0.8);
}
.command-fab {
  position: fixed;
  right: 32px;
  bottom: 32px;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(160deg, #4f46e5, #8b5cf6);
  color: #fff;
  font-size: 1.6rem;
  box-shadow: 0 18px 45px rgba(79, 70, 229, 0.35);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  z-index: 1100;
}
.command-fab:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 22px 55px rgba(99, 102, 241, 0.45);
}
.command-fab:active {
  transform: translateY(1px) scale(0.98);
}
@media (max-width: 768px) {
  .command-fab {
    right: 20px;
    bottom: 20px;
    width: 52px;
    height: 52px;
  }
}
</style>
