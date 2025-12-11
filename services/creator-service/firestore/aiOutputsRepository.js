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

export async function logAiOutput(entry) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('ai_outputs').doc()
  const data = {
    ...entry,
    workspaceId: entry?.workspaceId ?? null,
    userId: entry?.userId || 'anon',
    createdAt: entry?.createdAt || new Date(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}
