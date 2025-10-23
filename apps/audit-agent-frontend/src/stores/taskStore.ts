import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiGet, apiPost } from '@/lib/api'

export interface TaskPayload {
  title: string
  description?: string
  status?: string
  priority?: string
  projectId?: string | null
  boardId?: string | null
  column?: string | null
  assignees?: string[]
  due?: string | null
  effort?: number | null
  source?: string
}

export interface Task extends TaskPayload {
  id: string
  reporterUid?: string | null
  createdAt?: string | Date
  updatedAt?: string | Date
}

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const loading = ref(false)

  async function load(orgId: string, filters: Record<string, string> = {}) {
    if (!orgId) return []
    loading.value = true
    try {
      const search = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) search.append(key, value)
      })
      const qs = search.toString()
      const res = await apiGet(`/api/orgs/${orgId}/tasks${qs ? `?${qs}` : ''}`)
      tasks.value = Array.isArray(res) ? res : []
      return tasks.value
    } finally {
      loading.value = false
    }
  }

  async function create(orgId: string, payload: TaskPayload) {
    if (!orgId) throw new Error('Missing orgId')
    const task = await apiPost(`/api/orgs/${orgId}/tasks`, payload)
    tasks.value.unshift(task)
    return task
  }

  function clear() {
    tasks.value = []
  }

  return {
    tasks,
    loading,
    load,
    create,
    clear,
  }
})

