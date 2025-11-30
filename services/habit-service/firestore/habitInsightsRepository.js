import { db as getDb, ensureApp } from "../utils/firebase.js";

ensureApp();
const collection = getDb().collection("habit_insights");

export async function getLatestInsights(userId) {
  const snap = await collection.where("userId", "==", userId).orderBy("generatedAt", "desc").limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function saveInsights(userId, payload) {
  const now = new Date().toISOString();
  const data = { userId, ...payload, generatedAt: payload.generatedAt || now };
  const docRef = await collection.add(data);
  const doc = await docRef.get();
  return { id: doc.id, ...doc.data() };
}
