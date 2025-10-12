import admin from 'firebase-admin'
import crypto from 'crypto'
import '../services/firebaseAdmin.js' // ensure admin is initialized

function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = str.length % 4
  if (pad) str += '='.repeat(4 - pad)
  return Buffer.from(str, 'base64').toString('utf8')
}

function verifyHS256Jwt(token, secret) {
  try {
    const [h, p, s] = String(token || '').split('.')
    if (!h || !p || !s) return null
    const data = `${h}.${p}`
    const expected = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
    if (expected !== s) return null
    const payload = JSON.parse(b64urlDecode(p))
    if (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp) return null
    return payload
  } catch {
    return null
  }
}

export async function attachAuth(req, res, next) {
  try {
    // Prefer long-lived app token first
    const appTok = req.headers['x-app-token']
    const secret = process.env.APP_JWT_SECRET
    if (secret && typeof appTok === 'string' && appTok.split('.').length === 3) {
      const payload = verifyHS256Jwt(appTok, secret)
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
      return res.status(403).json({ error: 'Forbidden: user mismatch' })
    }
    return next()
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

// Aliases for convenience
export const authRequired = requireAuth
export const userMatchRequired = ensureUserMatches
