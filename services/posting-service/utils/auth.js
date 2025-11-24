import admin from 'firebase-admin'
import { ensureApp } from './firebase.js'

export async function verifyAuth(req, res, next) {
  try {
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
