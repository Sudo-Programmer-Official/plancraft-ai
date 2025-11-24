import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'

export async function logAi(entry) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('ai_outputs').doc()
  const data = {
    userId: entry.userId || 'anon',
    type: entry.type || 'unknown',
    input: entry.input || '',
    output: entry.output || '',
    createdAt: new Date(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}
