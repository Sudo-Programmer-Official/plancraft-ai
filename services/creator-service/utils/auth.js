import admin from 'firebase-admin'
import { ensureApp } from './firebase.js'

function matchesAppToken(req) {
  const serverToken = (process.env.SERVICE_APP_TOKEN || process.env.APP_TOKEN || '').trim()
  if (!serverToken) return false

  const headerToken = typeof req.headers['x-app-token'] === 'string' ? req.headers['x-app-token'].trim() : ''
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization.trim() : ''
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const queryToken = typeof req.query?.appToken === 'string' ? req.query.appToken.trim() : ''
  const bodyToken = typeof req.body?.appToken === 'string' ? req.body.appToken.trim() : ''

  return [headerToken, bearerToken, queryToken, bodyToken].some((tok) => tok === serverToken)
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
