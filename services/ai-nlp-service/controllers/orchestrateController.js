import { buildWorkspaceContext, searchWorkspaceMemory } from '../services/contextEngine.js'
import { classifyIntent, buildOrchestrationPrompt, parseDecision } from '../services/orchestrator.js'
import { runLlm } from '../services/llmClient.js'
import { logAiEvent } from '../firestore/aiLogsRepository.js'
import { ensureApp } from '../utils/firebase.js'
import admin from 'firebase-admin'
import { knowledgeSearch } from '../services/knowledgeSearch.js'

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
    const useKnowledge = req.body?.useKnowledge !== false
    const docId = req.body?.docId || req.query?.docId || null

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

    let knowledgeHits = []
    const knowledgeIntents = ['plan', 'recall', 'reflect', 'team', 'req_to_tasks', 'change_impact']
    if (useKnowledge && knowledgeIntents.includes(intent)) {
      try {
        const knowledgeResult = await knowledgeSearch(workspaceId, text || input.voiceUrl || '', 6, docId)
        knowledgeHits = knowledgeResult?.items || []
      } catch (err) {
        console.warn('[Orchestrate] knowledge search failed', err?.message || err)
      }
    }

    const { systemPrompt, userPrompt } = buildOrchestrationPrompt({
      intent,
      source,
      inputText: text,
      context,
      memory: memoryHits,
      knowledge: knowledgeHits,
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
          knowledgeUsed: !!knowledgeHits.length,
          knowledgeCount: knowledgeHits.length,
          tasksOpen: context.tasks?.open?.length || 0,
          tasksUpcoming: context.tasks?.upcoming?.length || 0,
          tasksOverdue: context.tasks?.overdue?.length || 0,
        },
      })
    } catch {}
    try {
      if (knowledgeHits.length) {
        ensureApp()
        const db = admin.firestore()
        await db.collection('knowledge_usage_logs').add({
          workspaceId,
          userId,
          type: 'orchestrator_snippets',
          intent,
          hits: knowledgeHits.length,
          createdAt: new Date(),
        })
      }
    } catch {}

    res.json({
      success: true,
      intent,
      contextUsed: {
        memory: memoryHits.length,
        knowledge: knowledgeHits.length,
        tasks: (context.tasks?.open || []).length + (context.tasks?.upcoming || []).length + (context.tasks?.overdue || []).length,
      },
      response: decision,
      raw: llmText,
      knowledgeHits,
    })
  } catch (err) {
    next(err)
  }
}
