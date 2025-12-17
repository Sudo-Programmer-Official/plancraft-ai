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
    const accountId = req.query.accountId ? String(req.query.accountId) : null
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const { tokens, account, integration } = await ensureFreshAccessToken(userId, accountId || undefined)
    const calendars = await listCalendars(userId, tokens, account?.accountId || accountId || integration?.primaryAccountId || 'primary', { email: account?.accountEmail })
    return res.json({
      enabled: true,
      calendars: calendars || [],
      accountId: account?.accountId || accountId || integration?.primaryAccountId || 'primary',
      accounts: integration?.accounts || [],
    })
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
    const { userId, selected, windowDays, accountId } = req.body || {}
    if (!userId || !Array.isArray(selected)) return res.status(400).json({ error: 'Missing userId or selected[]' })
    const integ = (await getUserGoogleIntegration(String(userId))) || {}
    const targetAccountId = accountId || integ.primaryAccountId || 'primary'
    const accounts = Array.isArray(integ.accounts) ? integ.accounts.slice() : []
    const idx = accounts.findIndex((a) => String(a.accountId) === String(targetAccountId))
    const account = idx >= 0 ? accounts[idx] : { accountId: targetAccountId, calendars: [], sync: { perCal: {}, windowDays: 30 } }
    const calendars = Array.isArray(account?.calendars) ? account.calendars.slice() : []
    const selSet = new Set(selected.map(String))
    const updated = calendars.map((c) => ({ ...c, selected: selSet.has(String(c.id)) }))

    const sync = Object.assign(
      { windowDays: Number.isFinite(windowDays) ? Number(windowDays) : (account?.sync?.windowDays || 30), perCal: account?.sync?.perCal || {} },
      {}
    )
    const perCal = sync.perCal || {}
    for (const c of updated) {
      const k = String(c.id)
      perCal[k] = perCal[k] || {}
      if (!c.selected) continue
    }

    const mergedAccount = {
      ...account,
      accountId: targetAccountId,
      calendars: updated,
      sync: { ...(account?.sync || {}), ...sync, perCal },
      connected: true,
      updatedAt: new Date(),
    }
    if (idx >= 0) accounts.splice(idx, 1, mergedAccount)
    else accounts.push(mergedAccount)

    await saveUserGoogleIntegration(String(userId), {
      ...integ,
      accounts,
      connected: accounts.some((a) => a.connected),
      primaryAccountId: integ.primaryAccountId || targetAccountId,
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
    const { userId, accountId } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const stats = await syncGoogleAccount(String(userId), { accountId: accountId || undefined })
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
    const accountId = req.body?.accountId || req.query?.accountId || null
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    await disconnectGoogleIntegration(userId, accountId)
    return res.json({ ok: true })
  } catch (e) {
    console.error('DELETE /google/calendars/disconnect failed', e)
    return res.status(500).json({ error: e?.message || 'Failed to disconnect Google Calendar' })
  }
})

export default router
