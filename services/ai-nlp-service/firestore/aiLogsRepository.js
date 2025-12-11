import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'

export async function logAi(entry) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('ai_outputs').doc()
  const data = {
    userId: entry.userId || 'anon',
    workspaceId: entry.workspaceId || null,
    type: entry.type || 'unknown',
    input: entry.input || '',
    output: entry.output || '',
    createdAt: new Date(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}

export async function logAiEvent(entry = {}) {
  ensureApp()
  const db = admin.firestore()
  const ref = db.collection('ai_logs').doc()
  const data = {
    userId: entry.userId || 'anon',
    workspaceId: entry.workspaceId || null,
    route: entry.route || entry.type || 'unknown',
    inputQuestion: entry.inputQuestion || null,
    contextSummary: entry.contextSummary || null,
    createdAt: new Date(),
  }
  await ref.set(data)
  return { id: ref.id, ...data }
}
