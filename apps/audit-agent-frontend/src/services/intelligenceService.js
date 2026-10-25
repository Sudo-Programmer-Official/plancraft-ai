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

export async function fetchIntelligenceBrief({ agentIds, question, interests, goalContext } = {}) {
  const response = await nlpClient.post('/intelligence/brief', {
    agentIds,
    question: String(question || '').trim(),
    interests: String(interests || '').trim(),
    goalContext: goalContext || null,
  })
  return response?.data || {}
}

