import admin from 'firebase-admin'
import { ensureApp } from './firebase.js'

function matchesAppToken(req) {
  const serverToken = process.env.SERVICE_APP_TOKEN || process.env.APP_TOKEN || ''
  if (!serverToken) return false
  const incoming = req.headers['x-app-token']
  return typeof incoming === 'string' && incoming === serverToken
}

export async function verifyAuth(req, res, next) {
  try {
    if (matchesAppToken(req)) {
      req.user = { uid: 'app-token', via: 'app-token' }
      return next()
    }
    if (process.env.ALLOW_ANON === '1') {
      req.user = { uid: 'anon', via: 'anon' }
      return next()
    }
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ success: false, error: 'Missing auth token' })
    ensureApp()
    const decoded = await admin.auth().verifyIdToken(token)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid auth token' })
  }
}
