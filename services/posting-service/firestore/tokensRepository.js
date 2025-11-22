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

export async function getTokensByUser(userId) {
  ensureApp()
  const db = admin.firestore()
  const snap = await db.collection('user_social_tokens').doc(userId).get()
  return snap.exists ? snap.data() : {}
}

export async function saveUserTokens(userId, payload) {
  ensureApp()
  const db = admin.firestore()
  await db.collection('user_social_tokens').doc(userId).set(payload, { merge: true })
}
