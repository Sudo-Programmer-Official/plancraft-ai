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
      workspaceId: job.workspaceId || job.context?.workspaceId || null,
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

export async function fetchMessageStats(userId, workspaceId = null) {
  ensureApp()
  const db = admin.firestore()
  let query = userId ? db.collection(COLLECTION).where('userId', '==', userId) : db.collection(COLLECTION)
  query = workspaceId ? query.where('workspaceId', '==', workspaceId) : query.where('workspaceId', 'in', [null, ''])

  const snap = await query.get()
  let total = 0
  let pending = 0
  let sent = 0
  let failed = 0

  snap.forEach((doc) => {
    total += 1
    const status = (doc.data()?.status || '').toLowerCase()
    if (status === 'pending') pending += 1
    else if (status === 'sent') sent += 1
    else if (status === 'failed') failed += 1
  })

  return {
    total,
    pending,
    sent,
    failed,
    scheduled: pending, // alias used by dashboard
  }
}
