import admin from 'firebase-admin'

let app
function ensureApp() {
  if (app) return app
  if (admin.apps.length) {
    app = admin.apps[0]
    return app
  }
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  })
  app = admin.app()
  return app
}

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
