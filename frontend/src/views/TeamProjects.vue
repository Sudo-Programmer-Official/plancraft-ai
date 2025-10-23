<template>
  <section class="team-projects">
    <header class="projects-header">
      <div>
        <h1>Team Projects</h1>
        <p v-if="currentOrg">{{ currentOrg.name }} workspace</p>
      </div>
      <button type="button" @click="onCreate" :disabled="!orgId">
        New Project
      </button>
    </header>

    <div v-if="loading" class="projects-loading">Loading projects…</div>

    <ul v-else class="projects-list" v-if="projects.length">
      <li v-for="project in projects" :key="project.id">
        <strong>{{ project.name }}</strong>
        <span class="meta">{{ project.key }} · {{ project.status }}</span>
      </li>
    </ul>

    <div v-else class="projects-empty">
      <p>No projects yet. Create one to get started.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useOrgStore } from '../stores/orgStore'
import { useProjectStore } from '../stores/projectStore'

const route = useRoute()
const orgStore = useOrgStore()
const projectStore = useProjectStore()

const orgId = computed(() => {
  const param = route.params.orgId
  const id = typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
  return id || orgStore.activeOrgId
})

const currentOrg = computed(() => orgStore.currentOrg)
const projects = computed(() => projectStore.projects)
const loading = computed(() => projectStore.loading)

watch(orgId, async (id) => {
  if (!id) return
  orgStore.setOrg(id)
  await projectStore.load(id)
}, { immediate: true })

async function onCreate() {
  if (!orgId.value) return
  const name = window.prompt('Project name?')
  if (!name) return
  await projectStore.create(orgId.value, { name })
}
</script>

<style scoped>
.team-projects { display: flex; flex-direction: column; gap: 16px; padding: 12px; }
.projects-header { display: flex; justify-content: space-between; align-items: center; }
.projects-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.projects-list li { padding: 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; display: flex; flex-direction: column; gap: 4px; }
.projects-loading, .projects-empty { padding: 24px; text-align: center; color: rgba(0,0,0,0.6); }
.meta { font-size: 0.85rem; color: rgba(0,0,0,0.6); }
button { padding: 8px 14px; border-radius: 6px; border: none; background: #111; color: #fff; cursor: pointer; }
button[disabled] { background: rgba(0,0,0,0.2); cursor: not-allowed; }
</style>
