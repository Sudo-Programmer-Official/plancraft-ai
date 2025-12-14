import api from '@/services/api'
import { useWorkspaceStore } from '@/stores/workspaceStore'

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return []
  return history
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const role = entry.role === 'assistant' ? 'assistant' : 'user'
      const content = typeof entry.content === 'string' ? entry.content : entry.text || ''
      if (!content) return null
      return {
        role,
        content: content.slice(0, 2000),
      }
    })
    .filter(Boolean)
}

export async function queryPlannerAssistant(query, options = {}) {
  const text = typeof query === 'string' ? query : String(query || '')
  let workspaceId = options.workspaceId
  if (!workspaceId) {
    try {
      const store = useWorkspaceStore()
      workspaceId = store?.activeWorkspaceId || localStorage.getItem('activeWorkspaceId') || null
    } catch {
      try {
        workspaceId = localStorage.getItem('activeWorkspaceId')
      } catch {
        workspaceId = null
      }
    }
  }
  const payload = {
    message: text,
    query: text,
    userId: options.userId,
    history: normalizeHistory(options.history),
    clientTimezone: options.clientTimezone,
    clientNow: options.clientNow,
    workspaceId,
  }

  try {
    const res = await api.post('/talk/chat', payload)
    const data = res?.data || {}
    return {
      reply: typeof data.reply === 'string' && data.reply ? data.reply : typeof data.aiMessage === 'string' ? data.aiMessage : '',
      actions: Array.isArray(data.actions) ? data.actions : [],
      intent: data.intent || data.action || null,
      contextSummary: data.contextSummary || data.context || null,
      raw: data,
    }
  } catch (err) {
    const message =
      err?.response?.data?.error ||
      err?.message ||
      'The planner assistant could not respond right now.'
    throw new Error(message)
  }
}
