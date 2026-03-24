import api from '@/services/api'

function normalizePlaybookUsageStatus(payload = {}) {
  const source = payload?.feature || payload?.usage || payload || {}
  return {
    feature: source?.feature || 'playbooks',
    plan: source?.plan || 'free',
    planKey: source?.planKey || 'FREE',
    used: Number(source?.used || 0),
    limit: source?.limit == null ? null : Number(source.limit),
    isUnlimited: source?.isUnlimited === true || source?.limit == null,
    atLimit: source?.atLimit === true,
    nearLimit: source?.nearLimit === true,
    remaining: source?.remaining == null ? null : Number(source.remaining),
  }
}

export async function fetchPlaybooks() {
  const { data } = await api.get('/playbooks')
  return {
    playbooks: data?.playbooks || [],
    usage: normalizePlaybookUsageStatus(data?.usage),
  }
}

export async function fetchPlaybookDetail(playbookId) {
  const { data } = await api.get(`/playbooks/${encodeURIComponent(playbookId)}`)
  return data || { playbook: null, steps: [] }
}

export async function fetchPlaybookUsageStatus() {
  const { data } = await api.get('/usage/status', { params: { feature: 'playbooks' } })
  return normalizePlaybookUsageStatus(data)
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
