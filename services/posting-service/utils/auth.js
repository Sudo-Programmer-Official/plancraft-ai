import admin from 'firebase-admin'
import { ensureApp } from './firebase.js'

function matchesAppToken(req) {
  const serverToken = (process.env.SERVICE_APP_TOKEN || process.env.APP_TOKEN || '').trim()
  if (!serverToken) return false
  // at process start
  console.log('[auth] SERVICE_APP_TOKEN set:', !!process.env.SERVICE_APP_TOKEN, 'len=', (process.env.SERVICE_APP_TOKEN||'').length);
  console.log('[auth] APP_TOKEN set:', !!process.env.APP_TOKEN, 'len=', (process.env.APP_TOKEN||'').length);

  // Support both x-app-token header and Bearer <token> in Authorization
  const headerToken = typeof req.headers['x-app-token'] === 'string' ? req.headers['x-app-token'].trim() : ''
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  return headerToken === serverToken || bearerToken === serverToken
}

export async function verifyAuth(req, res, next) {
  try {
    // Allow trusted app-token (for server-to-server / preview environments)
    if (matchesAppToken(req)) {
      req.user = { uid: 'app-token', via: 'app-token' }
      return next()
    }

    // Optional anonymous passthrough for local/App Runner smoke tests
    if (process.env.ALLOW_ANON === '1') {
      req.user = { uid: 'anon', via: 'anon' }
      return next()
    }

    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.replace('Bearer ', '') : null
    if (!token) return res.status(401).json({ success: false, error: 'Missing auth token' })
    ensureApp()
    const decoded = await admin.auth().verifyIdToken(token)
    req.user = decoded
    return next()
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid auth token' })
  }
}
