import admin from 'firebase-admin'
import { db } from './firebaseAdmin.js'

// Returns an array of { id, email, name }
export async function getAllActiveUsers(limit = 1000) {
  const snap = await db.collection('users').limit(limit).get()
  const out = []
  snap.forEach((d) => {
    const u = d.data() || {}
    if (u?.email) out.push({ id: d.id, email: u.email, name: u.displayName || u.name || null })
  })
  return out
}

// Ensure a user profile document exists and is timestamped.
// If creating, set profileComplete based on presence of a name.
export async function ensureUserProfile(uid, data = {}) {
  if (!uid) throw new Error('ensureUserProfile: uid is required')
  const ref = db.collection('users').doc(String(uid))
  const snap = await ref.get()
  const existing = snap.exists ? snap.data() : null
  const isGuestProfile =
    data?.isGuest === true ||
    existing?.isGuest === true ||
    existing?.mode === 'guest'
  if (!snap.exists) {
    const base = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    if (base.profileComplete == null) {
      base.profileComplete = !!(base.name || base.displayName)
    }
    await ref.set(base)
  } else {
    await ref.set({ updatedAt: new Date() }, { merge: true })
  }

  if (isGuestProfile && !existing?.firstVisitInitialized) {
    await ref.set(
      {
        isGuest: true,
        firstVisitInitialized: false,
        createdAt: existing?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  }
  const fresh = await ref.get()
  return fresh.exists ? fresh.data() : null
}

// Merge updates into a user profile and bump updatedAt
export async function updateUserProfile(uid, update = {}) {
  if (!uid) throw new Error('updateUserProfile: uid is required')
  await db.collection('users').doc(String(uid)).set(
    { ...update, updatedAt: new Date() },
    { merge: true }
  )
}
