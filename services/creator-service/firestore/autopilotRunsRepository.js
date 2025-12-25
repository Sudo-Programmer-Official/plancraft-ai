import admin from 'firebase-admin'
import crypto from 'crypto'
import { ensureApp } from '../utils/firebase.js'
import { serverTs, sanitizeForFirestore } from '../utils/db.js'

const COLL = 'creator_autopilot_runs'

function hashProfile(profile = {}) {
  try {
    const str = JSON.stringify(profile || {})
    return crypto.createHash('sha256').update(str).digest('hex')
  } catch {
    return null
  }
}

export async function startRun({ userId, workspaceId, campaignId, profile }) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection(COLL).doc()
  const data = sanitizeForFirestore({
    userId,
    workspaceId: workspaceId || null,
    campaignId: campaignId || null,
    startedAt: serverTs(),
    mode: 'draft-only',
    profileHash: hashProfile(profile),
    profileSnapshot: profile || null,
    generatedVariantIds: [],
    skippedReasons: [],
  })
  await ref.set(data, { merge: true })
  return { id: ref.id, ...data }
}

export async function completeRun(id, updates = {}) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection(COLL).doc(id)
  await ref.set(
    sanitizeForFirestore({
      ...updates,
      completedAt: serverTs(),
    }),
    { merge: true },
  )
  const snap = await ref.get()
  return { id: snap.id, ...snap.data() }
}
