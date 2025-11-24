import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'

export async function saveScheduled(payload) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('scheduled_posts').doc()
  const scheduleDate = payload.scheduleDate ? new Date(payload.scheduleDate) : new Date()
  const data = {
    ...payload,
    scheduleDate,
    status: 'pending',
    createdAt: new Date(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}

export async function fetchDue() {
  ensureApp()
  const db = admin.firestore()
  const now = new Date()
  const snap = await db.collection('scheduled_posts').where('status', '==', 'pending').where('scheduleDate', '<=', now).get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function markStatus(id, status, errorLog) {
  ensureApp()
  const db = admin.firestore()
  await db.collection('scheduled_posts').doc(id).set(
    {
      status,
      errorLog: errorLog || null,
      updatedAt: new Date(),
    },
    { merge: true },
  )
}
