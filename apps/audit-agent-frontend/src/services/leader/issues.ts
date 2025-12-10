import { growthClient } from './http'

export interface LeaderIssue {
  id?: string
  title: string
  description?: string
  status?: 'open' | 'in_progress' | 'resolved' | string
  contactId?: string
  groupId?: string
  priority?: string
  createdAt?: string
  updatedAt?: string
  notes?: string
}

const mapIssue = (raw: any): LeaderIssue => ({
  id: raw?.id || raw?._id || raw?.issueId,
  title: raw?.title || raw?.summary || 'Issue',
  description: raw?.description || raw?.details,
  status: raw?.status || 'open',
  contactId: raw?.contactId,
  groupId: raw?.groupId,
  priority: raw?.priority || raw?.severity,
  createdAt: raw?.createdAt,
  updatedAt: raw?.updatedAt,
  notes: raw?.notes,
})

export async function listIssues(): Promise<LeaderIssue[]> {
  const { data } = await growthClient.get('/leader/issues')
  return (data?.issues || []).map(mapIssue)
}

export async function createIssue(payload: LeaderIssue) {
  const { data } = await growthClient.post('/leader/issues', payload)
  return mapIssue(data?.issue || payload)
}

export async function updateIssue(id: string, payload: Partial<LeaderIssue>) {
  const { data } = await growthClient.put(`/leader/issues/${id}`, payload)
  return mapIssue(data?.issue || { ...payload, id })
}

const mapTimelineEntries = (rawEntries: any[] = []) =>
  rawEntries.map((entry) => ({
    ...entry,
    id: entry?.id || entry?._id,
    title: entry?.title || entry?.action || entry?.type || 'Update',
    description: entry?.description || entry?.note || entry?.message || '',
    timestamp: entry?.timestamp || entry?.date || entry?.createdAt || entry?.time,
  }))

export async function fetchIssueTimeline(issueId?: string) {
  if (!issueId) return []

  try {
    const { data } = await growthClient.get(`/leader/issues/${issueId}/timeline`)
    return mapTimelineEntries(data?.entries || data?.timeline || data?.events || [])
  } catch (error: any) {
    // Fallback for older deployments that only support the query-param route
    if (error?.response?.status === 404) {
      const { data } = await growthClient.get('/leader/issues/timeline', { params: { issueId } })
      return mapTimelineEntries(data?.entries || data?.timeline || data?.events || [])
    }
    throw error
  }
}
