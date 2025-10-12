import express from 'express'
import { providers } from '../services/integrations/index.js'
import { sendNotification } from '../services/notificationService.js'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth, ensureUserMatches)

// POST /api/integrations/test
// { userId, channel: 'whatsapp'|'slack'|'all', message?, to? }
router.post('/integrations/test', async (req, res) => {
  try {
    const { userId, channel = 'all', message = 'Test from PlanCraftAI', to } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    // Direct provider call for single channel with overrides
    if (channel !== 'all' && providers[channel]) {
      const out = await providers[channel].send(userId, message, { to })
      return res.json({ ok: true, channel, result: out })
    }

    const out = await sendNotification(userId, message, 'all', { whatsapp: { to } })
    res.json({ ok: true, result: out })
  } catch (err) {
    console.error('integrations/test error', err)
    res.status(500).json({ error: 'Failed to send test notification' })
  }
})

export default router
