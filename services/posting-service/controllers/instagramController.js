import {
  buildAuthUrl,
  decodeState,
  handleInstagramCallback,
  storeInstagramTokens,
  ensureInstagramAccess,
  postInstagramContent,
} from '../services/instagramService.js'

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
  return sendRedirect(res, ERROR_REDIRECT, { error: message, provider: 'instagram' })
}

export async function startInstagramAuth(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const returnTo = req.query.returnTo || req.body?.returnTo || null
    const url = buildAuthUrl(userId, returnTo)
    console.info('[instagram] auth_url_generated', { userId, hasReturnTo: !!returnTo })
    res.json({ success: true, url })
  } catch (err) {
    next(err)
  }
}

export async function handleInstagramAuthCallback(req, res) {
  try {
    const { code, state, error: oauthError, page_id: pageId } = req.query
    if (oauthError) {
      console.warn('[instagram] callback error from provider', { oauthError })
      return respondError(req, res, 400, oauthError)
    }
    const parsed = decodeState(state)
    if (!parsed?.uid) {
      console.warn('[instagram] callback invalid state')
      return respondError(req, res, 401, 'invalid_state')
    }
    if (!code) return respondError(req, res, 400, 'missing_code')

    const tokenObj = await handleInstagramCallback(code, pageId || null)
    await storeInstagramTokens(parsed.uid, tokenObj)
    console.info('[instagram] token_exchanged', { userId: parsed.uid, pageId: tokenObj.meta?.pageId })

    const redirectTarget = parsed.returnTo || SUCCESS_REDIRECT
    return sendRedirect(res, redirectTarget, { status: 'success', provider: 'instagram' })
  } catch (err) {
    const message = err?.response?.data?.error_description || err?.message || 'callback_failed'
    return respondError(req, res, 500, message)
  }
}

export async function postInstagram(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const { caption, mediaUrl, isVideo } = req.body || {}
    await ensureInstagramAccess(userId)
    const result = await postInstagramContent({ userId, caption, mediaUrl, isVideo })
    console.info('[instagram] post_published', { userId, hasMedia: !!mediaUrl, resultId: result?.id || null })
    res.json({ success: true, result })
  } catch (err) {
    next(err)
  }
}
