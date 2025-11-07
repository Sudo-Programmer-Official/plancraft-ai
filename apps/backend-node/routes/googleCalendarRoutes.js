import express from 'express'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import { ensureFreshAccessToken, getUserGoogleIntegration, saveUserGoogleIntegration, disconnectGoogleIntegration } from '../services/googleOAuth.js'
import { listCalendars } from '../services/googleCalendarService.js'
import { syncGoogleAccount } from '../services/calendarSyncService.js'

const router = express.Router()
const ENABLED = String(process.env.ENABLE_GOOGLE_CALENDAR || '').toLowerCase()

router.use(requireAuth, ensureUserMatches)

// GET /api/google/calendars?userId=...
router.get('/google/calendars', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') return res.json({ calendars: [], enabled: false })
    const userId = String(req.query.userId || req?.user?.uid || '')
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const { tokens } = await ensureFreshAccessToken(userId)
    const calendars = await listCalendars(userId, tokens)
    return res.json({ enabled: true, calendars: calendars || [] })
  } catch (e) {
    console.error('GET /google/calendars failed', e)
    return res.status(500).json({ error: e?.message || 'Failed to list calendars' })
  }
})

// POST /api/google/calendars/select
// Body: { userId, selected: [ids], windowDays? }
router.post('/google/calendars/select', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') return res.status(503).json({ error: 'Google Calendar integration disabled' })
    const { userId, selected, windowDays } = req.body || {}
    if (!userId || !Array.isArray(selected)) return res.status(400).json({ error: 'Missing userId or selected[]' })
    const integ = (await getUserGoogleIntegration(String(userId))) || {}
    const calendars = Array.isArray(integ?.calendars) ? integ.calendars.slice() : []
    const selSet = new Set(selected.map(String))
    const updated = calendars.map((c) => ({ ...c, selected: selSet.has(String(c.id)) }))

    const sync = Object.assign(
      { windowDays: Number.isFinite(windowDays) ? Number(windowDays) : (integ?.sync?.windowDays || 30), perCal: integ?.sync?.perCal || {} },
      {}
    )
    // If selection changed, clear syncToken for deselected calendars
    const perCal = sync.perCal || {}
    for (const c of updated) {
      const k = String(c.id)
      perCal[k] = perCal[k] || {}
      if (!c.selected) {
        // not selected → do nothing special
        continue
      }
      // when selecting afresh, leave syncToken as-is if exists; initial backfill will handle if missing
    }

    await saveUserGoogleIntegration(String(userId), {
      ...integ,
      connected: true,
      calendars: updated,
      sync: { ...(integ.sync || {}), ...sync, perCal },
      updatedAt: new Date(),
    })

    return res.json({ ok: true })
  } catch (e) {
    console.error('POST /google/calendars/select failed', e)
    return res.status(500).json({ error: 'Failed to save selection' })
  }
})

// POST /api/google/sync/now
// Body: { userId }
router.post('/google/sync/now', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') return res.status(503).json({ error: 'Google Calendar integration disabled' })
    const { userId } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const stats = await syncGoogleAccount(String(userId))
    return res.json({ ok: true, stats })
  } catch (e) {
    console.error('POST /google/sync/now failed', e)
    return res.status(500).json({ error: e?.message || 'Sync failed' })
  }
})

router.delete('/google/calendars/disconnect', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') return res.status(503).json({ error: 'Google Calendar integration disabled' })
    const userId = String(req.body?.userId || req.query?.userId || req?.user?.uid || '')
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    await disconnectGoogleIntegration(userId)
    return res.json({ ok: true })
  } catch (e) {
    console.error('DELETE /google/calendars/disconnect failed', e)
    return res.status(500).json({ error: e?.message || 'Failed to disconnect Google Calendar' })
  }
})

export default router
