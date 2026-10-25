import api from '@/services/api'
import { nlpClient } from '@/services/leader/http'

export const INTELLIGENCE_AGENTS = [
  {
    id: 'tech-news',
    label: 'Tech news',
    description: 'What changed in technology today',
  },
  {
    id: 'capital-flows',
    label: 'Capital flows',
    description: 'Where money is moving in tech',
  },
  {
    id: 'ai-chips',
    label: 'AI & chips',
    description: 'Compute, models, chips, and capacity',
  },
  {
    id: 'startup-signals',
    label: 'Startup signals',
    description: 'Launches, funding, and ecosystem shifts',
  },
]

export const INTELLIGENCE_AGENT_TEMPLATES = [
  {
    id: 'market-context',
    label: 'Market context companion',
    description: 'News, macro events, catalysts, and uncertainty for a trading watchlist.',
    name: 'F&O Market Context',
    searchFocus: 'NIFTY, BANK NIFTY, expiry events, RBI, global markets, company announcements, and major catalysts',
    prompt: 'Act as a read-only market research companion. Track relevant news, macro events, company announcements, and possible catalysts. Explain what changed, cite the evidence, identify conflicting signals, and clearly state what is unknown. Do not provide buy, sell, entry, exit, target, stop-loss, or guaranteed-return recommendations.',
    outputStyle: 'brief',
  },
  {
    id: 'company-watch',
    label: 'Company watch',
    description: 'A focused brief for one company, product, competitor, or sector.',
    name: 'Company Watch',
    searchFocus: 'product launches, pricing, customers, hiring, funding, partnerships, competitors, and risks',
    prompt: 'Track meaningful developments for the company or sector I specify. Prioritize primary sources, explain what changed, distinguish fact from interpretation, and describe the practical implication for an operator.',
    outputStyle: 'brief',
  },
  {
    id: 'industry-pulse',
    label: 'Industry pulse',
    description: 'A recurring research brief for a market, profession, or theme.',
    name: 'Industry Pulse',
    searchFocus: 'regulation, demand, technology shifts, funding, customers, jobs, and emerging risks',
    prompt: 'Research the industry I specify and surface the few developments most likely to matter. Include dates and sources, explain why each item matters, and call out weak or conflicting evidence instead of overstating certainty.',
    outputStyle: 'brief',
  },
]

export async function fetchIntelligenceBrief({ agentIds, customAgentIds = [], question, interests, goalContext } = {}) {
  const response = await nlpClient.post('/intelligence/brief', {
    agentIds,
    customAgentIds,
    question: String(question || '').trim(),
    interests: String(interests || '').trim(),
    goalContext: goalContext || null,
  })
  return response?.data || {}
}

export async function fetchIntelligenceAgents() {
  const response = await api.get('/intelligence/agents')
  return {
    agents: Array.isArray(response?.data?.agents) ? response.data.agents : [],
    customLimit: Number(response?.data?.customLimit || 10),
  }
}

export async function generateIntelligenceAgentDraft(useCase, outputStyle = 'brief') {
  const response = await api.post('/intelligence/agent-draft', { useCase, outputStyle })
  return response?.data?.draft || null
}

export async function createIntelligenceAgent(payload = {}) {
  const response = await api.post('/intelligence/agents', payload)
  return response?.data?.agent || null
}

export async function updateIntelligenceAgent(agentId, payload = {}) {
  if (!agentId) throw new Error('updateIntelligenceAgent requires agentId')
  const response = await api.patch(`/intelligence/agents/${encodeURIComponent(agentId)}`, payload)
  return response?.data?.agent || null
}

export async function deleteIntelligenceAgent(agentId) {
  if (!agentId) throw new Error('deleteIntelligenceAgent requires agentId')
  return api.delete(`/intelligence/agents/${encodeURIComponent(agentId)}`)
}

export async function fetchIntelligenceGoals() {
  const response = await api.get('/intelligence/goals')
  return Array.isArray(response?.data?.goals) ? response.data.goals : []
}

export async function linkIntelligenceTask(goalId, linkedTasks) {
  if (!goalId) return null
  const response = await api.patch(`/intelligence/goals/${encodeURIComponent(goalId)}`, {
    linkedTasks,
    source: 'intelligence',
  })
  return response?.data?.goal || null
}

