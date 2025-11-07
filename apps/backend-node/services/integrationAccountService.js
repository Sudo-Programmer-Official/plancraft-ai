import { db } from "./firebaseAdmin.js";

const COLLECTION = "integrationAccounts";

function buildDocId(userId, provider, accountId = "default") {
  return `${provider || "unknown"}_${userId || "no-user"}_${accountId || "default"}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 500);
}

function nowIso() {
  return new Date().toISOString();
}

export async function upsertIntegrationAccount({
  userId,
  provider,
  accountId = "default",
  accountEmail = null,
  accessToken = null,
  refreshToken = null,
  tokenExpiry = null,
  syncToken = null,
  timezone = null,
  metadata = {},
}) {
  if (!userId || !provider) throw new Error("userId and provider are required");
  const docId = buildDocId(userId, provider, accountId);
  const ref = db.collection(COLLECTION).doc(docId);
  const payload = {
    userId,
    provider,
    accountId,
    accountEmail,
    accessToken,
    refreshToken,
    tokenExpiry,
    syncToken: syncToken || null,
    timezone: timezone || null,
    metadata: metadata || {},
    updatedAt: nowIso(),
    createdAt: nowIso(),
    lastSyncAt: null,
    status: "connected",
  };
  await ref.set(payload, { merge: true });
  return { id: docId, ...payload };
}

export async function getIntegrationAccount(userId, provider, accountId = "default") {
  const docId = buildDocId(userId, provider, accountId);
  const snap = await db.collection(COLLECTION).doc(docId).get();
  if (!snap.exists) return null;
  return { id: docId, ...(snap.data() || {}) };
}

export async function removeIntegrationAccount(userId, provider, accountId = "default") {
  const docId = buildDocId(userId, provider, accountId);
  await db.collection(COLLECTION).doc(docId).delete().catch(() => {});
}

export async function updateIntegrationAccountTokens(userId, provider, { accountId = "default", accessToken, refreshToken, tokenExpiry }) {
  const docId = buildDocId(userId, provider, accountId);
  const ref = db.collection(COLLECTION).doc(docId);
  await ref.set(
    {
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      tokenExpiry: tokenExpiry || null,
      updatedAt: nowIso(),
    },
    { merge: true },
  );
  return getIntegrationAccount(userId, provider, accountId);
}

export async function listIntegrationAccountsByProvider(provider) {
  const snap = await db.collection(COLLECTION).where("provider", "==", provider).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
}

export async function listUserIntegrationAccounts(userId, provider = null) {
  let ref = db.collection(COLLECTION).where("userId", "==", userId);
  if (provider) ref = ref.where("provider", "==", provider);
  const snap = await ref.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
}

export async function markIntegrationAccountSync(userId, provider, accountId, { syncToken, lastSyncAt, status = "ok" }) {
  const docId = buildDocId(userId, provider, accountId);
  await db.collection(COLLECTION).doc(docId).set(
    {
      syncToken: syncToken || null,
      lastSyncAt: lastSyncAt || nowIso(),
      status,
      updatedAt: nowIso(),
    },
    { merge: true },
  );
}

