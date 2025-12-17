import express from 'express'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import { buildConsentUrl, exchangeCodeForTokens, saveUserGoogleTokens, getUserGoogleIntegration, ensureFreshAccessToken, parseAndVerifyState } from '../services/googleOAuth.js'
import { listCalendars } from '../services/googleCalendarService.js'

const router = express.Router()

// Feature flag guard
const ENABLED = String(process.env.ENABLE_GOOGLE_CALENDAR || '').toLowerCase()

router.get('/google/connect', requireAuth, ensureUserMatches, async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') {
      return res.status(503).json({ error: 'Google Calendar integration disabled by server config' })
    }
    const userId = req.query.userId || req?.user?.uid
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const url = await buildConsentUrl(String(userId))
    try { console.info('[GoogleOAuth] /google/connect', { uid: String(userId), accept: req.headers['accept'], preview: String(url).slice(0, 120) + '…' }) } catch {}
    // If Accept: application/json, return JSON; else redirect for convenience
    const accept = String(req.headers['accept'] || '')
    if (/json/.test(accept)) return res.json({ url })
    return res.redirect(url)
  } catch (e) {
    console.error('GET /google/connect failed', e?.message || e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

// Shared handler for OAuth callback
export async function handleOAuthCallback(req, res) {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') {
      return res.status(503).send('Google Calendar integration disabled by server config')
    }
    const code = String(req.query.code || '')
    const state = String(req.query.state || '')
    const errParam = String(req.query.error || '')

    const successUrl = process.env.GOOGLE_CONNECT_REDIRECT_SUCCESS || process.env.APP_SUCCESS_URL || 'https://plancraftai.com/settings?google=connected'
    const failUrlBase = process.env.GOOGLE_CONNECT_REDIRECT_FAILURE || process.env.APP_FAILURE_URL || 'https://plancraftai.com/settings?google=error'
    const redirectFail = (reason) => {
      const join = failUrlBase.includes('?') ? '&' : '?'
      const url = `${failUrlBase}${join}reason=${encodeURIComponent(reason || 'unknown')}`
      try { console.error('[GoogleOAuth] redirect (fail)', { reason }) } catch {}
      return res.redirect(url)
    }

    try { console.info('[GoogleOAuth] callback hit', { hasCode: !!code, hasState: !!state, error: errParam || null }) } catch {}
    if (errParam) return redirectFail(errParam || 'access_denied')
    if (!code || !state) return redirectFail('missing_params')

    const parsed = await parseAndVerifyState(state)
    if (!parsed?.userId) return redirectFail('invalid_state')
    const userId = parsed.userId
    try { console.info('[GoogleOAuth] state ok → user', userId) } catch {}
    const tokens = await exchangeCodeForTokens(code)
    const integration = await saveUserGoogleTokens(userId, tokens)
    try { console.info('[GoogleOAuth] tokens saved', { uid: userId, hasRefresh: !!tokens?.refresh_token }) } catch {}

    // Prime calendars snapshot on connect (non-fatal if it fails)
    try {
      const primaryAccountId = integration?.primaryAccountId || integration?.accounts?.[0]?.accountId || 'primary'
      const { tokens: freshTokens, account } = await ensureFreshAccessToken(userId, primaryAccountId)
      await listCalendars(userId, freshTokens, account?.accountId || primaryAccountId, { email: account?.accountEmail })
    } catch (e) {
      console.warn('listCalendars after connect failed:', e?.message || e)
    }

    try { console.info('[GoogleOAuth] redirect →', successUrl) } catch {}
    return res.redirect(successUrl)
  } catch (e) {
    const msg = String(e?.message || '')
    let reason = 'exchange_failed'
    if (/invalid[_\s-]?grant/i.test(msg)) reason = 'invalid_grant'
    else if (/invalid[_\s-]?client/i.test(msg)) reason = 'invalid_client'
    else if (/redirect_uri/i.test(msg)) reason = 'redirect_uri_mismatch'
    console.error('GET /google/oauth/callback error', msg)
    const join = (process.env.GOOGLE_CONNECT_REDIRECT_FAILURE || '').includes('?') ? '&' : '?'
    const fail = (process.env.GOOGLE_CONNECT_REDIRECT_FAILURE || process.env.APP_FAILURE_URL || 'https://plancraftai.com/settings?google=error') + `${join}reason=${encodeURIComponent(reason)}`
    try { return res.redirect(fail) } catch {}
    return res.status(500).send('Failed to connect Google')
  }
}

// Primary callback path (unauthenticated)
router.get('/google/oauth/callback', handleOAuthCallback)

// Alias path to support consoles configured with '/api/google-calendar/callback'
router.get('/google-calendar/callback', handleOAuthCallback)

// GET /api/google/status?userId=...
router.get('/google/status', requireAuth, ensureUserMatches, async (req, res) => {
  try {
    const userId = req.query.userId || req?.user?.uid
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const integ = await getUserGoogleIntegration(String(userId))
    const enabled = ENABLED === '1' || ENABLED === 'true'
    return res.json({ integration: { ...(integ || {}), enabled } })
  } catch (e) {
    console.error('GET /google/status failed', e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

export default router
