import {
  buildAuthUrl,
  decodeState,
  exchangeCodeForToken,
  fetchTwitterProfile,
  storeTwitterTokens,
  ensureTwitterAccess,
  postTweet,
  getTwitterTokens,
} from '../services/twitterService.js'

const SUCCESS_REDIRECT =
  process.env.SOCIAL_CONNECT_REDIRECT_SUCCESS ||
  process.env.LINKEDIN_SUCCESS_REDIRECT ||
  'https://plancraftai.com/social/connect/success'
const ERROR_REDIRECT =
  process.env.SOCIAL_CONNECT_REDIRECT_ERROR ||
  process.env.LINKEDIN_ERROR_REDIRECT ||
  'https://plancraftai.com/social/connect/error'

function wantsJson(req) {
  return (req.get('accept') || '').includes('application/json')
}

function sendRedirect(res, url, params = {}) {
  const search = new URLSearchParams(params).toString()
  const target = search ? `${url}?${search}` : url
  return res.redirect(target)
}

function respondError(req, res, status, message) {
  if (wantsJson(req)) return res.status(status).json({ success: false, error: message })
  return sendRedirect(res, ERROR_REDIRECT, { error: message, provider: 'twitter' })
}

export async function startTwitterAuth(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const returnTo = req.query.returnTo || req.body?.returnTo || null
    const workspaceId = req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
    const url = buildAuthUrl(userId, workspaceId, returnTo)
    console.info('[twitter] auth_url_generated', { userId, workspaceId, hasReturnTo: !!returnTo })
    res.json({ success: true, url, authUrl: url })
  } catch (err) {
    next(err)
  }
}

export async function handleTwitterCallback(req, res) {
  try {
    const { code, state, error: oauthError } = req.query
    if (oauthError) {
      console.warn('[twitter] callback error from provider', { oauthError })
      return respondError(req, res, 400, oauthError)
    }
    const parsed = decodeState(state)
    if (!parsed?.uid || !parsed?.cv) {
      console.warn('[twitter] callback invalid state')
      return respondError(req, res, 401, 'invalid_state')
    }
    if (!code) return respondError(req, res, 400, 'missing_code')

    const tokenPayload = await exchangeCodeForToken(code, parsed.cv)
    const profile = await fetchTwitterProfile(tokenPayload.access_token)
    await storeTwitterTokens(parsed.uid, parsed.workspaceId || null, tokenPayload, profile, null)
    console.info('[twitter] token_exchanged', { userId: parsed.uid, workspaceId: parsed.workspaceId || null, handle: profile?.username })

    const redirectTarget = parsed.returnTo || SUCCESS_REDIRECT
    return sendRedirect(res, redirectTarget, { status: 'success', provider: 'twitter' })
  } catch (err) {
    const message = err?.response?.data?.error_description || err?.message || 'callback_failed'
    return respondError(req, res, 500, message)
  }
}

export async function refreshTwitterToken(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const existing = await getTwitterTokens(userId)
    if (!existing?.refreshToken) return res.status(400).json({ success: false, error: 'No refresh token on file' })
    const refreshed = await ensureTwitterAccess(userId) // ensure will refresh when expired
    res.json({ success: true, twitter: refreshed })
  } catch (err) {
    next(err)
  }
}

export async function postTwitter(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const { text } = req.body || {}
    const workspaceId = req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
    await ensureTwitterAccess(userId, workspaceId)
    const result = await postTweet({ userId, workspaceId, text })
    console.info('[twitter] post_published', { userId, workspaceId, tweetId: result?.data?.id })
    res.json({ success: true, result })
  } catch (err) {
    next(err)
  }
}
