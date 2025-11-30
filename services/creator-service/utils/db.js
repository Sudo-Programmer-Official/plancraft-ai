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
  return collection(name).where('userId', '==', uid)
}

export function docRef(name, id) {
  return collection(name).doc(id)
}

export function serverTs() {
  return admin.firestore.FieldValue.serverTimestamp()
}
