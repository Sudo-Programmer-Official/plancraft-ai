import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'

export interface TeamTaskPayload {
  title: string
  description?: string
  status?: 'pending' | 'completed'
  assignedTo?: string | null
  dueDate?: string | Date | null
  voiceNoteUrl?: string | null
  metadata?: Record<string, any>
  progress?: number | null
  lastNote?: string | null
}

export interface TeamTask extends TeamTaskPayload {
  id: string
  teamId: string
  projectId: string
  createdAt?: string | Date
  updatedAt?: string | Date
  createdBy?: string | null
  lastUpdatedBy?: string | null
  lastUpdateAt?: string | Date
}

export const useTeamTaskStore = defineStore('team-task', () => {
  const tasks = ref<TeamTask[]>([])
  const loading = ref(false)
  const activeTeamId = ref<string | null>(null)
  const activeProjectId = ref<string | null>(null)

  function scopeQuery(teamId: string, projectId: string) {
    const params = new URLSearchParams({ teamId, projectId })
    return params.toString()
  }

  async function load(teamId: string, projectId: string) {
    if (!teamId || !projectId) return []
    loading.value = true
    activeTeamId.value = teamId
    activeProjectId.value = projectId
    try {
      const qs = scopeQuery(teamId, projectId)
      const res = await apiGet(`/api/tasks?${qs}`)
      tasks.value = Array.isArray(res) ? res : []
      return tasks.value
    } finally {
      loading.value = false
    }
  }

  async function create(teamId: string, projectId: string, payload: TeamTaskPayload) {
    if (!teamId || !projectId) throw new Error('Missing teamId or projectId')
    const task = await apiPost('/api/tasks', { ...payload, teamId, projectId })
    tasks.value.unshift(task)
    return task
  }

  async function update(taskId: string, updates: Partial<TeamTaskPayload>) {
    if (!activeTeamId.value || !activeProjectId.value) throw new Error('Task scope not loaded')
    const qs = scopeQuery(activeTeamId.value, activeProjectId.value)
    const task = await apiPatch(`/api/tasks/${taskId}?${qs}`, updates)
    const idx = tasks.value.findIndex((t) => t.id === taskId)
    if (idx >= 0) tasks.value[idx] = task
    return task
  }

  async function updateStatus(taskId: string, status: 'pending' | 'completed') {
    return update(taskId, { status })
  }

  async function remove(taskId: string) {
    if (!activeTeamId.value || !activeProjectId.value) throw new Error('Task scope not loaded')
    const qs = scopeQuery(activeTeamId.value, activeProjectId.value)
    await apiDelete(`/api/tasks/${taskId}?${qs}`)
    tasks.value = tasks.value.filter((t) => t.id !== taskId)
  }

  function clear() {
    tasks.value = []
    activeTeamId.value = null
    activeProjectId.value = null
  }

  return {
    tasks,
    loading,
    activeTeamId,
    activeProjectId,
    load,
    create,
    update,
    updateStatus,
    remove,
    clear,
  }
})
