import express from 'express'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import {
  buildDiscordConsentUrl,
  exchangeDiscordCode,
  saveDiscordTokens,
  getDiscordIntegration,
  parseAndVerifyState,
  disconnectDiscord,
  saveDiscordIntegration,
} from '../services/discordOAuth.js'
import { sendDiscordMessage } from '../services/discordNotificationService.js'

const router = express.Router()
const ENABLED = String(process.env.ENABLE_DISCORD || '').toLowerCase()

router.use(requireAuth, ensureUserMatches)

router.post('/integrations/discord/connect', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') return res.status(503).json({ error: 'Discord integration disabled' })
    const userId = req.body?.userId || req?.user?.uid
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const url = await buildDiscordConsentUrl(String(userId))
    const accept = String(req.headers['accept'] || '')
    if (/json/.test(accept)) return res.json({ url })
    return res.redirect(url)
  } catch (e) {
    console.error('POST /integrations/discord/connect failed', e?.message || e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

router.get('/integrations/discord/status', async (req, res) => {
  try {
    const userId = req.query.userId || req?.user?.uid
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const integ = await getDiscordIntegration(String(userId))
    const enabled = ENABLED === '1' || ENABLED === 'true'
    return res.json({ integration: { ...(integ || {}), enabled } })
  } catch (e) {
    console.error('GET /integrations/discord/status failed', e?.message || e)
    return res.status(500).json({ error: 'Internal error' })
  }
})

router.post('/integrations/discord/config', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') return res.status(503).json({ error: 'Discord integration disabled' })
    const { userId, defaultChannelId, notifyOn } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const integ = await getDiscordIntegration(String(userId))
    const updated = await saveDiscordIntegration(String(userId), {
      ...integ,
      defaultChannelId: defaultChannelId || null,
      notifyOn: {
        reminders: notifyOn?.reminders !== false,
        deadlines: notifyOn?.deadlines === true,
        dailySummary: notifyOn?.dailySummary === true,
      },
      connected: integ.connected,
    })
    return res.json({ integration: updated })
  } catch (e) {
    console.error('POST /integrations/discord/config failed', e?.message || e)
    return res.status(500).json({ error: 'Failed to save Discord settings' })
  }
})

router.post('/integrations/discord/test', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') return res.status(503).json({ error: 'Discord integration disabled' })
    const { userId, message, channelId, isDM } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const content = message || 'Test message from PlanCraftAI ✨'
    const result = await sendDiscordMessage({ userId: String(userId), message: content, channelId: channelId || null, isDM: isDM !== false })
    return res.json({ ok: true, result })
  } catch (e) {
    console.error('POST /integrations/discord/test failed', e?.message || e)
    return res.status(500).json({ error: e?.message || 'Failed to send test' })
  }
})

router.post('/integrations/discord/disconnect', async (req, res) => {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') return res.status(503).json({ error: 'Discord integration disabled' })
    const userId = req.body?.userId || req?.user?.uid
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    await disconnectDiscord(String(userId))
    return res.json({ ok: true })
  } catch (e) {
    console.error('POST /integrations/discord/disconnect failed', e?.message || e)
    return res.status(500).json({ error: 'Failed to disconnect Discord' })
  }
})

// Public callback (no auth)
export async function handleDiscordOAuthCallback(req, res) {
  try {
    if (ENABLED !== '1' && ENABLED !== 'true') return res.status(503).send('Discord integration disabled')
    const code = String(req.query.code || '')
    const state = String(req.query.state || '')
    const errParam = String(req.query.error || '')

    const successUrl = process.env.DISCORD_CONNECT_REDIRECT_SUCCESS || process.env.APP_SUCCESS_URL || 'https://plancraftai.com/settings?integration=discord&status=success'
    const failUrlBase = process.env.DISCORD_CONNECT_REDIRECT_FAILURE || process.env.APP_FAILURE_URL || 'https://plancraftai.com/settings?integration=discord&status=error'
    const redirectFail = (reason) => {
      const join = failUrlBase.includes('?') ? '&' : '?'
      return res.redirect(`${failUrlBase}${join}reason=${encodeURIComponent(reason || 'unknown')}`)
    }

    if (errParam) return redirectFail(errParam || 'access_denied')
    if (!code || !state) return redirectFail('missing_params')

    const parsed = await parseAndVerifyState(state)
    if (!parsed?.userId) return redirectFail('invalid_state')
    const userId = parsed.userId
    const tokens = await exchangeDiscordCode(code)
    await saveDiscordTokens(userId, tokens)
    return res.redirect(successUrl)
  } catch (e) {
    const reason = e?.message || 'discord_exchange_failed'
    const failBase = process.env.DISCORD_CONNECT_REDIRECT_FAILURE || process.env.APP_FAILURE_URL || 'https://plancraftai.com/settings?integration=discord&status=error'
    const join = failBase.includes('?') ? '&' : '?'
    const fail = `${failBase}${join}reason=${encodeURIComponent(reason)}`
    try { return res.redirect(fail) } catch {}
    return res.status(500).send('Failed to connect Discord')
  }
}

export default router
