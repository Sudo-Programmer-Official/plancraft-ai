import { buildWorkspaceContext, searchWorkspaceMemory } from '../services/contextEngine.js'

export async function getTodayPulse(req, res, next) {
  try {
    const userId = req.user?.uid || null
    const workspaceId = req.headers['x-workspace-id'] || req.body?.workspaceId || null
    if (!userId || !workspaceId) return res.status(400).json({ success: false, error: 'user/workspace required' })

    const context = await buildWorkspaceContext(userId, workspaceId, {
      tasks: { bucketLimit: 6 },
      events: { limit: 4 },
      napkin: { limit: 4 },
    })

    const priorityTasks = [...(context.tasks?.overdue || []), ...(context.tasks?.open || [])].slice(0, 3)
    const momentum =
      (priorityTasks.length ? 30 : 0) +
      Math.min((context.tasks?.open?.length || 0) * 5, 30) +
      Math.min((context.tasks?.overdue?.length || 0) * 10, 40)

    let resurfaced = null
    try {
      const memory = await searchWorkspaceMemory(userId, workspaceId, 'focus and priorities', { topK: 3 })
      resurfaced = memory[0] || null
    } catch {}

    res.json({
      success: true,
      momentum,
      priorities: priorityTasks,
      resurfaced,
    })
  } catch (err) {
    next(err)
  }
}

export async function getMemoryPulse(req, res, next) {
  try {
    const userId = req.user?.uid || null
    const workspaceId = req.headers['x-workspace-id'] || req.body?.workspaceId || null
    if (!userId || !workspaceId) return res.status(400).json({ success: false, error: 'user/workspace required' })

    let clusters = []
    try {
      const memory = await searchWorkspaceMemory(userId, workspaceId, 'recent ideas and themes', { topK: 12 })
      clusters = memory
        .slice(0, 6)
        .map((m) => ({ title: m.title || m.preview || 'Item', tags: m.tags || [], type: m.type, score: m.score }))
    } catch {}

    res.json({ success: true, clusters })
  } catch (err) {
    next(err)
  }
}

export async function getForwardPulse(req, res, next) {
  try {
    const userId = req.user?.uid || null
    const workspaceId = req.headers['x-workspace-id'] || req.body?.workspaceId || null
    if (!userId || !workspaceId) return res.status(400).json({ success: false, error: 'user/workspace required' })

    const context = await buildWorkspaceContext(userId, workspaceId, {
      tasks: { bucketLimit: 6 },
      events: { limit: 6 },
    })

    res.json({
      success: true,
      load: {
        today: context.tasks?.open?.length || 0,
        upcoming: context.tasks?.upcoming?.length || 0,
        events: context.events?.length || 0,
      },
      note: 'Use this as a lightweight forward view; refine with LLM later.',
    })
  } catch (err) {
    next(err)
  }
}
