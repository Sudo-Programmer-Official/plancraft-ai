import express from 'express'
import admin from 'firebase-admin'
import '../services/firebaseAdmin.js' // ensure admin is initialized
import { signHS256 } from '../utils/jwt.js'

const router = express.Router()

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

export default router
