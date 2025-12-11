import { collection, docRef, serverTs } from '../utils/db.js'

const COLL = 'creator_content'

export async function saveContent(userId, id, payload = {}) {
  const ref = id ? docRef(COLL, id) : collection(COLL).doc()
  const existingSnap = id ? await ref.get() : null
  const existing = existingSnap?.exists ? existingSnap.data() || {} : null
  if (existing) {
    if (existing.userId && existing.userId !== userId) return null
    if (payload.workspaceId && existing.workspaceId && existing.workspaceId !== payload.workspaceId) return null
  }
  const data = {
    userId,
    title: payload.title || '',
    hook: payload.hook || null,
    outline: payload.outline || null,
    cta: payload.cta || null,
    variants: payload.variants || {},
    updatedAt: serverTs(),
    createdAt: existing?.createdAt || payload.createdAt || serverTs(),
    workspaceId: payload.workspaceId ?? existing?.workspaceId ?? null,
  }
  await ref.set(data, { merge: true })
  const snap = await ref.get()
  return { id: ref.id, ...snap.data() }
}

export async function getContent(userId, id, workspaceId = null) {
  const snap = await docRef(COLL, id).get()
  if (!snap.exists) return null
  const data = snap.data() || {}
  if (data.userId !== userId) return null
  if (workspaceId && data.workspaceId && data.workspaceId !== workspaceId) return null
  return { id: snap.id, ...data }
}
