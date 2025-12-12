import { buildAuthUrl, decodeState, exchangeCodeForToken, fetchProfile, storeLinkedInTokens } from '../services/linkedinService.js'
import { getTokensByUser, saveUserTokens } from '../firestore/tokensRepository.js'
import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'

const PROVIDERS = ['linkedin', 'instagram', 'twitter']

export async function socialConnect(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const { provider } = req.params
    const returnTo = req.query.returnTo || req.body?.returnTo || null
    if (!PROVIDERS.includes(provider)) return res.status(400).json({ success: false, error: 'Unsupported provider' })
    if (provider === 'linkedin') {
      const url = buildAuthUrl(userId, returnTo)
      return res.json({ success: true, url })
    }
    return res.status(200).json({ success: false, requiresConnect: true, message: 'Connect flow not yet enabled for this provider.' })
  } catch (err) {
    next(err)
  }
}

export async function socialCallback(req, res) {
  const { provider } = req.params
  if (provider !== 'linkedin') return res.status(400).json({ success: false, error: 'Unsupported provider' })
  try {
    const { code, state, error: oauthError } = req.query
    if (oauthError) return res.status(400).json({ success: false, error: oauthError })
    const parsed = decodeState(state)
    if (!parsed?.uid) return res.status(401).json({ success: false, error: 'invalid_state' })
    if (!code) return res.status(400).json({ success: false, error: 'missing_code' })

    const tokenPayload = await exchangeCodeForToken(code)
    const profile = await fetchProfile(tokenPayload.access_token)
    await storeLinkedInTokens(parsed.uid, tokenPayload, profile)
    return res.json({ success: true, provider, profile })
  } catch (err) {
    return res.status(400).json({ success: false, error: err?.message || 'callback_failed' })
  }
}

export async function socialStatus(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const workspaceId =
      req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
    const tokens = await getTokensByUser(userId)
    const map = {}
    PROVIDERS.concat(['whatsapp']).forEach((key) => {
      const t = tokens?.[key]
      map[key] = {
        connected: !!t?.accessToken,
        meta: t?.profile || t?.meta || null,
        updatedAt: t?.updatedAt || null,
        expiresAt: t?.expiresAt || null,
      }
    })

    let enabledSocials = {}
    if (workspaceId) {
      ensureApp()
      const db = admin.firestore()
      const ref = db.doc(`users/${userId}/workspaces/${workspaceId}`)
      const snap = await ref.get()
      enabledSocials = snap.exists ? snap.data()?.enabledSocials || {} : {}
    }

    res.json({ success: true, accounts: map, enabledSocials })
  } catch (err) {
    next(err)
  }
}

export async function socialDisconnect(req, res, next) {
  try {
    const userId = req.user?.uid
    const { provider } = req.params
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    if (!PROVIDERS.includes(provider)) return res.status(400).json({ success: false, error: 'Unsupported provider' })
    await saveUserTokens(userId, { [provider]: {} })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function setWorkspaceSocialEnabled(req, res, next) {
  try {
    const userId = req.user?.uid
    const { workspaceId, provider, enabled } = req.body || {}
    if (!userId || !workspaceId || !provider) {
      return res.status(400).json({ success: false, error: 'workspaceId, provider required' })
    }
    ensureApp()
    const db = admin.firestore()
    const ref = db.doc(`users/${userId}/workspaces/${workspaceId}`)
    await ref.set(
      {
        enabledSocials: {
          [provider]: !!enabled,
        },
      },
      { merge: true },
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function socialPost(req, res, next) {
  try {
    const userId = req.user?.uid
    const { provider } = req.params
    const { text, mediaUrl, mediaDescription, workspaceId } = req.body || {}
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    if (!provider) return res.status(400).json({ success: false, error: 'provider required' })
    if (provider === 'linkedin') {
      // reuse existing posting flow via controller to ensure token refresh
      const { postLinkedInContent, ensureAccessToken } = await import('../services/linkedinService.js')
      await ensureAccessToken(userId)
      const result = await postLinkedInContent({ userId, text, mediaUrl, mediaDescription })
      return res.json({ success: true, result })
    }
    return res.status(200).json({ success: false, fallback: 'copy', message: 'Publishing not enabled for this provider yet.' })
  } catch (err) {
    next(err)
  }
}
