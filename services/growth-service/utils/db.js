import admin from 'firebase-admin'
import { ensureApp } from './firebase.js'

export function getDb() {
  ensureApp()
  return admin.firestore()
}

export function userRoot(uid) {
  const db = getDb()
  // Store per-leader data under leaders/{uid}
  return db.collection('leaders').doc(uid)
}

export function userCollection(uid, name) {
  return userRoot(uid).collection(name)
}

export function serverTs() {
  return admin.firestore.FieldValue.serverTimestamp()
}

// Remove undefined values so Firestore merges stay clean; preserve null when set intentionally.
export function sanitizeForFirestore(obj = {}) {
  if (obj === null || typeof obj !== 'object') return obj
  const cleaned = Array.isArray(obj) ? [...obj] : { ...obj }
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) {
      delete cleaned[key]
    } else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
      if (typeof cleaned[key].toDate === 'function') return
      cleaned[key] = sanitizeForFirestore(cleaned[key])
    }
  })
  return cleaned
}
