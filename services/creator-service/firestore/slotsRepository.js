import admin from 'firebase-admin'
import { creatorCollection, sanitizeForFirestore, serverTs } from '../utils/db.js'

function toTimestamp(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : admin.firestore.Timestamp.fromDate(d)
}

export async function listSlots(uid, { from, to, workspaceId } = {}) {
  const baseCol = creatorCollection(uid, 'slots')
  const query = workspaceId
    ? baseCol.where('workspaceId', '==', workspaceId).orderBy('scheduledAt', 'asc').limit(200)
    : baseCol.where('workspaceId', 'in', [null, '']).orderBy('scheduledAt', 'asc').limit(200)
  const snap = await query.get()
  const slots = snap.docs.map((d) => {
    const data = d.data() || {}
    const scheduledAt = data.scheduledAt?.toDate ? data.scheduledAt.toDate() : data.scheduledAt || null
    return {
      id: d.id,
      ...data,
      scheduledAt,
    }
  })

  const fromDate = from ? new Date(from) : null
  const toDate = to ? new Date(to) : null
  return slots.filter((slot) => {
    if (!slot.scheduledAt) return true
    const d = slot.scheduledAt instanceof Date ? slot.scheduledAt : new Date(slot.scheduledAt)
    if (fromDate && d < fromDate) return false
    if (toDate && d > toDate) return false
    return true
  })
}

export async function createSlot(uid, payload = {}) {
  const ref = creatorCollection(uid, 'slots').doc()
  const status =
    payload.status || (payload.scheduledAt || payload.scheduleAt ? 'scheduled' : 'draft')
  const data = sanitizeForFirestore({
    ownerId: uid,
    planId: payload.planId || null,
    variantId: payload.variantId || payload.contentRef || null,
    platform: payload.platform || payload.channel || 'instagram',
    channelVariant: payload.channelVariant || payload.variantKey || null,
    variantType: payload.variantType || payload.type || null,
    caption: payload.caption || payload.body || '',
    mediaUrls: payload.mediaUrls || [],
    status,
    scheduledAt: toTimestamp(payload.scheduledAt || payload.scheduleAt),
    createdAt: serverTs(),
    updatedAt: serverTs(),
    workspaceId: payload.workspaceId || null,
  })
  await ref.set(data)
  return { id: ref.id, ...data }
}

export async function updateSlot(uid, id, payload = {}) {
  const ref = creatorCollection(uid, 'slots').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return null
  const existing = snap.data() || {}
  if (payload.workspaceId && existing.workspaceId && existing.workspaceId !== payload.workspaceId) {
    return null
  }
  const updates = sanitizeForFirestore({
    ...payload,
    workspaceId: payload.workspaceId ?? existing.workspaceId ?? null,
    scheduledAt: toTimestamp(payload.scheduledAt || payload.scheduleAt),
    updatedAt: serverTs(),
  })
  await ref.set(updates, { merge: true })
  const refreshed = await ref.get()
  return { id: refreshed.id, ...refreshed.data() }
}
