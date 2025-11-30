import { db as getDb, ensureApp } from "../utils/firebase.js";

ensureApp();
const collection = getDb().collection("habit_logs");

function docKey(habitId, date) {
  return `${habitId}_${date}`;
}

export async function upsertDailyLog(habitId, userId, date, payload = {}) {
  const key = docKey(habitId, date);
  const now = new Date().toISOString();
  const data = {
    habitId,
    userId,
    date,
    completed: payload.completed !== false,
    count: payload.count || 1,
    timezone: payload.timezone || null,
    source: payload.source || "manual",
    taskId: payload.taskId || null,
    completionTime: payload.completionTime || now,
    updatedAt: now,
    createdAt: payload.createdAt || now,
  };
  await collection.doc(key).set(data, { merge: true });
  const doc = await collection.doc(key).get();
  return { id: doc.id, ...doc.data() };
}

export async function getLogsForDate(userId, date) {
  const snap = await collection.where("userId", "==", userId).where("date", "==", date).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getLogsForWindow(userId, sinceDate) {
  const snap = await collection.where("userId", "==", userId).where("date", ">=", sinceDate).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getLogsForHabit(habitId, sinceDate) {
  let ref = collection.where("habitId", "==", habitId);
  if (sinceDate) ref = ref.where("date", ">=", sinceDate);
  const snap = await ref.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
