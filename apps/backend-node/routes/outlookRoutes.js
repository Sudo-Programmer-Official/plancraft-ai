import express from 'express'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import {
  buildOutlookConsentUrl,
  exchangeCodeForTokens,
  saveUserOutlookTokens,
  getUserOutlookIntegration,
  parseAndVerifyState,
  disconnectOutlookIntegration,
} from '../services/outlookOAuth.js'
import { syncOutlookAccount } from '../services/calendarSyncService.js'

const router = express.Router()
const ENABLED = String(process.env.ENABLE_OUTLOOK_CALENDAR || '').toLowerCase()

router.use(requireAuth, ensureUserMatches)

// POST /api/integrations/outlook/connect
router.post('/integrations/outlook/connect', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') {
      return res.status(503).json({ error: 'Outlook Calendar integration disabled by server config' })
    }
    const userId = req.body?.userId || req?.user?.uid
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const url = await buildOutlookConsentUrl(String(userId))
    const accept = String(req.headers['accept'] || '')
    if (/json/.test(accept)) return res.json({ url })
    return res.redirect(url)
  } catch (e) {
    console.error('POST /integrations/outlook/connect failed', e?.message || e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

// GET /api/integrations/outlook/status
router.get('/integrations/outlook/status', async (req, res) => {
  try {
    const userId = req.query.userId || req?.user?.uid
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const integ = await getUserOutlookIntegration(String(userId))
    const enabled = ENABLED === '1' || ENABLED === 'true'
    return res.json({ integration: { ...(integ || {}), enabled } })
  } catch (e) {
    console.error('GET /integrations/outlook/status failed', e?.message || e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

// POST /api/integrations/outlook/sync
router.post('/integrations/outlook/sync', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') {
      return res.status(503).json({ error: 'Outlook Calendar integration disabled' })
    }
    const { userId, accountId } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const stats = await syncOutlookAccount(String(userId), { accountId: accountId || undefined })
    return res.json({ ok: true, stats })
  } catch (e) {
    console.error('POST /integrations/outlook/sync failed', e?.message || e)
    return res.status(500).json({ error: e?.message || 'Sync failed' })
  }
})

// POST /api/integrations/outlook/disconnect
router.post('/integrations/outlook/disconnect', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') {
      return res.status(503).json({ error: 'Outlook Calendar integration disabled' })
    }
    const userId = req.body?.userId || req.query?.userId || req?.user?.uid
    const accountId = req.body?.accountId || req.query?.accountId || null
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    await disconnectOutlookIntegration(String(userId), accountId)
    return res.json({ ok: true })
  } catch (e) {
    console.error('POST /integrations/outlook/disconnect failed', e?.message || e)
    return res.status(500).json({ error: e?.message || 'Failed to disconnect Outlook' })
  }
})

// Public callback handler
export async function handleOutlookOAuthCallback(req, res) {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') {
      return res.status(503).send('Outlook Calendar integration disabled by server config')
    }
    const code = String(req.query.code || '')
    const state = String(req.query.state || '')
    const errParam = String(req.query.error || '')

    const successUrl = process.env.OUTLOOK_CONNECT_REDIRECT_SUCCESS || process.env.APP_SUCCESS_URL || 'https://plancraftai.com/settings?outlook=connected'
    const failUrlBase = process.env.OUTLOOK_CONNECT_REDIRECT_FAILURE || process.env.APP_FAILURE_URL || 'https://plancraftai.com/settings?outlook=error'
    const redirectFail = (reason) => {
      const join = failUrlBase.includes('?') ? '&' : '?'
      const url = `${failUrlBase}${join}reason=${encodeURIComponent(reason || 'unknown')}`
      try { console.error('[OutlookOAuth] redirect (fail)', { reason }) } catch {}
      return res.redirect(url)
    }

    if (errParam) return redirectFail(errParam || 'access_denied')
    if (!code || !state) return redirectFail('missing_params')

    const parsed = await parseAndVerifyState(state)
    if (!parsed?.userId) return redirectFail('invalid_state')
    const userId = parsed.userId
    const tokens = await exchangeCodeForTokens(code)
    await saveUserOutlookTokens(userId, tokens)
    try { console.info('[OutlookOAuth] tokens saved', { uid: userId, hasRefresh: !!tokens?.refresh_token }) } catch {}
    return res.redirect(successUrl)
  } catch (e) {
    const reason = e?.message || 'exchange_failed'
    console.error('GET /outlook/oauth/callback error', reason)
    const failBase = process.env.OUTLOOK_CONNECT_REDIRECT_FAILURE || process.env.APP_FAILURE_URL || 'https://plancraftai.com/settings?outlook=error'
    const join = failBase.includes('?') ? '&' : '?'
    const fail = `${failBase}${join}reason=${encodeURIComponent(reason)}`
    try { return res.redirect(fail) } catch {}
    return res.status(500).send('Failed to connect Outlook')
  }
}

export default router
