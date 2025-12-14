import api from '@/services/api'
import { nlpClient } from '@/services/leader/http'

export async function uploadKnowledgeText(payload) {
  const { workspaceId, title, text, source = 'paste' } = payload || {}
  if (!workspaceId) throw new Error('workspaceId is required')
  if (!text || !String(text).trim()) throw new Error('Text is required')
  const res = await api.post('/knowledge/docs', {
    workspaceId,
    title,
    source,
    text,
  })
  return res?.data || {}
}

export async function uploadKnowledgeFile(formData) {
  if (!formData) throw new Error('formData is required')
  const res = await api.post('/knowledge/docs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res?.data || {}
}

export async function processKnowledgeDoc(docId, workspaceId) {
  if (!docId) throw new Error('docId is required')
  const res = await api.post(`/knowledge/docs/${docId}/process`, { workspaceId })
  return res?.data || {}
}

export async function searchKnowledge(params) {
  const { workspaceId, q, topK, docId } = params || {}
  if (!workspaceId) throw new Error('workspaceId is required')
  if (!q) throw new Error('q is required')
  const res = await api.get('/knowledge/search', {
    params: { workspaceId, q, topK, docId },
  })
  return res?.data || { items: [], source: 'fallback' }
}

export async function orchestrateKnowledgeTasks(params) {
  const { workspaceId, docId, prompt, useKnowledge = true } = params || {}
  if (!workspaceId) throw new Error('workspaceId is required')
  const res = await nlpClient.post('/orchestrate', {
    workspaceId,
    docId,
    source: 'knowledge',
    useKnowledge,
    input: { text: prompt || 'Turn this document into actionable tasks grouped by sections.' },
  })
  return res?.data || {}
}

export async function fetchChangeImpact(params) {
  const { workspaceId, source, diffSummary, maxHops, maxItems } = params || {}
  if (!workspaceId) throw new Error('workspaceId is required')
  if (!source || !source.type || !source.refId) throw new Error('source {type, refId} is required')
  const res = await api.post('/knowledge/change-impact', {
    workspaceId,
    source,
    changeSummary: diffSummary,
    maxHops,
    maxItems,
  })
  return res?.data || { impacts: [] }
}

export async function sendImpactFeedback(params) {
  const { workspaceId, source, impacted, confidence, userAction } = params || {}
  if (!workspaceId) throw new Error('workspaceId is required')
  if (!source?.type || !source?.refId) throw new Error('source {type, refId} is required')
  if (!impacted?.type || !impacted?.refId) throw new Error('impacted {type, refId} is required')
  if (userAction !== 'relevant' && userAction !== 'irrelevant') throw new Error('userAction must be relevant or irrelevant')
  await api.post('/knowledge/impact-feedback', {
    workspaceId,
    source,
    impacted,
    confidence,
    userAction,
  })
  return { ok: true }
}

export async function listProposals(params = {}) {
  const { workspaceId, status } = params
  if (!workspaceId) throw new Error('workspaceId is required')
  const res = await api.get('/knowledge/proposals', { params: { workspaceId, status } })
  return res?.data?.proposals || []
}

export async function getProposal(proposalId) {
  if (!proposalId) throw new Error('proposalId is required')
  const res = await api.get(`/knowledge/proposals/${proposalId}`)
  return res?.data || null
}

export async function approveProposalApi(proposalId, approve, note) {
  if (!proposalId) throw new Error('proposalId is required')
  const res = await api.post(`/knowledge/proposals/${proposalId}/approve`, { approve: !!approve, note })
  return res?.data || {}
}

export async function listActions(proposalId) {
  if (!proposalId) throw new Error('proposalId is required')
  const res = await api.get(`/knowledge/proposals/${proposalId}/actions`)
  return res?.data?.actions || []
}

export async function executeActionApi(proposalId, actionId) {
  if (!proposalId || !actionId) throw new Error('proposalId and actionId required')
  const res = await api.post(`/knowledge/proposals/${proposalId}/actions/${actionId}/execute`)
  return res?.data || {}
}

export function extractTaskProposals(orchestrateResponse) {
  const actions =
    orchestrateResponse?.response?.decision?.actions ||
    orchestrateResponse?.response?.actions ||
    []
  const fromActions = actions
    .filter((a) => /create[_-]?task/i.test(a?.type || ''))
    .map((a, idx) => {
      const payload = a?.payload || {}
      return {
        id: payload.id || `task-${idx}`,
        title: payload.title || payload.name || 'New Task',
        description: payload.details || payload.notes || payload.description || '',
        date: payload.date || payload.dueDate || null,
        raw: a,
      }
    })

  if (fromActions.length) return fromActions

  const directTasks = orchestrateResponse?.response?.tasks
  if (Array.isArray(directTasks) && directTasks.length) {
    return directTasks.map((t, idx) => ({
      id: t.id || `task-${idx}`,
      title: t.title || 'New Task',
      description: t.description || t.notes || '',
      date: t.date || t.dueDate || null,
      raw: t,
    }))
  }

  return []
}
