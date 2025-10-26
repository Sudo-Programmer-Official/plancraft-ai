<template>
  <div class="team-layout">
    <NavBarWithOrgSwitcher />
    <div class="team-body">
      <TeamSidebar :org-id="orgId" />
      <main class="team-content">
        <TeamMobileNav :org-id="orgId" />
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
  <TeamCoachOverlay />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavBarWithOrgSwitcher from '@/components/NavBarWithOrgSwitcher.vue'
import TeamSidebar from '@/components/TeamSidebar.vue'
import TeamMobileNav from '@/components/TeamMobileNav.vue'
import AskTeamsBar from '@/components/AskTeamsBar.vue'
import CommandPalette from '@/components/CommandPalette.vue'
import TeamCoachOverlay from '@/components/TeamCoachOverlay.vue'
import { useTeamTaskStore } from '@/stores/teamTaskStore'
import { useProjectStore } from '@/stores/projectStore'
import { useFirstRunCoachStore } from '@/stores/firstRunCoachStore'

const route = useRoute()
const paletteOpen = ref(false)
const taskStore = useTeamTaskStore()
const projectStore = useProjectStore()
const coachStore = useFirstRunCoachStore()

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
  const targetOrgId = detail?.orgId || orgId.value
  if (!targetOrgId) return
  coachStore.initForOrg(targetOrgId, { autostart: false })
  coachStore.startOnboarding({ trigger: 'manual' })
}

function maybeInitCoach() {
  if (orgId.value) {
    coachStore.initForOrg(orgId.value)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('teams:first-run', handleFirstRunEvent)
  maybeInitCoach()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('teams:first-run', handleFirstRunEvent)
})

watch(
  () => orgId.value,
  (next) => {
    if (next) coachStore.initForOrg(next)
  },
)
</script>

<style scoped>
.team-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--bg-app);
  color: var(--text-primary);
}

.team-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.team-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ask-teams-wrapper {
  position: sticky;
  top: 0;
  z-index: 10;
}

.team-content-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.team-content-view :deep(> *) {
  flex: 1;
}

.command-fab {
  position: fixed;
  right: 32px;
  bottom: 32px;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  border: none;
  background: var(--accent-gradient);
  color: #fff;
  font-size: 1.6rem;
  box-shadow: var(--shadow-elevated);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  z-index: 1100;
}

.command-fab:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 22px 55px rgba(99, 102, 241, 0.32);
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

@media (max-width: 960px) {
  .ask-teams-wrapper {
    top: 112px;
  }
}
</style>
