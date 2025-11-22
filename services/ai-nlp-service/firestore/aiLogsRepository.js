import admin from 'firebase-admin'

let app
function ensureApp() {
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

export async function logAi(entry) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('ai_outputs').doc()
  const data = {
    userId: entry.userId || 'anon',
    type: entry.type || 'unknown',
    input: entry.input || '',
    output: entry.output || '',
    createdAt: new Date(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}
