import { buildWorkspaceContext, searchWorkspaceMemory } from '../services/contextEngine.js'
import { classifyIntent, buildOrchestrationPrompt, parseDecision } from '../services/orchestrator.js'
import { runLlm } from '../services/llmClient.js'
import { logAiEvent } from '../firestore/aiLogsRepository.js'

/**
 * POST /api/ai/orchestrate
 * Body: { userId?, workspaceId, input: { text?, voiceUrl? }, source }
 */
export async function orchestrate(req, res, next) {
  try {
    const userId = req.user?.uid || req.body?.userId || 'anon'
    const workspaceId =
      req.headers['x-workspace-id'] || req.body?.workspaceId || req.query?.workspaceId || null
    const source = req.body?.source || 'planner'
    const input = req.body?.input || {}
    const text = input.text || ''

    if (!workspaceId) return res.status(400).json({ success: false, error: 'workspaceId required' })
    if (!text && !input.voiceUrl)
      return res.status(400).json({ success: false, error: 'input text or voiceUrl required' })

    // Intent classification (lightweight)
    const intent = await classifyIntent(text, source)

    // Always fetch workspace context
    const context = await buildWorkspaceContext(userId, workspaceId, {
      tasks: { bucketLimit: 8 },
      napkin: { limit: 6 },
      drafts: { limit: 6 },
      events: { limit: 6 },
    })

    // Conditional memory
    let memoryHits = []
    const memoryIntents = ['recall', 'reflect', 'plan', 'team']
    if (memoryIntents.includes(intent)) {
      try {
        memoryHits = await searchWorkspaceMemory(userId, workspaceId, text || 'workspace recall', {
          topK: 6,
        })
      } catch (_) {
        memoryHits = []
      }
    }
    if (memoryHits.length) context.memoryHits = memoryHits

    const { systemPrompt, userPrompt } = buildOrchestrationPrompt({
      intent,
      source,
      inputText: text,
      context,
      memory: memoryHits,
    })

    const llmText = await runLlm(systemPrompt, userPrompt)
    const decision = parseDecision(llmText)

    try {
      await logAiEvent({
        userId,
        workspaceId,
        route: 'ai.orchestrate',
        contextSummary: {
          intent,
          memoryUsed: !!memoryHits.length,
          memoryCount: memoryHits.length,
          tasksOpen: context.tasks?.open?.length || 0,
          tasksUpcoming: context.tasks?.upcoming?.length || 0,
          tasksOverdue: context.tasks?.overdue?.length || 0,
        },
      })
    } catch {}

    res.json({
      success: true,
      intent,
      contextUsed: {
        memory: memoryHits.length,
        tasks: (context.tasks?.open || []).length + (context.tasks?.upcoming || []).length + (context.tasks?.overdue || []).length,
      },
      response: decision,
      raw: llmText,
    })
  } catch (err) {
    next(err)
  }
}
