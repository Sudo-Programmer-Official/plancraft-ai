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

export async function saveCampaign(id, payload) {
  ensureApp()
  const db = admin.firestore()
  const ref = id ? db.collection('content_campaigns').doc(id) : db.collection('content_campaigns').doc()
  const data = {
    ...payload,
    updatedAt: new Date(),
    createdAt: payload.createdAt || new Date(),
  }
  await ref.set(data, { merge: true })
  logger.info('saved campaign', ref.id)
  return { id: ref.id, ...data }
}

export async function fetchCampaign(id) {
  ensureApp()
  const db = admin.firestore()
  const snap = await db.collection('content_campaigns').doc(id).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() }
}
