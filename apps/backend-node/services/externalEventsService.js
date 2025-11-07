import { db } from "./firebaseAdmin.js";

const COLLECTION = "externalEvents";

function buildDocId(userId, provider, externalId) {
  return `${provider || "provider"}_${userId || "user"}_${externalId || "event"}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 500);
}

function nowIso() {
  return new Date().toISOString();
}

export async function upsertExternalEvent(userId, provider, event) {
  if (!userId || !provider || !event?.externalId) {
    throw new Error("userId, provider, and externalId are required");
  }
  const docId = buildDocId(userId, provider, event.externalId);
  const ref = db.collection(COLLECTION).doc(docId);
  const payload = {
    userId,
    provider,
    accountId: event.accountId || null,
    externalId: event.externalId,
    calendarId: event.calendarId || null,
    title: event.title || "Untitled event",
    description: event.description || "",
    location: event.location || "",
    joinUrl: event.joinUrl || null,
    startTime: event.startTime || null,
    endTime: event.endTime || null,
    status: event.status || "confirmed",
    allDay: !!event.allDay,
    attendees: Array.isArray(event.attendees) ? event.attendees : [],
    raw: event.raw || null,
    lastSeenAt: nowIso(),
    taskId: event.taskId || null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await ref.set(payload, { merge: true });
  return { id: docId, ...payload };
}

export async function linkEventToTask(userId, provider, externalId, taskId) {
  const docId = buildDocId(userId, provider, externalId);
  const ref = db.collection(COLLECTION).doc(docId);
  await ref.set(
    {
      taskId,
      updatedAt: nowIso(),
    },
    { merge: true },
  );
}

export async function markEventCancelled(userId, provider, externalId) {
  const docId = buildDocId(userId, provider, externalId);
  await db.collection(COLLECTION).doc(docId).set(
    {
      status: "cancelled",
      updatedAt: nowIso(),
    },
    { merge: true },
  );
}

export async function listPendingEvents(userId, provider, { windowStart = null, windowEnd = null } = {}) {
  let ref = db.collection(COLLECTION)
    .where("userId", "==", userId)
    .where("provider", "==", provider)
    .where("status", "in", ["confirmed", "tentative"]);
  if (windowStart) {
    ref = ref.where("startTime", ">=", windowStart);
  }
  if (windowEnd) {
    ref = ref.where("startTime", "<=", windowEnd);
  }
  const snap = await ref.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
}

export async function listEventsNeedingTasks(userId, provider, options = {}) {
  const windowStart = options.windowStart || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let ref = db.collection(COLLECTION)
    .where("userId", "==", userId)
    .where("provider", "==", provider)
    .where("status", "==", "confirmed")
    .where("taskId", "==", null)
    .where("startTime", ">=", windowStart);
  if (options.windowEnd) {
    ref = ref.where("startTime", "<=", options.windowEnd);
  }
  const snap = await ref.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
}

export async function getNextMeeting(userId, provider, fromIso = new Date().toISOString()) {
  const ref = db.collection(COLLECTION)
    .where("userId", "==", userId)
    .where("provider", "==", provider)
    .where("status", "in", ["confirmed", "tentative"])
    .where("startTime", ">=", fromIso)
    .orderBy("startTime", "asc")
    .limit(1);
  const snap = await ref.get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() || {}) };
}

export async function deleteExternalEventsForAccount(userId, provider, accountId) {
  const ref = await db.collection(COLLECTION)
    .where("userId", "==", userId)
    .where("provider", "==", provider)
    .where("accountId", "==", accountId)
    .get();
  const batch = db.batch();
  ref.docs.forEach((doc) => batch.delete(doc.ref));
  if (ref.docs.length) await batch.commit();
}

export async function listEventsForWindow(userId, provider, { windowStart = null, windowEnd = null, statuses = ["confirmed", "tentative", "cancelled"] } = {}) {
  let ref = db.collection(COLLECTION)
    .where("userId", "==", userId)
    .where("provider", "==", provider);
  if (Array.isArray(statuses) && statuses.length) {
    ref = ref.where("status", "in", statuses.slice(0, 10));
  }
  if (windowStart) {
    ref = ref.where("startTime", ">=", windowStart);
  }
  if (windowEnd) {
    ref = ref.where("startTime", "<=", windowEnd);
  }
  const snap = await ref.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
}
