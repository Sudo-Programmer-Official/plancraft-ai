import { ensureApp } from './firebase.js'
import admin from 'firebase-admin'

export function getDb() {
  ensureApp()
  return admin.firestore()
}

export function collection(name) {
  return getDb().collection(name)
}

export function userCollection(uid, name) {
  return creatorCollection(uid, name)
}

export function docRef(name, id) {
  return collection(name).doc(id)
}

export function serverTs() {
  return admin.firestore.FieldValue.serverTimestamp()
}

export function creatorRoot(uid) {
  return getDb().collection('creators').doc(uid)
}

export function creatorCollection(uid, name) {
  return creatorRoot(uid).collection(name)
}

export function sanitizeForFirestore(obj = {}) {
  if (obj === null || typeof obj !== 'object') return obj
  const cleaned = Array.isArray(obj) ? [...obj] : { ...obj }
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) delete cleaned[key]
    else if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
      if (typeof cleaned[key].toDate === 'function') return
      cleaned[key] = sanitizeForFirestore(cleaned[key])
    }
  })
  return cleaned
}
