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

export async function logOutreach(entry) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('growth_outreach_logs').doc()
  const data = {
    userId: entry.userId || 'anon',
    type: entry.type || 'outreach',
    input: entry.input || '',
    output: entry.output || '',
    channel: entry.channel || 'email',
    workspaceId: entry.workspaceId ?? null,
    createdAt: new Date(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}
