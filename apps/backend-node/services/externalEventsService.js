import { db } from "./firebaseAdmin.js";

const COLLECTION = "externalEvents";

function sanitizeComponent(value, fallback) {
  const token = String(value ?? fallback ?? "").trim();
  return token
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 120);
}

function buildDocId(userId, provider, externalId, occurrenceKey, accountId = "default") {
  const base = [
    sanitizeComponent(provider, "provider"),
    sanitizeComponent(accountId, "acct"),
    sanitizeComponent(userId, "user"),
    sanitizeComponent(externalId, "event"),
  ];
  if (occurrenceKey) base.push(sanitizeComponent(occurrenceKey, "instance"));
  return base.join("_").slice(0, 500);
}

function nowIso() {
  return new Date().toISOString();
}

function eventKey(externalId, occurrenceKey) {
  return `${externalId || "event"}::${occurrenceKey || "single"}`;
}

export function buildExternalEventKey(externalId, occurrenceKey) {
  return eventKey(externalId, occurrenceKey);
}

export async function findExternalEvent(userId, provider, externalId, occurrenceKey = null, accountId = "default") {
  if (!userId || !provider || !externalId) return null;
  const docId = buildDocId(userId, provider, externalId, occurrenceKey, accountId);
  let snap = await db.collection(COLLECTION).doc(docId).get();
  if (!snap.exists && accountId && accountId !== "default") {
    const legacyId = buildDocId(userId, provider, externalId, occurrenceKey, "default");
    snap = await db.collection(COLLECTION).doc(legacyId).get();
    if (snap.exists) return { id: legacyId, ...(snap.data() || {}) };
    return null;
  }
  if (!snap.exists) return null;
  return { id: docId, ...(snap.data() || {}) };
}

export async function upsertExternalEvent(userId, provider, event = {}) {
  if (!userId || !provider || !event?.externalId) {
    throw new Error("userId, provider, and externalId are required");
  }
  const occurrenceKey = event.occurrenceKey || null;
  const accountId = event.accountId || "default";
  const docId = buildDocId(userId, provider, event.externalId, occurrenceKey, accountId);
  const ref = db.collection(COLLECTION).doc(docId);
  let snap = await ref.get();
  let existing = snap.exists ? snap.data() || {} : {};
  if (!snap.exists && occurrenceKey) {
    const legacyId = buildDocId(userId, provider, event.externalId, null, accountId);
    const legacySnap = await db.collection(COLLECTION).doc(legacyId).get();
    if (legacySnap.exists) {
      existing = legacySnap.data() || {};
      try {
        await db.collection(COLLECTION).doc(legacyId).delete();
      } catch {}
    } else if (accountId && accountId !== "default") {
      const accountAgnosticId = buildDocId(userId, provider, event.externalId, occurrenceKey, "default");
      const accountAgnosticSnap = await db.collection(COLLECTION).doc(accountAgnosticId).get();
      if (accountAgnosticSnap.exists) {
        existing = accountAgnosticSnap.data() || {};
        try {
          await db.collection(COLLECTION).doc(accountAgnosticId).delete();
        } catch {}
      }
    }
    snap = { exists: false };
  }
  const now = nowIso();

  const payload = {
    userId,
    provider,
    accountId: event.accountId ?? existing.accountId ?? accountId ?? null,
    externalId: event.externalId,
    providerEventId: event.providerEventId || event.externalId,
    occurrenceKey,
    calendarId: event.calendarId ?? existing.calendarId ?? null,
    title: event.title ?? existing.title ?? "Untitled event",
    description: event.description ?? existing.description ?? "",
    location: event.location ?? existing.location ?? "",
    joinUrl: event.joinUrl ?? existing.joinUrl ?? null,
    joinProvider: event.joinProvider ?? event.join?.provider ?? existing.joinProvider ?? null,
    eventUrl: event.eventUrl ?? existing.eventUrl ?? existing.raw?.htmlLink ?? null,
    startTime: event.startTime ?? existing.startTime ?? null,
    endTime: event.endTime ?? existing.endTime ?? null,
    timezone: event.timezone ?? existing.timezone ?? null,
    status: event.status ?? existing.status ?? "confirmed",
    allDay: event.allDay ?? existing.allDay ?? false,
    attendees: Array.isArray(event.attendees) ? event.attendees : existing.attendees || [],
    raw: event.raw ?? existing.raw ?? null,
    lastHash: event.contentHash ?? event.lastHash ?? existing.lastHash ?? null,
    lastSeenAt: now,
    lastSyncedAt: now,
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };

  if (event.taskId !== undefined) payload.taskId = event.taskId;
  if (event.taskHash !== undefined) payload.taskHash = event.taskHash;

  await ref.set(payload, { merge: true });
  return { id: docId, ...existing, ...payload };
}

export async function linkEventToTask(userId, provider, externalId, occurrenceKey, taskId, lastHash = null, accountId = "default") {
  if (!userId || !provider || !externalId) return;
  const docId = buildDocId(userId, provider, externalId, occurrenceKey, accountId);
  const updates = {
    taskId,
    updatedAt: nowIso(),
  };
  if (lastHash) updates.taskHash = lastHash;
  await db.collection(COLLECTION).doc(docId).set(updates, { merge: true });
}

export async function markEventCancelled(userId, provider, externalId, occurrenceKey = null, accountId = "default") {
  const docId = buildDocId(userId, provider, externalId, occurrenceKey, accountId);
  await db.collection(COLLECTION).doc(docId).set(
    {
      status: "cancelled",
      updatedAt: nowIso(),
    },
    { merge: true },
  );
}

export async function markExternalEventDeleted(userId, provider, externalId, occurrenceKey = null, accountId = "default") {
  const docId = buildDocId(userId, provider, externalId, occurrenceKey, accountId);
  await db.collection(COLLECTION).doc(docId).set(
    {
      status: "deleted",
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

export async function listEventsForWindow(
  userId,
  provider,
  { windowStart = null, windowEnd = null, statuses = ["confirmed", "tentative", "cancelled", "deleted"] } = {},
) {
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
