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
    // If Accept: application/json, return JSON; else redirect for convenience
    const accept = String(req.headers['accept'] || '')
    if (/json/.test(accept)) return res.json({ url })
    return res.redirect(url)
  } catch (e) {
    console.error('GET /google/connect failed', e)
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
    if (!code || !state) return res.status(400).send('Missing code or state')

    const parsed = await parseAndVerifyState(state)
    if (!parsed?.userId) return res.status(400).send('Invalid state')
    const userId = parsed.userId
    const tokens = await exchangeCodeForTokens(code)
    await saveUserGoogleTokens(userId, tokens)

    // Prime calendars snapshot on connect (non-fatal if it fails)
    try {
      const { tokens: freshTokens } = await ensureFreshAccessToken(userId)
      await listCalendars(userId, freshTokens)
    } catch (e) {
      console.warn('listCalendars after connect failed:', e?.message || e)
    }

    const uiUrl = process.env.GOOGLE_CONNECT_REDIRECT_SUCCESS || process.env.APP_SUCCESS_URL || 'https://plancraftai.com/settings'
    return res.redirect(uiUrl)
  } catch (e) {
    console.error('GET /google/oauth/callback error', e)
    const failUrl = process.env.GOOGLE_CONNECT_REDIRECT_FAILURE || process.env.APP_FAILURE_URL || 'https://plancraftai.com/settings?google=error'
    try { return res.redirect(failUrl) } catch {}
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
    return res.json({ integration: integ || {} })
  } catch (e) {
    console.error('GET /google/status failed', e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

export default router
