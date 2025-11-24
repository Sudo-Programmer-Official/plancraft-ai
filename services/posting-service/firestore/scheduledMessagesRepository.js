import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'

const COLLECTION = 'scheduled_messages'

export async function createScheduledMessages(userId, jobs = []) {
  ensureApp()
  const db = admin.firestore()
  const batch = db.batch()
  const saved = []
  jobs.forEach((job) => {
    const ref = db.collection(COLLECTION).doc()
    const data = {
      ...job,
      userId,
      jobId: ref.id,
      status: job.status || 'pending',
      createdAt: job.createdAt || new Date(),
    }
    batch.set(ref, data)
    saved.push({ id: ref.id, ...data })
  })
  await batch.commit()
  return saved
}

export async function fetchDueMessages(now = new Date()) {
  ensureApp()
  const db = admin.firestore()
  const snap = await db
    .collection(COLLECTION)
    .where('status', '==', 'pending')
    .where('scheduleAt', '<=', now)
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function markAsProcessed(id) {
  ensureApp()
  const db = admin.firestore()
  await db.collection(COLLECTION).doc(id).set(
    {
      status: 'sent',
      updatedAt: new Date(),
    },
    { merge: true },
  )
}

export async function markAsFailed(id, error) {
  ensureApp()
  const db = admin.firestore()
  await db.collection(COLLECTION).doc(id).set(
    {
      status: 'failed',
      error: error || null,
      updatedAt: new Date(),
    },
    { merge: true },
  )
}
