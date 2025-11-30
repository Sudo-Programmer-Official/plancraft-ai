import { collection, docRef, serverTs } from '../utils/db.js'

const COLL = 'creator_schedule'

export async function listSchedule(userId) {
  const snap = await collection(COLL)
    .where('userId', '==', userId)
    .orderBy('scheduledFor', 'asc')
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createSchedule(userId, payload = {}) {
  const ref = collection(COLL).doc()
  const data = {
    userId,
    platform: payload.platform || 'instagram',
    variant: payload.variant || null,
    caption: payload.caption || '',
    mediaUrl: payload.mediaUrl || null,
    scheduledFor: payload.scheduledFor || null,
    status: payload.status || 'pending',
    createdAt: serverTs(),
    updatedAt: serverTs(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}

export async function updateSchedule(userId, id, payload = {}) {
  const ref = docRef(COLL, id)
  const updates = { ...payload, updatedAt: serverTs(), userId }
  await ref.set(updates, { merge: true })
  const snap = await ref.get()
  return { id: snap.id, ...snap.data() }
}

export async function deleteSchedule(userId, id) {
  await docRef(COLL, id).delete()
  return true
}
