import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'

function usageCollection() {
  ensureApp()
  return admin.firestore().collection('usage')
}

export async function incrementUsage(workspaceId, count = 1) {
  if (!workspaceId) return
  const ref = usageCollection().doc(String(workspaceId))
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const existing = snap.exists ? snap.data() : {}
    const current = existing.aiImagesGenerated || 0
    tx.set(
      ref,
      {
        workspaceId,
        aiImagesGenerated: current + Math.max(count, 0),
        lastResetAt: existing.lastResetAt || null,
        updatedAt: new Date(),
      },
      { merge: true },
    )
  })
}
