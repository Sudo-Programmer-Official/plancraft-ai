import { buildWorkspaceContext } from '../services/contextEngine.js'
import {
  buildWorkspaceInspirationPrompt,
  buildWorkspaceSummaryPrompt,
  // buildWorkspaceSummaryPrompt now supports memoryHits
  parseIdeasOutput,
} from '../services/contextPrompts.js'
import { runLlm } from '../services/llmClient.js'
import { logAiEvent } from '../firestore/aiLogsRepository.js'
import { logger } from '../utils/logger.js'
import { searchWorkspaceMemory } from '../services/contextEngine.js'

const MEMORY_CONTEXT_ENABLED = process.env.ENABLE_MEMORY_CONTEXT !== '0'

function resolveWorkspaceId(req) {
  return req.headers['x-workspace-id'] || req.body?.workspaceId || req.query?.workspaceId || null
}

function toCounts(context) {
  return {
    tasksOpen: context?.tasks?.open?.length || 0,
    tasksUpcoming: context?.tasks?.upcoming?.length || 0,
    tasksOverdue: context?.tasks?.overdue?.length || 0,
    napkin: context?.napkin?.length || 0,
    drafts: context?.drafts?.length || 0,
    events: context?.events?.length || 0,
    issues: context?.issues?.length || 0,
  }
}

export async function summarizeWorkspace(req, res, next) {
  try {
    const userId = req.user?.uid || null
    const workspaceId = resolveWorkspaceId(req)
    const question = req.body?.question || req.body?.prompt || ''
    const timezone = req.headers['x-user-tz'] || req.body?.timezone || 'UTC'

    if (!userId) return res.status(400).json({ success: false, error: 'Missing user id' })
    if (!workspaceId) return res.status(400).json({ success: false, error: 'workspaceId required' })

    const context = await buildWorkspaceContext(userId, workspaceId, {
      timezone,
      tasks: { timezone, limit: 40, bucketLimit: 8 },
      napkin: { limit: 6 },
      drafts: { limit: 6 },
      events: { limit: 6 },
    })

    if (MEMORY_CONTEXT_ENABLED) {
      try {
        context.memoryHits = await searchWorkspaceMemory(
          userId,
          workspaceId,
          question || 'focus and priorities',
          { topK: 6 },
        )
      } catch (err) {
        logger.error('[workspace] memory search failed', err?.message || err)
      }
    }

    const { systemPrompt, userPrompt } = buildWorkspaceSummaryPrompt(context, question)
    const answer = await runLlm(systemPrompt, userPrompt)
    const counts = toCounts(context)

    try {
      await logAiEvent({
        userId,
        workspaceId,
        route: 'workspace.summary',
        inputQuestion: question || null,
        contextSummary: counts,
      })
    } catch (err) {
      logger.error('[workspace] failed to log summary', err?.message || err)
    }

    res.json({
      success: true,
      answer,
      contextUsed: {
        countsPerSection: counts,
        workspaceType: context.workspaceType,
        workspaceName: context.workspaceName,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function workspaceInspiration(req, res, next) {
  try {
    const userId = req.user?.uid || null
    const workspaceId = resolveWorkspaceId(req)
    const count = Math.min(Math.max(Number(req.body?.count) || 5, 1), 10)

    if (!userId) return res.status(400).json({ success: false, error: 'Missing user id' })
    if (!workspaceId) return res.status(400).json({ success: false, error: 'workspaceId required' })

    const context = await buildWorkspaceContext(userId, workspaceId, {
      drafts: { limit: 6 },
      napkin: { limit: 8 },
    })
    if (MEMORY_CONTEXT_ENABLED) {
      try {
        context.memoryHits = await searchWorkspaceMemory(
          userId,
          workspaceId,
          'content ideas and inspiration',
          { topK: 6, types: ['napkin', 'draft'] },
        )
      } catch (err) {
        logger.error('[workspace] memory search failed', err?.message || err)
      }
    }
    const { systemPrompt, userPrompt } = buildWorkspaceInspirationPrompt(context, { count })
    const raw = await runLlm(systemPrompt, userPrompt)
    const ideas = parseIdeasOutput(raw, count)

    const counts = {
      drafts: context?.drafts?.length || 0,
      napkin: context?.napkin?.length || 0,
    }

    try {
      await logAiEvent({
        userId,
        workspaceId,
        route: 'workspace.inspiration',
        contextSummary: { ...counts, requested: count, generated: ideas.length },
      })
    } catch (err) {
      logger.error('[workspace] failed to log inspiration', err?.message || err)
    }

    res.json({
      success: true,
      ideas,
      raw,
      contextUsed: { countsPerSection: counts },
    })
  } catch (err) {
    next(err)
  }
}
