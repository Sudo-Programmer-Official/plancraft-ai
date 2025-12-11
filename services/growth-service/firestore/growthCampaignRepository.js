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

export async function saveCampaign(data = {}, { workspaceId, userId } = {}) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('growth_campaigns').doc()
  const now = new Date()
  const payload = {
    ...data,
    userId: data.userId || userId || 'anon',
    workspaceId: data.workspaceId ?? workspaceId ?? null,
    status: data?.status || 'draft',
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(payload)
  return { id: ref.id, ...payload }
}

export async function updateCampaignById(id, data = {}, { workspaceId, userId } = {}) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('growth_campaigns').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return null
  const existing = snap.data() || {}
  if (workspaceId && existing.workspaceId && existing.workspaceId !== workspaceId) return null
  if (userId && existing.userId && existing.userId !== userId) return null
  const payload = {
    ...data,
    userId: existing.userId || userId || 'anon',
    workspaceId: data.workspaceId ?? existing.workspaceId ?? workspaceId ?? null,
    updatedAt: new Date(),
  }
  await ref.set(payload, { merge: true })
  const refreshed = await ref.get()
  return { id: ref.id, ...refreshed.data() }
}

export async function deleteCampaignById(id, { workspaceId, userId } = {}) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('growth_campaigns').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return false
  const existing = snap.data() || {}
  if (workspaceId && existing.workspaceId && existing.workspaceId !== workspaceId) return false
  if (userId && existing.userId && existing.userId !== userId) return false
  await ref.delete()
  return true
}
