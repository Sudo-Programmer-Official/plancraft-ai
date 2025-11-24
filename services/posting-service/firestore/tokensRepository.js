import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'

export async function getTokensByUser(userId) {
  ensureApp()
  const db = admin.firestore()
  const snap = await db.collection('user_social_tokens').doc(userId).get()
  return snap.exists ? snap.data() : {}
}

export async function saveUserTokens(userId, payload) {
  ensureApp()
  const db = admin.firestore()
  await db.collection('user_social_tokens').doc(userId).set(payload, { merge: true })
}
