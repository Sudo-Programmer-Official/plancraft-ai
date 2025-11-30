import { collection, docRef, serverTs } from '../utils/db.js'

const COLL = 'creator_drafts'
const INSPIRATION_COLL = 'creator_inspiration'

export async function listDrafts(userId) {
  const snap = await collection(COLL).where('userId', '==', userId).orderBy('updatedAt', 'desc').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createDraft(userId, payload = {}) {
  const ref = collection(COLL).doc()
  const data = {
    userId,
    title: payload.title || '',
    type: payload.type || 'generic',
    body: payload.body || '',
    variant: payload.variant || 'draft',
    tags: payload.tags || [],
    createdAt: serverTs(),
    updatedAt: serverTs(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}

export async function updateDraft(userId, id, payload = {}) {
  const ref = docRef(COLL, id)
  const updates = { ...payload, updatedAt: serverTs(), userId }
  await ref.set(updates, { merge: true })
  const snap = await ref.get()
  return { id: snap.id, ...snap.data() }
}

export async function deleteDraft(userId, id) {
  await docRef(COLL, id).set({ deleted: true, updatedAt: serverTs(), userId }, { merge: true })
  return true
}

export async function listInspiration(userId) {
  const snap = await collection(INSPIRATION_COLL).where('userId', '==', userId).orderBy('createdAt', 'desc').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createInspiration(userId, payload = {}) {
  const ref = collection(INSPIRATION_COLL).doc()
  const data = {
    userId,
    note: payload.note || '',
    source: payload.source || '',
    createdAt: serverTs(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}
