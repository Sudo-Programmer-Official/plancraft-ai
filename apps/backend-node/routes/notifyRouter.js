import express from 'express'
import { send as sendWhatsApp } from '../services/integrations/whatsappProvider.js'
import { sendPWA } from '../services/integrations/pwaProvider.js'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'

const router = express.Router()

router.use(requireAuth, ensureUserMatches)

router.post('/task-created', async (req, res) => {
  try {
    const { userId, taskIds = [], channels = [] } = req.body || {}
    if (!userId || !Array.isArray(taskIds) || !taskIds.length) return res.json({ ok: true })

    const allowed = new Set(['whatsapp', 'pwa'])
    const safeChannels = Array.isArray(channels)
      ? Array.from(
          new Set(
            channels
              .map((ch) => String(ch).toLowerCase())
              .filter((ch) => allowed.has(ch))
          )
        ).slice(0, 2)
      : []
    if (!safeChannels.length) return res.json({ ok: true })

    const body = `You created ${taskIds.length} new task${taskIds.length === 1 ? '' : 's'}.`

    await Promise.allSettled(
      safeChannels.map((channel) => {
        if (channel === 'whatsapp') {
          return sendWhatsApp(userId, body)
        }
        if (channel === 'pwa') {
          return sendPWA(userId, {
            title: 'Tasks created',
            body,
            data: { taskIds },
          })
        }
        return Promise.resolve()
      })
    )

    res.json({ ok: true })
  } catch (e) {
    console.error('[notify] creation ping failed', e?.message || e)
    res.json({ ok: true })
  }
})

export default router
