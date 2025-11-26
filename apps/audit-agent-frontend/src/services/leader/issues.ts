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

export async function fetchIssueTimeline(issueId?: string) {
  const { data } = await growthClient.get('/leader/issues/timeline', { params: issueId ? { issueId } : {} })
  return data?.timeline || data?.events || []
}
