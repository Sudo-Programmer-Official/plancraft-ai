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

export async function saveCampaign(data) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('growth_campaigns').doc()
  const now = new Date()
  const payload = {
    ...data,
    status: data?.status || 'draft',
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(payload)
  return { id: ref.id, ...payload }
}

export async function updateCampaignById(id, data) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('growth_campaigns').doc(id)
  const payload = { ...data, updatedAt: new Date() }
  await ref.set(payload, { merge: true })
  const snap = await ref.get()
  return { id: ref.id, ...snap.data() }
}

export async function deleteCampaignById(id) {
  ensureApp()
  const db = admin.firestore()
  await db.collection('growth_campaigns').doc(id).delete()
}
