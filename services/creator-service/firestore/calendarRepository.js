import { collection, docRef, serverTs } from '../utils/db.js'

const COLL = 'creator_schedule'

function withWorkspace(query, workspaceId) {
  if (!workspaceId) return query.where('workspaceId', 'in', [null, '']).orderBy('scheduledFor', 'asc')
  return query.where('workspaceId', '==', workspaceId).orderBy('scheduledFor', 'asc')
}

export async function listSchedule(userId, workspaceId = null) {
  const base = collection(COLL).where('userId', '==', userId)
  const snap = await withWorkspace(base, workspaceId).get()
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
    workspaceId: payload.workspaceId || null,
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}

export async function updateSchedule(userId, id, payload = {}) {
  const ref = docRef(COLL, id)
  const snap = await ref.get()
  if (!snap.exists) return null
  const existing = snap.data() || {}
  if (payload.workspaceId && existing.workspaceId && existing.workspaceId !== payload.workspaceId) return null
  const updates = {
    ...payload,
    workspaceId: payload.workspaceId ?? existing.workspaceId ?? null,
    updatedAt: serverTs(),
    userId,
  }
  await ref.set(updates, { merge: true })
  const refreshed = await ref.get()
  return { id: refreshed.id, ...refreshed.data() }
}

export async function deleteSchedule(userId, id, workspaceId = null) {
  const ref = docRef(COLL, id)
  const snap = await ref.get()
  if (!snap.exists) return false
  const existing = snap.data() || {}
  if (workspaceId && existing.workspaceId && existing.workspaceId !== workspaceId) return false
  await ref.set(
    {
      deleted: true,
      workspaceId: workspaceId ?? existing.workspaceId ?? null,
      updatedAt: serverTs(),
      userId,
    },
    { merge: true },
  )
  return true
}
