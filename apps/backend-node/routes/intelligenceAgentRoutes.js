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
        error: 'Intelligence Desk requires a Premium plan',
        code: 'intelligence_premium_required',
      })
    }
    req.intelligenceAccess = access
    return next()
  } catch (error) {
    console.error('[Intelligence] access check failed', error?.message || error)
    return res.status(500).json({ error: 'Could not verify Intelligence Desk access' })
  }
}

// Scope authentication and the Intelligence premium gate to this router's
// Intelligence endpoints. This router is mounted at `/api`, so a root-level
// `router.use(requireIntelligenceAccess)` would incorrectly gate unrelated
// routes such as `/api/workspaces` and `/api/feature-flags` for free users.
router.use('/intelligence', requireAuth, requireIntelligenceAccess)

router.get('/intelligence/agents', async (req, res) => {
  try {
    const custom = await listCustomIntelligenceAgents(req.user.uid)
    return res.json({
      agents: [...listIntelligenceAgents(), ...custom],
      customLimit: Number(process.env.INTELLIGENCE_CUSTOM_AGENTS_LIMIT || 10),
    })
  } catch (error) {
    console.error('[Intelligence] failed to list agents', error?.message || error)
    return res.status(500).json({ error: 'Could not load intelligence desks' })
  }
})

router.post('/intelligence/agent-draft', async (req, res) => {
  try {
    return res.json({ draft: buildIntelligenceAgentDraft(req.body || {}) })
  } catch (error) {
    return res.status(400).json({ error: error?.message || 'Could not generate an agent draft' })
  }
})

router.post('/intelligence/agents', async (req, res) => {
  try {
    const agent = await createCustomIntelligenceAgent(req.user.uid, req.body || {})
    return res.status(201).json({ agent })
  } catch (error) {
    const status = error?.code === 'intelligence_agent_limit_reached' ? 409 : 400
    return res.status(status).json({ error: error?.message || 'Could not create intelligence desk', code: error?.code })
  }
})

router.patch('/intelligence/agents/:agentId', async (req, res) => {
  try {
    const agent = await updateCustomIntelligenceAgent(req.user.uid, req.params.agentId, req.body || {})
    if (!agent) return res.status(404).json({ error: 'Intelligence desk not found' })
    return res.json({ agent })
  } catch (error) {
    const status = error?.code === 'forbidden' ? 403 : 400
    return res.status(status).json({ error: error?.message || 'Could not update intelligence desk', code: error?.code })
  }
})

router.delete('/intelligence/agents/:agentId', async (req, res) => {
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
