import api from '@/services/api'

function base() {
  const envBase =
    import.meta.env.VITE_PROJECT_SERVICE_BASE ||
    import.meta.env.VITE_PROJECT_SERVICE_URL ||
    import.meta.env.VITE_PROJECT_API_URL
  const root = envBase ? envBase.replace(/\/+$/, '') : '/project-api'
  return `${root}/v1`
}

export async function fetchProjects(params = {}) {
  const { data } = await api.get(`${base()}/projects`, { params })
  return data?.projects || []
}

export async function fetchProject(projectId) {
  if (!projectId) throw new Error('projectId is required')
  const { data } = await api.get(`${base()}/projects/${projectId}`)
  return data
}

export async function createProject(payload) {
  const { data } = await api.post(`${base()}/projects`, payload)
  return data
}

export async function fetchProjectActivity(projectId, { limit, cursor } = {}) {
  if (!projectId) throw new Error('projectId is required')
  const { data } = await api.get(`${base()}/projects/${projectId}/activity`, {
    params: { limit, cursor },
  })
  return data || { events: [], nextCursor: null }
}

export async function submitProjectFeedback(projectId, payload) {
  if (!projectId) throw new Error('projectId is required')
  const { data } = await api.post(`${base()}/projects/${projectId}/feedback`, payload)
  return data
}

export async function updateProject(projectId, payload) {
  if (!projectId) throw new Error('projectId is required')
  const { data } = await api.patch(`${base()}/projects/${projectId}`, payload)
  return data
}

export async function fetchSprints(projectId) {
  if (!projectId) throw new Error('projectId is required')
  const { data } = await api.get(`${base()}/projects/${projectId}/sprints`)
  return data?.sprints || []
}

export async function createSprint(projectId, payload) {
  if (!projectId) throw new Error('projectId is required')
  const { data } = await api.post(`${base()}/projects/${projectId}/sprints`, payload)
  return data
}

export async function updateSprint(sprintId, payload) {
  if (!sprintId) throw new Error('sprintId is required')
  const { data } = await api.patch(`${base()}/sprints/${sprintId}`, payload)
  return data
}
