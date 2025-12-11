import { collection, docRef, serverTs } from '../utils/db.js'

const COLL = 'creator_drafts'
const INSPIRATION_COLL = 'creator_inspiration'

function wsFilter(query, workspaceId) {
  if (!workspaceId) return query.where('workspaceId', 'in', [null, '']).orderBy('updatedAt', 'desc')
  return query.where('workspaceId', '==', workspaceId).orderBy('updatedAt', 'desc')
}

export async function listDrafts(userId, workspaceId = null) {
  let query = collection(COLL).where('userId', '==', userId)
  const snap = await wsFilter(query, workspaceId).get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createDraft(userId, payload = {}, workspaceId = null) {
  const ref = collection(COLL).doc()
  const data = {
    userId,
    title: payload.title || '',
    type: payload.type || 'generic',
    body: payload.body || '',
    variant: payload.variant || 'draft',
    tags: payload.tags || [],
    workspaceId: workspaceId || payload.workspaceId || null,
    createdAt: serverTs(),
    updatedAt: serverTs(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}

export async function updateDraft(userId, id, payload = {}, workspaceId = null) {
  const ref = docRef(COLL, id)
  const snap = await ref.get()
  if (!snap.exists) return null
  const existing = snap.data() || {}
  if (workspaceId && existing.workspaceId && existing.workspaceId !== workspaceId) return null
  const updates = {
    ...payload,
    workspaceId: workspaceId ?? payload.workspaceId ?? existing.workspaceId ?? null,
    updatedAt: serverTs(),
    userId,
  }
  await ref.set(updates, { merge: true })
  const refreshed = await ref.get()
  return { id: refreshed.id, ...refreshed.data() }
}

export async function deleteDraft(userId, id, workspaceId = null) {
  const ref = docRef(COLL, id)
  const snap = await ref.get()
  if (!snap.exists) return false
  const existing = snap.data() || {}
  if (workspaceId && existing.workspaceId && existing.workspaceId !== workspaceId) return false
  await ref.set(
    {
      deleted: true,
      updatedAt: serverTs(),
      userId,
      workspaceId: workspaceId ?? existing.workspaceId ?? null,
    },
    { merge: true },
  )
  return true
}

export async function listInspiration(userId, workspaceId = null) {
  let query = collection(INSPIRATION_COLL).where('userId', '==', userId)
  const snap = workspaceId
    ? await query.where('workspaceId', '==', workspaceId).orderBy('createdAt', 'desc').get()
    : await query.where('workspaceId', 'in', [null, '']).orderBy('createdAt', 'desc').get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createInspiration(userId, payload = {}, workspaceId = null) {
  const ref = collection(INSPIRATION_COLL).doc()
  const data = {
    userId,
    note: payload.note || '',
    source: payload.source || '',
    workspaceId: workspaceId || payload.workspaceId || null,
    createdAt: serverTs(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}
