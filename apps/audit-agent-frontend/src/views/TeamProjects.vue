<template>
  <section class="team-projects">
    <header class="projects-header">
      <div>
        <h1>Team Projects</h1>
        <p v-if="currentOrg">{{ currentOrg.name }} workspace</p>
      </div>
      <div class="actions">
        <button type="button" class="secondary" @click="openTemplateModal('start')" :disabled="!orgId">
          Start from Template
        </button>
        <button type="button" @click="onCreate" :disabled="!orgId">
          New Project
        </button>
      </div>
    </header>

    <div v-if="loading" class="projects-loading">Loading projects…</div>

    <ul v-else-if="projects.length" class="projects-list">
      <li v-for="project in projects" :key="project.id">
        <div class="project-row">
          <div>
            <strong>{{ project.name }}</strong>
            <span class="meta">{{ project.key }} · {{ project.status }}</span>
          </div>
          <button
            v-if="canManageTemplates"
            type="button"
            class="link"
            @click="openSaveTemplate(project)"
          >
            Save as Template
          </button>
        </div>
      </li>
    </ul>

    <div v-else class="projects-empty">
      <p>No projects yet. Create one to get started.</p>
    </div>
  </section>
  <TemplateModal
    :open="templateModalOpen"
    :mode="templateModalMode"
    :templates="templates"
    :suggestions="templateSuggestions"
    :project-name-default="templateDefaultName"
    :saving="templateSaving"
    @close="closeTemplateModal"
    @create="handleTemplateCreate"
    @save="handleTemplateSave"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'
import { useProjectStore } from '@/stores/projectStore'
import TemplateModal from '@/components/TemplateModal.vue'
import type { Project } from '@/stores/projectStore'

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
const templates = computed(() => projectStore.templates)
const templateSuggestions = computed(() => projectStore.templateSuggestions)
const templateSaving = computed(() => projectStore.templateSaving)
const canManageTemplates = computed(() => ['owner', 'admin'].includes(String(currentOrg.value?.role || '').toLowerCase()))

watch(orgId, async (id) => {
  if (!id) return
  orgStore.setOrg(id)
  await projectStore.load(id)
  projectStore.loadTemplates(id)
  projectStore.loadTemplateSuggestions(id)
}, { immediate: true })

async function onCreate() {
  if (!orgId.value) return
  const name = window.prompt('Project name?')
  if (!name) return
  await projectStore.create(orgId.value, { name })
}

const templateModalOpen = ref(false)
const templateModalMode = ref<'start' | 'save'>('start')
const templateTargetProject = ref<Project | null>(null)
const templateDefaultName = ref<string>('')

function openTemplateModal(mode: 'start' | 'save') {
  if (!orgId.value) return
  templateModalMode.value = mode
  templateModalOpen.value = true
  if (mode === 'start') {
    templateDefaultName.value = `${currentOrg.value?.name || 'New'} Project`
    projectStore.loadTemplates(orgId.value)
    projectStore.loadTemplateSuggestions(orgId.value)
  }
}

function openSaveTemplate(project: Project) {
  if (!canManageTemplates.value) return
  templateTargetProject.value = project
  templateDefaultName.value = `${project.name} Template`
  openTemplateModal('save')
}

function closeTemplateModal() {
  templateModalOpen.value = false
  templateTargetProject.value = null
}

async function handleTemplateCreate(payload: { templateId: string; name: string }) {
  if (!orgId.value) return
  try {
    await projectStore.startProjectFromTemplate(orgId.value, payload.templateId, { name: payload.name })
    projectStore.loadTemplateSuggestions(orgId.value)
    templateModalOpen.value = false
    templateTargetProject.value = null
  } catch (err) {
    console.error('Failed to create project from template', err)
  }
}

async function handleTemplateSave(payload: { name: string; summary: string; type: string; industry: string; tags: string[] }) {
  if (!orgId.value || !templateTargetProject.value) return
  try {
    await projectStore.saveTemplateFromProject(orgId.value, templateTargetProject.value.id, payload)
    projectStore.loadTemplateSuggestions(orgId.value)
    templateModalOpen.value = false
    templateTargetProject.value = null
  } catch (err) {
    console.error('Failed to save template', err)
  }
}

onMounted(() => {
  if (orgId.value) {
    projectStore.loadTemplates(orgId.value)
    projectStore.loadTemplateSuggestions(orgId.value)
  }
})
</script>

<style scoped>
.team-projects { display: flex; flex-direction: column; gap: 16px; }
.projects-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.projects-header .actions { display: flex; gap: 10px; }
.projects-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.projects-list li { padding: 12px; border: 1px solid rgba(0,0,0,0.08); border-radius: 10px; display: flex; flex-direction: column; gap: 4px; background: #fff; }
.project-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.projects-loading, .projects-empty { padding: 24px; text-align: center; color: rgba(0,0,0,0.6); border: 1px dashed rgba(0,0,0,0.2); border-radius: 12px; background: #fff; }
.meta { font-size: 0.85rem; color: rgba(0,0,0,0.6); }
button { padding: 8px 14px; border-radius: 8px; border: none; background: #111827; color: #fff; cursor: pointer; }
button[disabled] { background: rgba(0,0,0,0.2); cursor: not-allowed; }
.secondary { background: rgba(79, 70, 229, 0.16); color: #312e81; }
.secondary:hover { background: rgba(79, 70, 229, 0.24); }
.link { background: transparent; color: #4338ca; padding: 4px 8px; }
.link:hover { text-decoration: underline; }
</style>
