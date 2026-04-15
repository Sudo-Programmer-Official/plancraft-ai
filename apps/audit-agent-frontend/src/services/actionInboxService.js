import api from '@/services/api'
import { ensureAiConsentOrThrow } from '@/services/aiConsentService'
import { trackEvent } from '@/services/analytics'

function unwrapSuggestions(res) {
  return Array.isArray(res?.data?.suggestions) ? res.data.suggestions : []
}

export async function fetchActionInbox({ workspaceId, status = 'pending', limit = 24 } = {}) {
  if (!workspaceId) return []
  const res = await api.get('/action-inbox', {
    params: { workspaceId, status, limit },
  })
  return unwrapSuggestions(res)
}

export async function fetchActionInboxInsights({ workspaceId, days = 30 } = {}) {
  if (!workspaceId) return null
  const res = await api.get('/action-inbox/insights', {
    params: { workspaceId, days },
  })
  return res?.data?.insights || null
}

export async function fetchActionInboxDailyIntent({ workspaceId, limit = 3 } = {}) {
  if (!workspaceId) return null
  const res = await api.get('/action-inbox/daily-intent', {
    params: { workspaceId, limit },
  })
  return res?.data?.intent || null
}

export async function syncActionInbox({ workspaceId, trigger = 'app_open', limit = 24 } = {}) {
  if (!workspaceId) return { reopened: 0, nudged: 0, suggestions: [] }
  const res = await api.post('/action-inbox/sync', {
    workspaceId,
    trigger,
    limit,
  })
  const payload = {
    reopened: Number(res?.data?.reopened) || 0,
    nudged: Number(res?.data?.nudged) || 0,
    suggestions: unwrapSuggestions(res),
  }
  trackEvent('Action Inbox Synced', {
    workspaceId,
    trigger,
    reopened: payload.reopened,
    nudged: payload.nudged,
    visibleSuggestions: payload.suggestions.length,
  })
  return payload
}

export async function sendActionInboxDigest({ workspaceId, force = true } = {}) {
  if (!workspaceId) throw new Error('Workspace is required')
  const res = await api.post('/action-inbox/digest', {
    workspaceId,
    force,
  })
  const payload = {
    sent: res?.data?.sent === true,
    channels: Array.isArray(res?.data?.channels) ? res.data.channels : [],
    reason: res?.data?.reason || null,
    pendingCount: Number(res?.data?.pendingCount) || 0,
    focusTitle: res?.data?.focusTitle || '',
  }
  trackEvent('Action Inbox Digest Requested', {
    workspaceId,
    sent: payload.sent,
    channels: payload.channels,
    pendingCount: payload.pendingCount,
    reason: payload.reason,
  })
  return payload
}

export async function detectActionInboxSuggestions(payload = {}) {
  await ensureAiConsentOrThrow({ source: 'action-inbox-detect' })
  const res = await api.post('/action-inbox/detect', payload)
  const suggestions = unwrapSuggestions(res)
  trackEvent('Action Inbox Suggestions Detected', {
    workspaceId: payload?.workspaceId || null,
    sourceType: payload?.sourceType || 'note',
    sourceLabel: payload?.sourceLabel || 'note',
    suggestionCount: suggestions.length,
  })
  return suggestions
}

export async function confirmActionInboxSuggestion(id, payload = {}) {
  if (!id) throw new Error('Suggestion id is required')
  const res = await api.post(`/action-inbox/${id}/confirm`, payload)
  const response = {
    task: res?.data?.task || null,
    suggestion: res?.data?.suggestion || null,
  }
  trackEvent('Action Inbox Suggestion Confirmed', {
    suggestionId: id,
    workspaceId: payload?.workspaceId || null,
    taskId: response.task?.id || null,
    category: response.suggestion?.category || payload?.category || null,
    confidence: response.suggestion?.confidenceScore ?? null,
    hadDueDate: !!(response.suggestion?.dueDate || payload?.date),
  })
  return response
}

export async function ignoreActionInboxSuggestion(id, payload = {}) {
  if (!id) throw new Error('Suggestion id is required')
  const res = await api.post(`/action-inbox/${id}/ignore`, payload)
  const suggestion = res?.data?.suggestion || null
  trackEvent('Action Inbox Suggestion Ignored', {
    suggestionId: id,
    workspaceId: payload?.workspaceId || null,
    category: suggestion?.category || null,
    confidence: suggestion?.confidenceScore ?? null,
    ignoreCount: suggestion?.ignoreCount ?? null,
    resurfacePlanned: !!suggestion?.nextReviewAt,
  })
  return suggestion
}
