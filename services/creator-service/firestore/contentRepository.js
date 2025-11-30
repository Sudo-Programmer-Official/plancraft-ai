import { collection, docRef, serverTs } from '../utils/db.js'

const COLL = 'creator_content'

export async function saveContent(userId, id, payload = {}) {
  const ref = id ? docRef(COLL, id) : collection(COLL).doc()
  const data = {
    userId,
    title: payload.title || '',
    hook: payload.hook || null,
    outline: payload.outline || null,
    cta: payload.cta || null,
    variants: payload.variants || {},
    updatedAt: serverTs(),
    createdAt: payload.createdAt || serverTs(),
  }
  await ref.set(data, { merge: true })
  const snap = await ref.get()
  return { id: ref.id, ...snap.data() }
}

export async function getContent(userId, id) {
  const snap = await docRef(COLL, id).get()
  if (!snap.exists) return null
  const data = snap.data() || {}
  if (data.userId !== userId) return null
  return { id: snap.id, ...data }
}
