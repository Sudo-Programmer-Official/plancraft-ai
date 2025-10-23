import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet, apiPost } from '@/lib/api'

export interface ProjectPayload {
  name: string
  key?: string
  status?: string
  leadUid?: string | null
  defaultAssignees?: string[]
}

export interface Project extends ProjectPayload {
  id: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const loading = ref(false)

  async function load(orgId: string) {
    if (!orgId) return []
    loading.value = true
    try {
      const res = await apiGet(`/api/orgs/${orgId}/projects`)
      projects.value = Array.isArray(res) ? res : []
      return projects.value
    } finally {
      loading.value = false
    }
  }

  async function create(orgId: string, payload: ProjectPayload) {
    if (!orgId) throw new Error('Missing orgId')
    const project = await apiPost(`/api/orgs/${orgId}/projects`, payload)
    projects.value.unshift(project)
    return project
  }

  function clear() {
    projects.value = []
  }

  return {
    projects,
    loading,
    load,
    create,
    clear,
  }
})

