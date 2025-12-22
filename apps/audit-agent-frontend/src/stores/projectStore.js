import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  fetchProjects,
  fetchProject,
  fetchProjectActivity,
  submitProjectFeedback,
  createProject,
  fetchSprints,
  createSprint,
  updateSprint,
  updateProject,
} from '@/services/projectService'
import { useWorkspaceStore } from './workspaceStore'

export const useProjectStore = defineStore('projectStore', () => {
  const workspaceStore = useWorkspaceStore()
  const projects = ref([])
  const projectsById = ref({})
  const loading = ref(false)
  const error = ref(null)
  const activityByProject = ref({})
  const sprintsByProject = ref({})

  const activeWorkspaceId = computed(() => workspaceStore.activeWorkspaceId || null)

  async function loadProjects() {
    if (!activeWorkspaceId.value) {
      projects.value = []
      projectsById.value = {}
      return []
    }
    loading.value = true
    error.value = null
    try {
      const list = await fetchProjects({ workspaceId: activeWorkspaceId.value })
      projects.value = list
      projectsById.value = list.reduce((acc, p) => {
        acc[p.id] = p
        return acc
      }, {})
      return list
    } catch (err) {
      error.value = err?.message || 'Failed to load projects'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function ensureProject(projectId) {
    if (!projectId) return null
    if (projectsById.value[projectId]) return projectsById.value[projectId]
    try {
      const project = await fetchProject(projectId)
      projectsById.value = { ...projectsById.value, [projectId]: project }
      if (!projects.value.find((p) => p.id === projectId)) {
        projects.value = [...projects.value, project]
      }
      return project
    } catch (err) {
      error.value = err?.message || 'Failed to load project'
      throw err
    }
  }

  async function loadActivity(projectId, opts = {}) {
    if (!projectId) return { events: [], nextCursor: null }
    const state = activityByProject.value[projectId] || { events: [], nextCursor: null, loading: false }
    if (state.loading) return state
    const nextState = { ...state, loading: true }
    activityByProject.value[projectId] = nextState
    try {
      const { events = [], nextCursor = null } = await fetchProjectActivity(projectId, opts)
      const mergedEvents = opts?.cursor ? [...(state.events || []), ...events] : events
      activityByProject.value[projectId] = {
        events: mergedEvents,
        nextCursor,
        loading: false,
      }
      return activityByProject.value[projectId]
    } catch (err) {
      activityByProject.value[projectId] = { ...state, loading: false }
      throw err
    }
  }

  async function createNewProject(payload) {
    if (!activeWorkspaceId.value) throw new Error('workspaceId missing')
    const project = await createProject({ ...payload, workspaceId: activeWorkspaceId.value })
    projectsById.value = { ...projectsById.value, [project.id]: project }
    projects.value = [project, ...projects.filter((p) => p.id !== project.id)]
    return project
  }

  async function updateProjectMeta(projectId, patch) {
    if (!projectId) throw new Error('projectId required')
    const updated = await updateProject(projectId, patch)
    projectsById.value = { ...projectsById.value, [projectId]: updated }
    projects.value = projects.value.map((p) => (p.id === projectId ? updated : p))
    return updated
  }

  async function loadSprints(projectId) {
    if (!projectId) return []
    const sprints = await fetchSprints(projectId)
    sprintsByProject.value = { ...sprintsByProject.value, [projectId]: sprints }
    return sprints
  }

  async function createNewSprint(projectId, payload) {
    const sprint = await createSprint(projectId, payload)
    const existing = sprintsByProject.value[projectId] || []
    sprintsByProject.value = { ...sprintsByProject.value, [projectId]: [sprint, ...existing] }
    return sprint
  }

  async function updateExistingSprint(projectId, sprintId, payload) {
    const updated = await updateSprint(sprintId, payload)
    const existing = sprintsByProject.value[projectId] || []
    sprintsByProject.value = {
      ...sprintsByProject.value,
      [projectId]: existing.map((s) => (s.id === sprintId ? { ...s, ...updated } : s)),
    }
    return updated
  }

  async function addFeedback(projectId, payload) {
    const feedback = await submitProjectFeedback(projectId, payload)
    // Opportunistic refresh of activity; ignore errors to keep UX smooth.
    try {
      await loadActivity(projectId, { cursor: activityByProject.value[projectId]?.nextCursor || undefined })
    } catch {}
    return feedback
  }

  function resetWorkspaceData() {
    projects.value = []
    projectsById.value = {}
    activityByProject.value = {}
    sprintsByProject.value = {}
  }

  watch(
    () => activeWorkspaceId.value,
    () => {
      resetWorkspaceData()
      // Delay load until workspace store is hydrated in the view components.
    },
  )

  return {
    projects,
    projectsById,
    loading,
    error,
    activityByProject,
    sprintsByProject,
    activeWorkspaceId,
    loadProjects,
    ensureProject,
    loadActivity,
    addFeedback,
    createNewProject,
    updateProjectMeta,
    loadSprints,
    createNewSprint,
    updateExistingSprint,
    resetWorkspaceData,
  }
})
