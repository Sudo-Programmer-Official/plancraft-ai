import api from '@/services/api'

export async function fetchPlaybooks() {
  const { data } = await api.get('/playbooks')
  return data?.playbooks || []
}

export async function fetchPlaybookDetail(playbookId) {
  const { data } = await api.get(`/playbooks/${encodeURIComponent(playbookId)}`)
  return data || { playbook: null, steps: [] }
}

export async function createPlaybook(payload) {
  const { data } = await api.post('/playbooks', payload)
  return data || { playbook: null, steps: [] }
}

export async function addPlaybookStep(playbookId, payload) {
  const { data } = await api.post(`/playbooks/${encodeURIComponent(playbookId)}/steps`, payload)
  return data || { playbook: null, steps: [] }
}

export async function updatePlaybookStep(playbookId, stepId, payload) {
  const { data } = await api.patch(
    `/playbooks/${encodeURIComponent(playbookId)}/steps/${encodeURIComponent(stepId)}`,
    payload,
  )
  return data || { playbook: null, steps: [] }
}
