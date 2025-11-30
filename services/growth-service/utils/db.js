import admin from 'firebase-admin'
import { ensureApp } from './firebase.js'

export function getDb() {
  ensureApp()
  return admin.firestore()
}

export function userRoot(uid) {
  const db = getDb()
  return db.collection('leader').doc(uid)
}

export function userCollection(uid, name) {
  return userRoot(uid).collection(name)
}

export function serverTs() {
  return admin.firestore.FieldValue.serverTimestamp()
}
