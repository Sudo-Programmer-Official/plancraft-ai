import admin from 'firebase-admin'
import '../services/firebaseAdmin.js' // ensure admin is initialized
import { ensureUserProfile } from '../services/userService.js'
import { verifyHS256 } from '../utils/jwt.js'

export async function attachAuth(req, res, next) {
  try {
    // Prefer long-lived app token first
    const appTok = req.headers['x-app-token']
    const secret = process.env.APP_JWT_SECRET
    if (secret && typeof appTok === 'string' && appTok.split('.').length === 3) {
      const payload = verifyHS256(appTok, secret)
      if (payload && payload.sub) {
        req.user = { uid: payload.sub, email: payload.email || null, source: 'app' }
        req.auth = { type: 'app', token: appTok, payload }
        return next()
      }
    }

    // Fallback to Firebase ID token from Authorization: Bearer
    const hdr = req.headers.authorization || ''
    if (/^bearer\s+/i.test(hdr)) {
      const idToken = hdr.replace(/^bearer\s+/i, '').trim()
      try {
        const decoded = await admin.auth().verifyIdToken(idToken)
        req.user = { uid: decoded.uid, email: decoded.email || null, source: 'firebase' }
        req.auth = { type: 'firebase', token: idToken, payload: decoded }
        return next()
      } catch (e) {
        // ignore, proceed unauthenticated
      }
    }
  } catch {}
  return next()
}

export async function requireAuth(req, res, next) {
  if (!req.user) {
    // try attaching once in case it wasn't run
    await attachAuth(req, res, () => {})
  }
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  // Auto-ensure Firestore user profile exists and is timestamped.
  try {
    const uid = String(req.user.uid)
    // Try to enrich from token payload when available
    const p = (req.auth && req.auth.payload) || {}
    const email = req.user.email || p.email || null
    const name = p.name || p.displayName || null
    const phone = p.phone_number || p.phone || null
    await ensureUserProfile(uid, {
      email: email || undefined,
      name: name || undefined,
      phone: phone || undefined,
      profileComplete: !!name,
    })
  } catch {}

  return next()
}

export function ensureUserMatches(req, res, next) {
  try {
    const uid = req?.user?.uid
    if (!uid) return res.status(401).json({ error: 'Unauthorized' })

    const q = req.query || {}
    const b = req.body || {}
    const p = req.params || {}
    const provided = String(b.userId || q.userId || q.uid || p.userId || '')
    if (!provided) {
      // Normalize: populate body.userId if absent
      try { req.body = { ...b, userId: uid } } catch {}
      return next()
    }
    if (provided && provided !== uid) {
      // To avoid guest/user drift issues, coerce to the authenticated uid
      try { req.body = { ...b, userId: uid } } catch {}
      try { req.query = { ...q, userId: uid } } catch {}
      console.warn('[Auth] userId mismatch; coercing to token uid', { provided, uid })
      return next()
    }
    return next()
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

// Aliases for convenience
export const authRequired = requireAuth
export const userMatchRequired = ensureUserMatches
