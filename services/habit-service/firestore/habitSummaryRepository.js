import { db as getDb, ensureApp } from "../utils/firebase.js";

ensureApp();
const collection = getDb().collection("habit_summary");

export async function getSummary(userId) {
  const doc = await collection.doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function upsertSummary(userId, payload) {
  const now = new Date().toISOString();
  await collection
    .doc(userId)
    .set({ ...payload, updated_at: now, last_analyzed: payload.last_analyzed || now }, { merge: true });
  const doc = await collection.doc(userId).get();
  return { id: doc.id, ...doc.data() };
}
