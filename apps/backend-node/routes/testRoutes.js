import express from 'express'
import { db } from '../services/firebaseAdmin.js'
import { send as sendWhatsApp } from '../services/integrations/whatsappProvider.js'
import { sendPWA } from '../services/integrations/pwaProvider.js'
import { sendEmail } from '../services/integrations/emailProvider.js'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth, ensureUserMatches)

// POST /api/test/notify
// Body: { userId: string, message?: string, channels?: string[] }
// If channels not provided, derives from users/{uid}.preferences.notifications
router.post('/test/notify', async (req, res) => {
  try {
    const { userId, message, channels } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    let useChannels = Array.isArray(channels) ? channels.map(String) : null
    if (!useChannels || useChannels.length === 0) {
      const snap = await db.collection('users').doc(String(userId)).get()
      const data = snap.exists ? snap.data() : {}
      const n = data?.preferences?.notifications || {}
      useChannels = []
      if (n.whatsapp) useChannels.push('whatsapp')
      if (n.email) useChannels.push('email')
      if (n.pwa || n.push) useChannels.push('pwa')
    }

    if (useChannels.length === 0) {
      return res.status(400).json({ error: 'No channels enabled; pass channels or enable in preferences' })
    }

    const text = String(message || '🔔 Test reminder from PlanCraftAI')
    const results = {}

    for (const ch of useChannels) {
      try {
        switch (ch) {
          case 'whatsapp': {
            results.whatsapp = await sendWhatsApp(userId, text)
            break
          }
          case 'email': {
            results.email = await sendEmail(userId, text)
            break
          }
          case 'pwa': {
            results.pwa = await sendPWA(userId, text)
            break
          }
          default:
            results[ch] = { ok: false, error: 'unsupported channel' }
        }
      } catch (e) {
        results[ch] = { ok: false, error: e?.message || String(e) }
      }
    }

    res.json({ ok: true, channels: useChannels, results })
  } catch (err) {
    console.error('[TestNotify] error:', err)
    res.status(500).json({ error: 'server error' })
  }
})

export default router

// Lightweight WhatsApp config + recipient diagnostic (no send)
// GET /api/test/whatsapp/check?userId=uid
router.get('/test/whatsapp/check', async (req, res) => {
  try {
    const userId = String(req.query.userId || '')
    if (!userId) return res.status(400).json({ ok: false, error: 'Missing userId' })

    const token = !!(process.env.META_WHATSAPP_TOKEN || process.env.WHATSAPP_TOKEN)
    const phoneId = !!(process.env.META_WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID)
    const snap = await db.collection('users').doc(userId).get()
    const data = snap.exists ? (snap.data() || {}) : {}
    const to = data?.integrations?.whatsapp?.phone || null
    const prefs = data?.preferences?.notifications || {}
    const enabled = !!prefs?.whatsapp

    return res.json({
      ok: true,
      config: { hasToken: token, hasPhoneId: phoneId },
      user: { hasPhone: !!to, phone: to ? String(to).slice(0, 6) + '…' : null, notificationsWhatsapp: enabled },
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'server error' })
  }
})
