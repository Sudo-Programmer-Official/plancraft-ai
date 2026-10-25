import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getRemoteFeatureFlags } from '../services/featureFlagService.js'
import { getIntelligenceAccess } from '../services/intelligenceUsageService.js'
import { listIntelligenceAgents } from '../services/intelligenceService.js'
import {
  createCustomIntelligenceAgent,
  buildIntelligenceAgentDraft,
  deleteCustomIntelligenceAgent,
  listCustomIntelligenceAgents,
  updateCustomIntelligenceAgent,
} from '../services/intelligenceAgentService.js'
import {
  getTaskResearchMemory,
  saveTaskResearchMemory,
} from '../services/intelligenceTaskMemoryService.js'

const router = express.Router()

async function requireIntelligenceAccess(req, res, next) {
  try {
    const flags = await getRemoteFeatureFlags()
    if (!flags?.flags?.INTELLIGENCE_DESK) {
      return res.status(404).json({ error: 'Intelligence Desk is not enabled' })
    }
    const access = await getIntelligenceAccess(req.user?.uid)
    if (!access.ok) {
      return res.status(403).json({
        error: 'Free Intelligence access is disabled for this account',
        code: 'intelligence_free_access_disabled',
      })
    }
    req.intelligenceAccess = access
    return next()
  } catch (error) {
    console.error('[Intelligence] access check failed', error?.message || error)
    return res.status(500).json({ error: 'Could not verify Intelligence Desk access' })
  }
}

function requirePremiumIntelligenceAccess(req, res, next) {
  if (req.intelligenceAccess?.premium) return next()
  return res.status(403).json({
    error: 'This Intelligence feature is available on Premium',
    code: 'intelligence_premium_required',
  })
}

// Scope authentication and the Intelligence premium gate to this router's
// Intelligence endpoints. This router is mounted at `/api`, so a root-level
// `router.use(requireIntelligenceAccess)` would incorrectly gate unrelated
// routes such as `/api/workspaces` and `/api/feature-flags` for free users.
router.use('/intelligence', requireAuth, requireIntelligenceAccess)

router.get('/intelligence/agents', async (req, res) => {
  try {
    const custom = req.intelligenceAccess?.premium
      ? await listCustomIntelligenceAgents(req.user.uid)
      : []
    return res.json({
      agents: [...listIntelligenceAgents(), ...custom],
      customLimit: req.intelligenceAccess?.premium
        ? Number(process.env.INTELLIGENCE_CUSTOM_AGENTS_LIMIT || 10)
        : 0,
      premium: req.intelligenceAccess?.premium === true,
      usage: {
        used: req.intelligenceAccess?.used || 0,
        limit: req.intelligenceAccess?.limit || 0,
        remaining: req.intelligenceAccess?.remaining || 0,
        period: req.intelligenceAccess?.period || 'month',
      },
    })
  } catch (error) {
    console.error('[Intelligence] failed to list agents', error?.message || error)
    return res.status(500).json({ error: 'Could not load intelligence desks' })
  }
})

router.get('/intelligence/tasks/:taskId/research', requirePremiumIntelligenceAccess, async (req, res) => {
  try {
    const result = await getTaskResearchMemory(req.user.uid, req.params.taskId, {
      title: req.query?.title,
      notes: req.query?.notes,
    })
    return res.json(result)
  } catch (error) {
    console.error('[Intelligence] failed to load task research memory', error?.message || error)
    return res.status(500).json({ error: 'Could not load saved task research' })
  }
})

router.post('/intelligence/tasks/:taskId/research', requirePremiumIntelligenceAccess, async (req, res) => {
  try {
    const memory = await saveTaskResearchMemory(req.user.uid, req.params.taskId, req.body || {})
    return res.status(201).json({ memory })
  } catch (error) {
    console.error('[Intelligence] failed to save task research memory', error?.message || error)
    return res.status(400).json({ error: error?.message || 'Could not save task research' })
  }
})

router.post('/intelligence/agent-draft', requirePremiumIntelligenceAccess, async (req, res) => {
  try {
    return res.json({ draft: buildIntelligenceAgentDraft(req.body || {}) })
  } catch (error) {
    return res.status(400).json({ error: error?.message || 'Could not generate an agent draft' })
  }
})

router.post('/intelligence/agents', requirePremiumIntelligenceAccess, async (req, res) => {
  try {
    const agent = await createCustomIntelligenceAgent(req.user.uid, req.body || {})
    return res.status(201).json({ agent })
  } catch (error) {
    const status = error?.code === 'intelligence_agent_limit_reached' ? 409 : 400
    return res.status(status).json({ error: error?.message || 'Could not create intelligence desk', code: error?.code })
  }
})

router.patch('/intelligence/agents/:agentId', requirePremiumIntelligenceAccess, async (req, res) => {
  try {
    const agent = await updateCustomIntelligenceAgent(req.user.uid, req.params.agentId, req.body || {})
    if (!agent) return res.status(404).json({ error: 'Intelligence desk not found' })
    return res.json({ agent })
  } catch (error) {
    const status = error?.code === 'forbidden' ? 403 : 400
    return res.status(status).json({ error: error?.message || 'Could not update intelligence desk', code: error?.code })
  }
})

router.delete('/intelligence/agents/:agentId', requirePremiumIntelligenceAccess, async (req, res) => {
  try {
    const deleted = await deleteCustomIntelligenceAgent(req.user.uid, req.params.agentId)
    if (!deleted) return res.status(404).json({ error: 'Intelligence desk not found' })
    return res.json({ success: true })
  } catch (error) {
    const status = error?.code === 'forbidden' ? 403 : 400
    return res.status(status).json({ error: error?.message || 'Could not delete intelligence desk', code: error?.code })
  }
})

export default router
