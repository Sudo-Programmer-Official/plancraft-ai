import admin from 'firebase-admin'
import { logger } from '../utils/logger.js'

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

export async function saveCampaign(id, payload, { userId, workspaceId } = {}) {
  ensureApp()
  const db = admin.firestore()
  const ref = id ? db.collection('content_campaigns').doc(id) : db.collection('content_campaigns').doc()
  const now = new Date()
  let existing = null
  if (id) {
    const snap = await ref.get()
    if (!snap.exists) return null
    existing = snap.data() || {}
    if (userId && existing.userId && existing.userId !== userId) return null
    if (workspaceId && existing.workspaceId && existing.workspaceId !== workspaceId) return null
  }

  const data = {
    ...payload,
    userId: payload.userId || existing?.userId || userId || null,
    workspaceId: payload.workspaceId ?? existing?.workspaceId ?? workspaceId ?? null,
    updatedAt: now,
    createdAt: existing?.createdAt || payload.createdAt || now,
  }
  await ref.set(data, { merge: true })
  logger.info('saved campaign', ref.id)
  return { id: ref.id, ...data }
}

export async function fetchCampaign(id, { userId, workspaceId } = {}) {
  ensureApp()
  const db = admin.firestore()
  const snap = await db.collection('content_campaigns').doc(id).get()
  if (!snap.exists) return null
  const data = snap.data() || {}
  if (userId && data.userId && data.userId !== userId) return null
  if (workspaceId && data.workspaceId && data.workspaceId !== workspaceId) return null
  return { id: snap.id, ...data }
}
