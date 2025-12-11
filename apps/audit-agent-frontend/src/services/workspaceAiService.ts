import { nlpClient } from '@/services/leader/http'

export type WorkspaceSummaryResponse = {
  answer: string
  contextUsed?: {
    countsPerSection?: Record<string, number>
    workspaceType?: string
    workspaceName?: string
  }
}

export type WorkspaceIdea = {
  title: string
  summary?: string
  suggestion?: string
  platforms?: string[]
}

type SummaryParams = {
  workspaceId?: string | null
  question?: string
}

type InspirationParams = {
  workspaceId?: string | null
  count?: number
}

type MemorySearchParams = {
  workspaceId?: string | null
  query: string
  topK?: number
  types?: string[]
}

export type MemoryMatch = {
  id: string
  type: string
  score: number
  metadata?: Record<string, any>
}

export async function askWorkspaceSummary(params: SummaryParams = {}): Promise<WorkspaceSummaryResponse> {
  const { workspaceId, question } = params
  const { data } = await nlpClient.post('/workspace/summary', {
    workspaceId: workspaceId || undefined,
    question: question || undefined,
  })
  return data as WorkspaceSummaryResponse
}

export async function fetchWorkspaceInspiration(params: InspirationParams = {}): Promise<WorkspaceIdea[]> {
  const { workspaceId, count } = params
  const { data } = await nlpClient.post('/workspace/inspiration', {
    workspaceId: workspaceId || undefined,
    count: count || undefined,
  })
  const ideas: WorkspaceIdea[] = data?.ideas || data?.items || []
  return ideas
}

export async function searchWorkspaceMemory(params: MemorySearchParams): Promise<MemoryMatch[]> {
  const { workspaceId, query, topK, types } = params
  const { data } = await nlpClient.post('/workspace/search', {
    workspaceId: workspaceId || undefined,
    query,
    topK,
    types,
  })
  return data?.matches || []
}
