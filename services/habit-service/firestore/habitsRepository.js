import { db as getDb, ensureApp } from "../utils/firebase.js";

ensureApp();
const collection = getDb().collection("habits");

export async function listHabits(userId, { activeOnly = true } = {}) {
  let ref = collection.where("userId", "==", userId);
  if (activeOnly) ref = ref.where("active", "==", true);
  const snap = await ref.orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getHabit(habitId) {
  const doc = await collection.doc(habitId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function createHabit(payload) {
  const now = new Date().toISOString();
  const docRef = await collection.add({
    ...payload,
    active: payload.active !== false,
    createdAt: now,
    updatedAt: now,
  });
  const doc = await docRef.get();
  return { id: doc.id, ...doc.data() };
}

export async function updateHabit(habitId, payload) {
  const data = { ...payload, updatedAt: new Date().toISOString() };
  await collection.doc(habitId).set(data, { merge: true });
  const doc = await collection.doc(habitId).get();
  return { id: doc.id, ...doc.data() };
}

export async function softDeleteHabit(habitId) {
  await collection.doc(habitId).set({ active: false, updatedAt: new Date().toISOString() }, { merge: true });
  const doc = await collection.doc(habitId).get();
  return { id: doc.id, ...doc.data() };
}
