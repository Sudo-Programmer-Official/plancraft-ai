import express from 'express'
import admin from 'firebase-admin'
import '../services/firebaseAdmin.js' // ensure admin is initialized
import { db } from '../services/firebaseAdmin.js'
import { signHS256 } from '../utils/jwt.js'
import crypto from 'crypto'

const router = express.Router()
const MOBILE_HANDOFF_COLLECTION = 'mobileAuthHandoffs'
const MOBILE_HANDOFF_TTL_MS = 5 * 60 * 1000

function normalizeRedirectPath(target, fallback = '/dashboard') {
  if (typeof target !== 'string') return fallback
  const trimmed = target.trim()
  if (!trimmed) return fallback
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback
  if (trimmed.startsWith('//')) return fallback
  return trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`
}

// POST /api/auth/refresh
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

    // Prefer Authorization header; fallback to body.idToken
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

    const redirect = normalizeRedirectPath(req?.body?.redirect)
    const provider = String(req?.body?.provider || 'google')
    const platform = String(req?.body?.platform || 'android')
    const code = crypto.randomBytes(24).toString('hex')
    const now = Date.now()
    const expiresAt = now + MOBILE_HANDOFF_TTL_MS

    await db.collection(MOBILE_HANDOFF_COLLECTION).doc(code).set({
      uid,
      email: req?.user?.email || null,
      redirect,
      provider,
      platform,
      createdAt: now,
      expiresAt,
    })

    return res.json({
      ok: true,
      code,
      redirect,
      expiresAt,
    })
  } catch (err) {
    console.error('[auth/mobile-handoff/create] error:', err?.message || err)
    return res.status(500).json({ ok: false, error: 'Failed to create mobile handoff' })
  }
})

router.post('/mobile-handoff/consume', async (req, res) => {
  try {
    const code = String(req?.body?.code || '').trim()
    if (!code) {
      return res.status(400).json({ ok: false, error: 'Missing handoff code' })
    }

    const ref = db.collection(MOBILE_HANDOFF_COLLECTION).doc(code)
    const snap = await ref.get()
    if (!snap.exists) {
      return res.status(404).json({ ok: false, error: 'Mobile handoff not found' })
    }

    const data = snap.data() || {}
    const expiresAt = Number(data.expiresAt || 0)
    if (!expiresAt || expiresAt < Date.now()) {
      try { await ref.delete() } catch {}
      return res.status(410).json({ ok: false, error: 'Mobile handoff expired' })
    }

    const uid = String(data.uid || '')
    if (!uid) {
      try { await ref.delete() } catch {}
      return res.status(400).json({ ok: false, error: 'Mobile handoff is invalid' })
    }

    const customToken = await admin.auth().createCustomToken(uid, {
      source: 'mobile-handoff',
      provider: String(data.provider || 'google'),
      platform: String(data.platform || 'android'),
    })

    try { await ref.delete() } catch {}

    return res.json({
      ok: true,
      customToken,
      redirect: normalizeRedirectPath(String(data.redirect || '/dashboard')),
      uid,
      email: data.email || null,
      provider: String(data.provider || 'google'),
      platform: String(data.platform || 'android'),
    })
  } catch (err) {
    console.error('[auth/mobile-handoff/consume] error:', err?.message || err)
    return res.status(500).json({ ok: false, error: 'Failed to consume mobile handoff' })
  }
})

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
      console.error('[auth/native-session/exchange] verifyIdToken failed:', err?.message || err)
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
