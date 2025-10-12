import express from 'express'
import { db } from '../services/firebaseAdmin.js'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth, ensureUserMatches)

// POST /api/settings/updatePreferences
router.post('/settings/updatePreferences', async (req, res) => {
  try {
    const { userId, preferences } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    await db.collection('users').doc(userId).set(
      {
        preferences: {
          notifications: {
            email: !!preferences?.notifications?.email,
            push: !!preferences?.notifications?.push,
            whatsapp: !!preferences?.notifications?.whatsapp,
            discord: !!preferences?.notifications?.discord,
            calls: !!preferences?.notifications?.calls,
          },
          integrations: {
            googleCalendar: !!preferences?.integrations?.googleCalendar,
            slack: !!preferences?.integrations?.slack,
            discord: !!preferences?.integrations?.discord,
            outlook: !!preferences?.integrations?.outlook,
            whatsapp: !!preferences?.integrations?.whatsapp,
          },
        },
        updatedAt: new Date(),
      },
      { merge: true }
    )

    res.json({ success: true })
  } catch (err) {
    console.error('❌ updatePreferences error:', err)
    res.status(500).json({ error: 'Failed to update preferences' })
  }
})

// GET /api/settings/preferences?userId=...
router.get('/settings/preferences', async (req, res) => {
  try {
    const { userId } = req.query || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    res.json({ preferences: data?.preferences || {} })
  } catch (err) {
    console.error('❌ getPreferences error:', err)
    res.status(500).json({ error: 'Failed to fetch preferences' })
  }
})

// export default at end of file after route registrations

// POST /api/settings/updateIntegrations
router.post('/settings/updateIntegrations', async (req, res) => {
  try {
    const { userId, integrations } = req.body || {}
    console.log('[Settings API] updateIntegrations body', {
      hasUserId: !!userId,
      keys: integrations && typeof integrations === 'object' ? Object.keys(integrations) : null,
      whatsappPhone: integrations?.whatsapp?.phone ? String(integrations.whatsapp.phone).slice(0, 6) + '…' : null,
    })

    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    if (!integrations || typeof integrations !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid integrations object' })
    }

    // Normalize + validate
    const toStr = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v))
    const trimUndef = (v) => (toStr(v).trim() || undefined)
    const e164 = /^\+?[0-9]{8,15}$/
    const errs = []

    const wPhone = trimUndef(integrations?.whatsapp?.phone)
    if (wPhone && !e164.test(wPhone)) errs.push('whatsapp.phone must be E.164, e.g. +12135551234')

    const sPhone = trimUndef(integrations?.sms?.phone)
    if (sPhone && !e164.test(sPhone)) errs.push('sms.phone must be E.164, e.g. +12135551234')

    const dHook = trimUndef(integrations?.discord?.webhook)
    if (dHook && !/^https:\/\/discord\.com\/api\/webhooks\//.test(dHook)) errs.push('discord.webhook must start with https://discord.com/api/webhooks/')

    if (errs.length) return res.status(400).json({ error: 'Invalid fields', details: errs })

    // PWA subscriptions: array of { endpoint, keys: { p256dh, auth } }
    const pwaSubs = Array.isArray(integrations?.pwa?.subscriptions)
      ? integrations.pwa.subscriptions
          .map((s) => ({
            endpoint: trimUndef(s?.endpoint),
            keys:
              s?.keys && typeof s.keys === 'object'
                ? { p256dh: trimUndef(s.keys.p256dh), auth: trimUndef(s.keys.auth) }
                : undefined,
          }))
          .filter((s) => s.endpoint && s.keys?.p256dh && s.keys?.auth)
      : undefined

    // Build object and prune undefined deeply to satisfy Firestore
    const safe = {
      whatsapp: { phone: wPhone },
      sms: { phone: sPhone },
      discord: { webhook: dHook },
      slack: {
        userId: trimUndef(integrations?.slack?.userId),
        token: trimUndef(integrations?.slack?.token),
      },
      email: trimUndef(integrations?.email),
      pwa: pwaSubs ? { subscriptions: pwaSubs } : undefined,
    }

    const pruneUndefinedDeep = (obj) => {
      if (obj == null) return obj
      if (Array.isArray(obj)) {
        const arr = obj.map(pruneUndefinedDeep).filter((v) => v !== undefined)
        return arr
      }
      if (typeof obj === 'object') {
        const out = {}
        for (const [k, v] of Object.entries(obj)) {
          const pv = pruneUndefinedDeep(v)
          if (pv === undefined) continue
          if (typeof pv === 'object' && pv !== null && !Array.isArray(pv) && Object.keys(pv).length === 0) continue
          out[k] = pv
        }
        return out
      }
      return obj
    }

    const payload = pruneUndefinedDeep({ integrations: safe, updatedAt: new Date() })

    await db.collection('users').doc(String(userId)).set(
      payload,
      { merge: true }
    )

    res.json({ success: true })
  } catch (err) {
    console.error('❌ updateIntegrations error:', err)
    res.status(500).json({ error: err?.message || 'Failed to update integrations' })
  }
})

// GET /api/settings/integrations?userId=...
router.get('/settings/integrations', async (req, res) => {
  try {
    const { userId } = req.query || {}
    console.log('[Settings API] getIntegrations query', { hasUserId: !!userId })
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    res.json({ integrations: data?.integrations || {} })
  } catch (err) {
    console.error('❌ getIntegrations error:', err)
    res.status(500).json({ error: 'Failed to fetch integrations' })
  }
})

export default router
