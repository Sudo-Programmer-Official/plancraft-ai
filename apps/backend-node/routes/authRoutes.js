import express from 'express'
import admin from 'firebase-admin'
import '../services/firebaseAdmin.js'
import { signHS256 } from '../utils/jwt.js'
import {
  buildAppleMobileAuthFailureUrl,
  createAppleMobileAuthStart,
  completeAppleMobileAuthCallback,
  isServerDrivenAppleMobileAuthEnabled,
} from '../services/appleAuthService.js'
import {
  consumeMobileAuthHandoffForCode,
  createMobileAuthHandoffForUser,
  normalizeMobileAuthRedirectPath,
} from '../services/mobileAuthHandoffService.js'

const router = express.Router()

function decodeJwtClaims(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length < 2) return null
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=')
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function readBodyOrQuery(req, key) {
  const bodyValue = req?.body?.[key]
  if (bodyValue != null && bodyValue !== '') return bodyValue
  return req?.query?.[key]
}

function redirectToNativeAuthFailure(res, errorCode = 'apple_auth_failed') {
  return res.redirect(302, buildAppleMobileAuthFailureUrl(errorCode))
}

router.post('/refresh', async (req, res) => {
  try {
    const secret = process.env.APP_JWT_SECRET
    if (!secret) {
      return res.status(200).json({
        ok: false,
        disabled: true,
        error: 'APP_JWT_SECRET not set; long-lived tokens disabled',
      })
    }

    const authHeader = req.headers.authorization || ''
    let idToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null
    if (!idToken && req.body && typeof req.body.idToken === 'string') {
      idToken = req.body.idToken
    }
    if (!idToken) {
      return res.status(401).json({ ok: false, error: 'Missing Authorization token' })
    }

    let decoded
    try {
      decoded = await admin.auth().verifyIdToken(idToken)
    } catch (err) {
      console.error('[auth/refresh] verifyIdToken failed:', err?.message || err)
      return res.status(401).json({ ok: false, error: 'Invalid or expired token' })
    }
    if (!decoded || !decoded.uid) {
      return res.status(401).json({ ok: false, error: 'Invalid or expired token' })
    }

    const uid = decoded.uid
    const email = decoded.email || null
    const ttlDays = parseInt(process.env.APP_JWT_TTL_DAYS || '30', 10)
    const ttlSec = Math.max(1, ttlDays) * 24 * 60 * 60

    const token = signHS256(
      { sub: uid, email: email || undefined, scope: 'app' },
      secret,
      ttlSec,
    )

    const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString()
    return res.json({ ok: true, token, expiresAt, ttlDays, uid, email })
  } catch (err) {
    console.error('[auth/refresh] unexpected error:', err)
    return res.status(401).json({ ok: false, error: 'Unauthorized', detail: err?.message })
  }
})

router.post('/mobile-handoff/create', async (req, res) => {
  try {
    const uid = req?.user?.uid
    if (!uid) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    const handoff = await createMobileAuthHandoffForUser({
      uid,
      email: req?.user?.email || null,
      redirect: normalizeMobileAuthRedirectPath(req?.body?.redirect),
      provider: String(req?.body?.provider || 'google'),
      platform: String(req?.body?.platform || 'android'),
    })

    console.info('[auth/mobile-handoff/create] created', {
      uid,
      provider: handoff.provider,
      platform: handoff.platform,
      redirect: handoff.redirect,
      expiresAt: handoff.expiresAt,
    })

    return res.json({
      ok: true,
      code: handoff.code,
      redirect: handoff.redirect,
      expiresAt: handoff.expiresAt,
    })
  } catch (err) {
    console.error('[auth/mobile-handoff/create] error:', err?.message || err)
    return res.status(500).json({ ok: false, error: 'Failed to create mobile handoff' })
  }
})

router.post('/mobile-handoff/consume', async (req, res) => {
  try {
    const handoff = await consumeMobileAuthHandoffForCode(req?.body?.code)
    const customToken = await admin.auth().createCustomToken(handoff.uid, {
      source: 'mobile-handoff',
      provider: handoff.provider,
      platform: handoff.platform,
    })

    console.info('[auth/mobile-handoff/consume] consumed', {
      uid: handoff.uid,
      provider: handoff.provider,
      platform: handoff.platform,
      redirect: handoff.redirect,
    })

    return res.json({
      ok: true,
      customToken,
      redirect: handoff.redirect,
      uid: handoff.uid,
      email: handoff.email || null,
      provider: handoff.provider,
      platform: handoff.platform,
    })
  } catch (err) {
    const status = Number(err?.status || 500)
    console.error('[auth/mobile-handoff/consume] error:', err?.message || err)
    return res.status(status).json({ ok: false, error: err?.message || 'Failed to consume mobile handoff' })
  }
})

router.get('/apple/start', async (req, res) => {
  const redirect = normalizeMobileAuthRedirectPath(readBodyOrQuery(req, 'redirect'))
  const platform = String(readBodyOrQuery(req, 'platform') || 'ios')
  console.info('[auth/apple/start] request', {
    platform,
    redirect,
    enabled: isServerDrivenAppleMobileAuthEnabled(),
  })

  try {
    const session = await createAppleMobileAuthStart({ redirect, platform })
    console.info('[auth/apple/start] success', {
      platform: session.platform,
      redirect: session.redirect,
      state: session.state,
    })
    return res.redirect(302, session.authorizeUrl)
  } catch (err) {
    console.error('[auth/apple/start] failed', {
      message: err?.message || String(err),
      status: err?.status || null,
      redirect,
      platform,
    })
    return redirectToNativeAuthFailure(res, 'apple_start_failed')
  }
})

async function handleAppleCallback(req, res) {
  const state = readBodyOrQuery(req, 'state')
  const code = readBodyOrQuery(req, 'code')
  const error = readBodyOrQuery(req, 'error')
  const errorDescription = readBodyOrQuery(req, 'error_description')
  const rawUser = readBodyOrQuery(req, 'user')

  console.info('[auth/apple/callback] request', {
    method: req.method,
    hasState: !!state,
    hasCode: !!code,
    hasUser: !!rawUser,
    error: error || null,
  })

  if (error) {
    console.warn('[auth/apple/callback] provider returned error', {
      error,
      errorDescription: errorDescription || null,
    })
    return redirectToNativeAuthFailure(res, error)
  }

  try {
    const result = await completeAppleMobileAuthCallback({
      state,
      code,
      user: rawUser,
    })

    console.info('[auth/apple/callback] success', {
      uid: result?.resolvedUser?.uid || null,
      email: result?.resolvedUser?.email || null,
      providerLinked: result?.resolvedUser?.providerLinked === true,
      source: result?.resolvedUser?.source || 'unknown',
      redirect: result?.handoff?.redirect || result?.authState?.redirect || '/dashboard',
      platform: result?.handoff?.platform || result?.authState?.platform || 'ios',
      handoffCode: !!result?.handoff?.code,
    })

    return res.redirect(302, result.appRedirectUrl)
  } catch (err) {
    console.error('[auth/apple/callback] failed', {
      message: err?.message || String(err),
      status: err?.status || null,
      code: err?.code || null,
      error: err?.responseData || null,
    })
    return redirectToNativeAuthFailure(res, err?.code || 'apple_callback_failed')
  }
}

router.get('/apple/callback', handleAppleCallback)
router.post('/apple/callback', handleAppleCallback)

router.post('/native-session/exchange', async (req, res) => {
  try {
    const idToken = String(req?.body?.idToken || '').trim()
    if (!idToken) {
      return res.status(400).json({ ok: false, error: 'Missing Firebase ID token' })
    }

    let decoded
    try {
      decoded = await admin.auth().verifyIdToken(idToken)
    } catch (err) {
      const claims = decodeJwtClaims(idToken)
      console.error('[auth/native-session/exchange] verifyIdToken failed:', {
        message: err?.message || String(err),
        code: err?.code || null,
        aud: claims?.aud || null,
        iss: claims?.iss || null,
        sub: claims?.sub || null,
        email: claims?.email || null,
      })
      return res.status(401).json({ ok: false, error: 'Invalid Firebase ID token' })
    }

    const uid = String(decoded?.uid || '')
    if (!uid) {
      return res.status(400).json({ ok: false, error: 'Firebase token did not contain a uid' })
    }

    const customToken = await admin.auth().createCustomToken(uid, {
      source: 'native-session-exchange',
      provider: String(req?.body?.provider || 'password'),
      platform: String(req?.body?.platform || 'ios'),
    })

    return res.json({
      ok: true,
      customToken,
      uid,
      email: decoded?.email || null,
      provider: String(req?.body?.provider || 'password'),
      platform: String(req?.body?.platform || 'ios'),
    })
  } catch (err) {
    console.error('[auth/native-session/exchange] error:', err?.message || err)
    return res.status(500).json({ ok: false, error: 'Failed to exchange native session' })
  }
})

export default router
