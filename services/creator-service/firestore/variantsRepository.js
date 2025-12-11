import { creatorCollection, serverTs, sanitizeForFirestore } from '../utils/db.js'

function baseVariant(uid, payload = {}, isNew = false) {
  return sanitizeForFirestore({
    ownerId: uid,
    platform: payload.platform || payload.channel || 'linkedin',
    type: payload.type || payload.format || 'post',
    title: payload.title || '',
    hook: payload.hook || null,
    outline: payload.outline || null,
    cta: payload.cta || null,
    body: payload.body || payload.caption || '',
    status: payload.status || 'draft',
    sourceId: payload.sourceId || null,
    aiMeta: payload.aiMeta || payload.meta || null,
    workspaceId: payload.workspaceId || null,
    createdAt: isNew ? serverTs() : undefined,
    updatedAt: serverTs(),
  })
}

export async function createVariant(uid, payload = {}) {
  const ref = creatorCollection(uid, 'variants').doc()
  const data = baseVariant(uid, payload, true)
  await ref.set(data)
  return { id: ref.id, ...data }
}

export async function updateVariant(uid, id, payload = {}) {
  const ref = creatorCollection(uid, 'variants').doc(id)
  const snap = await ref.get()
  if (!snap.exists) return null
  const existing = snap.data() || {}
  if (payload.workspaceId && existing.workspaceId && existing.workspaceId !== payload.workspaceId) {
    return null
  }
  const updates = baseVariant(uid, { ...payload, workspaceId: payload.workspaceId ?? existing.workspaceId ?? null }, false)
  await ref.set(updates, { merge: true })
  const refreshed = await ref.get()
  return { id: refreshed.id, ...refreshed.data() }
}

export async function getVariant(uid, id, workspaceId = null) {
  const snap = await creatorCollection(uid, 'variants').doc(id).get()
  if (!snap.exists) return null
  const data = snap.data() || {}
  if (workspaceId && data.workspaceId && data.workspaceId !== workspaceId) return null
  return { id: snap.id, ...data }
}

export async function listVariants(uid, opts = {}) {
  const col = creatorCollection(uid, 'variants')
  const wsId = opts.workspaceId || null
  const query = wsId
    ? col.where('workspaceId', '==', wsId).orderBy('updatedAt', 'desc').limit(200)
    : col.where('workspaceId', 'in', [null, '']).orderBy('updatedAt', 'desc').limit(200)
  const snap = await query.get()
  const variants = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (opts.status) {
    const target = Array.isArray(opts.status) ? opts.status : [opts.status]
    return variants.filter((v) => target.includes(v.status))
  }
  return variants
}

export async function createVariantsFromMap(uid, variants = {}, workspaceId = null) {
  const saved = []
  for (const value of Object.values(variants)) {
    const variant = await createVariant(uid, { ...value, workspaceId })
    saved.push(variant)
  }
  return saved
}
