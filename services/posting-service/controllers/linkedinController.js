import {
  buildAuthUrl,
  decodeState,
  exchangeCodeForToken,
  fetchProfile,
  storeLinkedInTokens,
  refreshAccessToken,
  ensureAccessToken,
  postLinkedInContent,
  getLinkedInTokens,
} from '../services/linkedinService.js'

const SUCCESS_REDIRECT =
  process.env.LINKEDIN_SUCCESS_REDIRECT ||
  (process.env.VITE_APP_BASE_URL ? `${process.env.VITE_APP_BASE_URL}/auth/linkedin/success` : null) ||
  'https://plancraftai.com/auth/linkedin/success'
const ERROR_REDIRECT =
  process.env.LINKEDIN_ERROR_REDIRECT ||
  (process.env.VITE_APP_BASE_URL ? `${process.env.VITE_APP_BASE_URL}/auth/linkedin/error` : null) ||
  'https://plancraftai.com/auth/linkedin/error'

function sendRedirect(res, url, params = {}) {
  const search = new URLSearchParams(params).toString()
  const target = search ? `${url}?${search}` : url
  return res.redirect(target)
}

function wantsJson(req) {
  return (req.get('accept') || '').includes('application/json')
}

function respondError(req, res, status, message) {
  if (wantsJson(req)) {
    return res.status(status).json({ success: false, error: message })
  }
  return sendRedirect(res, ERROR_REDIRECT, { error: message })
}

export async function startLinkedInAuth(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const returnTo = req.query.returnTo || req.body?.returnTo || null
    const url = buildAuthUrl(userId, returnTo)
    console.info('[linkedin] auth_url_generated', { userId, hasReturnTo: !!returnTo })
    res.json({ success: true, url })
  } catch (err) {
    next(err)
  }
}

export async function handleLinkedInCallback(req, res) {
  try {
    const { code, state, error: oauthError } = req.query
    if (oauthError) {
      console.warn('[linkedin] callback error from provider', { oauthError })
      return respondError(req, res, 400, oauthError)
    }
    const parsed = decodeState(state)
    if (!parsed?.uid) {
      console.warn('[linkedin] callback invalid state')
      return respondError(req, res, 401, 'invalid_state')
    }
    if (!code) {
      return respondError(req, res, 400, 'missing_code')
    }

    const tokenPayload = await exchangeCodeForToken(code)
    const profile = await fetchProfile(tokenPayload.access_token)
    await storeLinkedInTokens(parsed.uid, tokenPayload, profile)
    console.info('[linkedin] token_exchanged', { userId: parsed.uid, hasRefresh: !!tokenPayload.refresh_token })

    const redirectTarget = parsed.returnTo || SUCCESS_REDIRECT
    return sendRedirect(res, redirectTarget, { status: 'success', provider: 'linkedin' })
  } catch (err) {
    const message = err?.response?.data?.error_description || err?.message || 'callback_failed'
    return sendRedirect(res, ERROR_REDIRECT, { error: message })
  }
}

export async function refreshLinkedInToken(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const existing = await getLinkedInTokens(userId)
    if (!existing?.refreshToken) {
      return res.status(400).json({ success: false, error: 'No LinkedIn refresh token on file' })
    }
    const refreshed = await refreshAccessToken(existing.refreshToken)
    const profile = existing.profile || null
    const linkedin = await storeLinkedInTokens(userId, refreshed, profile, existing)
    res.json({ success: true, linkedin })
  } catch (err) {
    next(err)
  }
}

export async function postLinkedIn(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const { text, mediaUrl, mediaDescription } = req.body || {}
    await ensureAccessToken(userId)
    const result = await postLinkedInContent({ userId, text, mediaUrl, mediaDescription })
    console.info('[linkedin] post_published', { userId, hasMedia: !!mediaUrl, resultId: result?.id || null })
    res.json({ success: true, result })
  } catch (err) {
    next(err)
  }
}
