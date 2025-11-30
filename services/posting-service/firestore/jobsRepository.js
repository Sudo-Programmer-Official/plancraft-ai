import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'

const COLLECTION = 'posting_jobs'

function toDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function saveJob(job = {}) {
  ensureApp()
  const db = admin.firestore()
  const ref = job.jobId ? db.collection(COLLECTION).doc(job.jobId) : db.collection(COLLECTION).doc()
  const scheduledAt = toDate(job.scheduledAt) || new Date()
  const now = new Date()
  const data = {
    ...job,
    jobId: job.jobId || ref.id,
    status: job.status || 'pending',
    scheduledAt,
    createdAt: job.createdAt ? toDate(job.createdAt) : now,
    updatedAt: now,
  }
  await ref.set(data, { merge: true })
  return { id: ref.id, ...data }
}

export async function fetchDueJobs(now = new Date()) {
  ensureApp()
  const db = admin.firestore()
  const snap = await db
    .collection(COLLECTION)
    .where('status', '==', 'pending')
    .where('scheduledAt', '<=', now)
    .limit(50)
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function markJobStatus(id, status, meta = null) {
  ensureApp()
  const db = admin.firestore()
  const data = {
    status,
    updatedAt: new Date(),
  }
  if (meta) data.meta = { ...(meta || {}) }
  await db.collection(COLLECTION).doc(id).set(data, { merge: true })
}
