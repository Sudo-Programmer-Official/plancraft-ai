import express from 'express'
import admin from 'firebase-admin'
import '../services/firebaseAdmin.js'
import { signHS256 } from '../utils/jwt.js'
import { normalizePhone } from '../utils/phone.js'

const router = express.Router()
const APPLE_AUTH_SERVICE_MODULE = '../services/appleAuthService.js'
const MOBILE_HANDOFF_SERVICE_MODULE = '../services/mobileAuthHandoffService.js'

let appleAuthServicePromise = null
let mobileAuthHandoffServicePromise = null

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

function normalizeMobileAuthRedirectPath(target, fallback = '/dashboard') {
  if (typeof target !== 'string') return fallback
  const trimmed = target.trim()
  if (!trimmed) return fallback
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback
  if (trimmed.startsWith('//')) return fallback
  return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`
}

function buildAppTokenPayload(uid, email = null) {
  const secret = process.env.APP_JWT_SECRET
  if (!secret) return null

  const ttlDays = parseInt(process.env.APP_JWT_TTL_DAYS || '30', 10)
  const ttlSec = Math.max(1, ttlDays) * 24 * 60 * 60
  const token = signHS256(
    { sub: uid, email: email || undefined, scope: 'app' },
    secret,
    ttlSec,
  )

  return {
    token,
    ttlDays,
    expiresAt: new Date(Date.now() + ttlSec * 1000).toISOString(),
  }
}

const PHONE_IDENTITY_MATCH_FIELDS = [
  { field: 'phone', source: 'profile.phone', score: 100 },
  { field: 'preferences.notifications.phone_sms', source: 'preferences.notifications.phone_sms', score: 80 },
  { field: 'preferences.notifications.phone_voice', source: 'preferences.notifications.phone_voice', score: 75 },
  { field: 'integrations.sms.phone', source: 'integrations.sms.phone', score: 70 },
  { field: 'integrations.whatsapp.phone', source: 'integrations.whatsapp.phone', score: 60 },
]

async function resolveCanonicalUidForPhone(phoneNumber, fallbackUid = '') {
  const normalized = normalizePhone(phoneNumber)
  if (!normalized) {
    return {
      phoneNumber: '',
      uid: fallbackUid || null,
      email: null,
      resolvedBy: fallbackUid ? 'token_uid' : null,
      canonicalized: false,
    }
  }

  const candidates = new Map()

  for (const spec of PHONE_IDENTITY_MATCH_FIELDS) {
    try {
      const snap = await admin
        .firestore()
        .collection('users')
        .where(spec.field, '==', normalized)
        .limit(5)
        .get()

      snap.forEach((doc) => {
        const uid = String(doc.id || '')
        if (!uid) return
        const data = doc.data() || {}
        const score =
          spec.score +
          (data?.email ? 20 : 0) +
          (data?.mode && data.mode !== 'phone' ? 10 : 0) +
          (data?.profileComplete ? 5 : 0)

        const existing = candidates.get(uid)
        if (!existing || score > existing.score) {
          candidates.set(uid, {
            uid,
            email: typeof data?.email === 'string' ? data.email : null,
            resolvedBy: spec.source,
            score,
          })
        }
      })
    } catch (error) {
      console.warn('[auth/phone-session] candidate query failed', {
        field: spec.field,
        message: error?.message || String(error),
      })
    }
  }

  const ranked = [...candidates.values()]
    .filter((candidate) => candidate.uid && candidate.uid !== fallbackUid)
    .sort((a, b) => b.score - a.score)

  if (!ranked.length) {
    return {
      phoneNumber: normalized,
      uid: fallbackUid || null,
      email: null,
      resolvedBy: fallbackUid ? 'token_uid' : null,
      canonicalized: false,
    }
  }

  const [best, second] = ranked
  if (second && second.score === best.score && second.uid !== best.uid) {
    console.warn('[auth/phone-session] ambiguous phone ownership', {
      phoneNumber: normalized,
      fallbackUid: fallbackUid || null,
      candidates: ranked.slice(0, 3).map((entry) => ({
        uid: entry.uid,
        email: entry.email,
        resolvedBy: entry.resolvedBy,
        score: entry.score,
      })),
    })
    return {
      phoneNumber: normalized,
      uid: fallbackUid || null,
      email: null,
      resolvedBy: fallbackUid ? 'token_uid' : null,
      canonicalized: false,
      ambiguous: true,
    }
  }

  return {
    phoneNumber: normalized,
    uid: best.uid,
    email: best.email || null,
    resolvedBy: best.resolvedBy,
    canonicalized: best.uid !== fallbackUid,
  }
}

async function loadAppleAuthService() {
  if (!appleAuthServicePromise) {
    appleAuthServicePromise = import(APPLE_AUTH_SERVICE_MODULE).catch((error) => {
      appleAuthServicePromise = null
      throw error
    })
  }
  return appleAuthServicePromise
}

async function loadMobileAuthHandoffService() {
  if (!mobileAuthHandoffServicePromise) {
    mobileAuthHandoffServicePromise = import(MOBILE_HANDOFF_SERVICE_MODULE).catch((error) => {
      mobileAuthHandoffServicePromise = null
      throw error
    })
  }
  return mobileAuthHandoffServicePromise
}

async function isServerDrivenAppleMobileAuthEnabledSafe() {
  try {
    const { isServerDrivenAppleMobileAuthEnabled } = await loadAppleAuthService()
    return isServerDrivenAppleMobileAuthEnabled()
  } catch (error) {
    console.warn('[auth/apple] service unavailable while checking enablement', {
      message: error?.message || String(error),
      code: error?.code || null,
    })
    return false
  }
}

function redirectToNativeAuthFailure(res, errorCode = 'apple_auth_failed') {
  const params = new URLSearchParams()
  params.set('appleAuthError', String(errorCode || 'apple_auth_failed'))
  return res.redirect(302, `plancraftai://localhost/login?${params.toString()}`)
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
    const appToken = buildAppTokenPayload(uid, email)
    if (!appToken) {
      return res.status(200).json({
        ok: false,
        disabled: true,
        error: 'APP_JWT_SECRET not set; long-lived tokens disabled',
      })
    }

    return res.json({
      ok: true,
      token: appToken.token,
      expiresAt: appToken.expiresAt,
      ttlDays: appToken.ttlDays,
      uid,
      email,
    })
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

    const { createMobileAuthHandoffForUser } = await loadMobileAuthHandoffService()
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
    const { consumeMobileAuthHandoffForCode } = await loadMobileAuthHandoffService()
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
  const enabled = await isServerDrivenAppleMobileAuthEnabledSafe()
  console.info('[auth/apple/start] request', {
    platform,
    redirect,
    enabled,
  })

  try {
    const { createAppleMobileAuthStart } = await loadAppleAuthService()
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
    const { completeAppleMobileAuthCallback } = await loadAppleAuthService()
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
    return redirectToNativeAuthFailure(
      res,
      err?.code || err?.responseData?.error || 'apple_callback_failed',
    )
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

    const provider = String(req?.body?.provider || 'password')
    const platform = String(req?.body?.platform || 'ios')
    const phoneNumber =
      typeof decoded?.phone_number === 'string'
        ? decoded.phone_number
        : typeof decoded?.phoneNumber === 'string'
          ? decoded.phoneNumber
          : ''

    let resolvedUid = uid
    let resolvedEmail = decoded?.email || null
    let resolvedBy = 'token_uid'
    let canonicalized = false

    if (provider === 'phone' && phoneNumber) {
      const resolved = await resolveCanonicalUidForPhone(phoneNumber, uid)
      resolvedUid = String(resolved?.uid || uid)
      resolvedEmail = resolved?.email || resolvedEmail
      resolvedBy = resolved?.resolvedBy || resolvedBy
      canonicalized = resolved?.canonicalized === true && resolvedUid !== uid

      console.info('[auth/native-session/exchange] phone identity resolved', {
        sourceUid: uid,
        resolvedUid,
        phoneNumber: resolved?.phoneNumber || phoneNumber,
        canonicalized,
        resolvedBy,
        ambiguous: resolved?.ambiguous === true,
      })
    }

    const customToken = await admin.auth().createCustomToken(resolvedUid, {
      source: 'native-session-exchange',
      provider,
      platform,
    })
    const appToken = buildAppTokenPayload(resolvedUid, resolvedEmail)

    return res.json({
      ok: true,
      customToken,
      appToken: appToken?.token || null,
      appTokenExpiresAt: appToken?.expiresAt || null,
      appTokenTtlDays: appToken?.ttlDays || null,
      uid: resolvedUid,
      sourceUid: uid,
      email: resolvedEmail,
      phoneNumber: phoneNumber || null,
      provider,
      platform,
      canonicalized,
      resolvedBy,
    })
  } catch (err) {
    console.error('[auth/native-session/exchange] error:', err?.message || err)
    return res.status(500).json({ ok: false, error: 'Failed to exchange native session' })
  }
})

export default router
