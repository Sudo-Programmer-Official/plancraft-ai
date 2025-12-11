import { creatorCollection, sanitizeForFirestore, serverTs } from '../utils/db.js'

export async function saveMedia(uid, payload = {}) {
  const ref = creatorCollection(uid, 'media').doc()
  const data = sanitizeForFirestore({
    ownerId: uid,
    storagePath: payload.storagePath || payload.path || null,
    downloadUrl: payload.downloadUrl || payload.url || null,
    mimeType: payload.mimeType || payload.type || null,
    type: payload.type || payload.kind || 'other',
    sizeBytes: payload.sizeBytes || payload.size || null,
    width: payload.width || null,
    height: payload.height || null,
    slotId: payload.slotId || null,
    variantId: payload.variantId || null,
    workspaceId: payload.workspaceId || null,
    createdAt: serverTs(),
    updatedAt: serverTs(),
  })
  await ref.set(data)
  return { id: ref.id, ...data }
}
