import crypto from "crypto";
import admin from "firebase-admin";
import { db } from "./firebaseAdmin.js";

export const WORKSPACE_COLLECTION = "workspaces";
export const WORKSPACE_MEMBERS_COLLECTION = "workspace_members";
export const WORKSPACE_INVITES_COLLECTION = "workspace_invites";
export const WORKSPACE_BILLING_INTENTS_COLLECTION = "workspace_billing_intents";

export const WORKSPACE_ROLES = ["viewer", "editor", "admin", "owner"];
export const WORKSPACE_PLANS = ["free", "starter", "pro"];

function planFeatures(plan = "free", overrides = {}) {
  const base = {
    voiceReminders: false,
    advancedPermissions: false,
    prioritySupport: false,
  };
  const normalized = String(plan || "free").toLowerCase();
  if (normalized === "starter") {
    base.voiceReminders = true;
  }
  if (normalized === "pro") {
    base.voiceReminders = true;
    base.advancedPermissions = true;
    base.prioritySupport = true;
  }
  return { ...base, ...(overrides || {}) };
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value.toDate();
  if (typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function coerceBoolean(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeWorkspaceSettings(settings = {}) {
  const creator = coerceBoolean(settings.creatorModeEnabled, false);
  const leader = coerceBoolean(settings.leaderModeEnabled, false);
  return {
    creatorModeEnabled: !!creator,
    leaderModeEnabled: !!leader,
  };
}

function normalizeWorkspaceDoc(doc) {
  if (!doc?.exists) return null;
  const data = doc.data() || {};
  return {
    id: doc.id,
    name: data.name || "Workspace",
    icon: data.icon || "📦",
    theme: data.theme || data.color || "indigo",
    ownerId: data.ownerId || null,
    timezone: data.timezone || "UTC",
    workspaceType: data.workspaceType || "team",
    description: data.description || "",
    plan: data.plan || "free",
    seatLimit: data.seatLimit ?? null,
    seats: data.seats ?? data.seatCount ?? null,
    seatsUsed: data.seatsUsed ?? data.seats_used ?? null,
    billingStatus: data.billingStatus || "none",
    stripeSubscriptionId: data.stripeSubscriptionId || data.stripeSubId || null,
    stripeCustomerId: data.stripeCustomerId || null,
    features: planFeatures(data.plan || "free", data.features || {}),
    settings: normalizeWorkspaceSettings(data.settings || {}),
    lastOpenedAt: normalizeDate(data.lastOpenedAt || data.last_opened_at),
    created_at: normalizeDate(data.created_at || data.createdAt),
    updated_at: normalizeDate(data.updated_at || data.updatedAt),
  };
}

function normalizeMemberDoc(doc) {
  if (!doc?.exists) return null;
  const data = doc.data() || {};
  return {
    id: doc.id,
    workspaceId: data.workspaceId || null,
    userId: data.userId || null,
    role: data.role || "viewer",
    invitedBy: data.invitedBy || null,
    email: data.email || null,
    status: data.status || "active",
    joined_at: normalizeDate(data.joined_at || data.joinedAt),
    updated_at: normalizeDate(data.updated_at || data.updatedAt),
  };
}

function normalizeInviteDoc(doc) {
  if (!doc?.exists) return null;
  const data = doc.data() || {};
  const emailLower = data.emailLower || (data.email ? String(data.email).toLowerCase() : null);
  return {
    id: doc.id,
    workspaceId: data.workspaceId || null,
    email: data.email || emailLower || null,
    emailLower: emailLower || null,
    role: data.role || "viewer",
    token: data.token || null,
    hashedToken: data.hashedToken || null,
    invitedBy: data.invitedBy || data.invitedByUid || null,
    invitedByUid: data.invitedByUid || data.invitedBy || null,
    expires_at: normalizeDate(data.expires_at || data.expiresAt),
    status: data.status || "pending",
    created_at: normalizeDate(data.created_at || data.createdAt),
    accepted_at: normalizeDate(data.accepted_at || data.acceptedAt),
    acceptedBy: data.acceptedBy || data.acceptedByUid || null,
    emailStatus: data.emailStatus || null,
    emailError: data.emailError || null,
    revoked_at: normalizeDate(data.revoked_at || data.revokedAt),
    revokedBy: data.revokedBy || null,
  };
}

function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  if (!token) return null;
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export async function countBillableMembers(workspaceId, { excludeViewers = true } = {}) {
  if (!workspaceId) return 0;
  try {
    const snap = await db
      .collection(WORKSPACE_MEMBERS_COLLECTION)
      .where("workspaceId", "==", workspaceId)
      .where("status", "==", "active")
      .get();
    if (snap.empty) return 0;
    let count = 0;
    snap.forEach((doc) => {
      const role = String(doc.data()?.role || "").toLowerCase();
      if (excludeViewers && role === "viewer") return;
      count += 1;
    });
    return count;
  } catch (err) {
    console.warn("[Workspace] countBillableMembers failed", err?.message || err);
    return 0;
  }
}

export async function recomputeSeatsUsed(workspaceId, { excludeViewers = true } = {}) {
  if (!workspaceId) return null;
  const count = await countBillableMembers(workspaceId, { excludeViewers });
  try {
    await db
      .collection(WORKSPACE_COLLECTION)
      .doc(String(workspaceId))
      .set({ seatsUsed: count, updated_at: new Date() }, { merge: true });
  } catch (err) {
    console.warn("[Workspace] recomputeSeatsUsed failed", err?.message || err);
  }
  return count;
}

function incrementSeats(workspaceId, delta = 0) {
  if (!workspaceId || !delta) return Promise.resolve();
  try {
    return db
      .collection(WORKSPACE_COLLECTION)
      .doc(String(workspaceId))
      .set(
        {
          seatsUsed: admin.firestore.FieldValue.increment(delta),
          updated_at: new Date(),
        },
        { merge: true },
      );
  } catch {
    return Promise.resolve();
  }
}

function memberRef(workspaceId, userId) {
  const key = `${workspaceId}_${userId}`;
  return db.collection(WORKSPACE_MEMBERS_COLLECTION).doc(key);
}

function userMembershipRef(userId, workspaceId) {
  return db.collection("users").doc(String(userId)).collection("memberships").doc(String(workspaceId));
}

async function mirrorUserMembership(workspaceId, userId, payload = {}) {
  if (!workspaceId || !userId) return;
  const ref = userMembershipRef(userId, workspaceId);
  await ref.set(
    {
      workspaceId,
      userId,
      role: payload.role || "viewer",
      status: payload.status || "active",
      invitedBy: payload.invitedBy || null,
      email: payload.email || null,
      joined_at: payload.joined_at || payload.joinedAt || new Date(),
      updated_at: new Date(),
    },
    { merge: true },
  );
}

export function isValidWorkspaceRole(role) {
  return WORKSPACE_ROLES.includes(String(role || "").toLowerCase());
}

export async function getWorkspace(workspaceId) {
  if (!workspaceId) return null;
  const snap = await db.collection(WORKSPACE_COLLECTION).doc(String(workspaceId)).get();
  return normalizeWorkspaceDoc(snap);
}

export async function getWorkspaceMembership(workspaceId, userId) {
  if (!workspaceId || !userId) return null;
  const snap = await memberRef(workspaceId, userId).get();
  return normalizeMemberDoc(snap);
}

export async function createWorkspace({
  name,
  icon = "📦",
  theme = "indigo",
  ownerId,
  timezone = "UTC",
  workspaceType = "team",
  description = "",
  plan = "free",
  planIntent = null,
  seatLimit = null,
  features = null,
  settings = null,
  seats = 1,
  billingStatus = "none",
}) {
  if (!ownerId) throw new Error("ownerId is required to create a workspace");
  const planNormalized = WORKSPACE_PLANS.includes(String(planIntent || plan || "free").toLowerCase())
    ? String(planIntent || plan || "free").toLowerCase()
    : "free";
  const now = new Date();
  const ref = await db.collection(WORKSPACE_COLLECTION).add({
    name: (name || "New workspace").trim(),
    icon: icon || "📦",
    theme: theme || "indigo",
    ownerId,
    timezone: timezone || "UTC",
    workspaceType: workspaceType || "team",
    description: description || "",
    plan: planNormalized,
    seatLimit: seatLimit ?? null,
    seats: Number.isFinite(seats) ? Math.max(1, Number(seats)) : 1,
    seatsUsed: 1,
    billingStatus: billingStatus || "none",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    features: planFeatures(planNormalized, features || {}),
    settings: normalizeWorkspaceSettings(settings || {}),
    lastOpenedAt: now,
    created_at: now,
    updated_at: now,
  });

  const workspace = {
    id: ref.id,
    name: (name || "New workspace").trim(),
    icon: icon || "📦",
    theme: theme || "indigo",
    ownerId,
    timezone: timezone || "UTC",
    workspaceType: workspaceType || "team",
    description: description || "",
    plan: planNormalized,
    seatLimit: seatLimit ?? null,
    seats: Number.isFinite(seats) ? Math.max(1, Number(seats)) : 1,
    seatsUsed: 1,
    billingStatus: billingStatus || "none",
    stripeSubscriptionId: null,
    stripeCustomerId: null,
    features: planFeatures(planNormalized, features || {}),
    settings: normalizeWorkspaceSettings(settings || {}),
    lastOpenedAt: now,
    created_at: now,
    updated_at: now,
  };

  await memberRef(ref.id, ownerId).set(
    {
      workspaceId: ref.id,
      userId: ownerId,
      role: "owner",
      invitedBy: ownerId,
      status: "active",
      joined_at: now,
      updated_at: now,
    },
    { merge: true },
  );
  await mirrorUserMembership(ref.id, ownerId, {
    role: "owner",
    invitedBy: ownerId,
    status: "active",
    joined_at: now,
  });

  return workspace;
}

export async function updateWorkspace(workspaceId, patch = {}) {
  if (!workspaceId) throw new Error("workspaceId is required");
  const allowedFields = [
    "name",
    "icon",
    "theme",
    "timezone",
    "workspaceType",
    "description",
    "plan",
    "seatLimit",
    "seats",
    "seatsUsed",
    "billingStatus",
    "stripeSubscriptionId",
    "stripeCustomerId",
    "features",
    "lastOpenedAt",
    "last_opened_at",
    "settings",
  ];
  const updates = {};
  for (const key of allowedFields) {
    if (patch[key] !== undefined) updates[key] = patch[key];
  }
  if (typeof updates.lastOpenedAt === "string") {
    const parsed = new Date(updates.lastOpenedAt);
    if (!Number.isNaN(parsed.getTime())) updates.lastOpenedAt = parsed;
  }
  if (typeof updates.last_opened_at === "string") {
    const parsed = new Date(updates.last_opened_at);
    if (!Number.isNaN(parsed.getTime())) updates.last_opened_at = parsed;
  }
  if (updates.plan && !WORKSPACE_PLANS.includes(String(updates.plan).toLowerCase())) {
    delete updates.plan;
  }
  if (updates.features || updates.plan) {
    updates.features = planFeatures(
      updates.plan || undefined,
      updates.features && typeof updates.features === "object" ? updates.features : {},
    );
  }
  const requestedSettings = patch?.settings && typeof patch.settings === "object" ? patch.settings : {};
  const directSettings = {};
  if (patch.creatorModeEnabled !== undefined) directSettings.creatorModeEnabled = patch.creatorModeEnabled;
  if (patch.leaderModeEnabled !== undefined) directSettings.leaderModeEnabled = patch.leaderModeEnabled;
  const mergedSettings = { ...requestedSettings, ...directSettings };
  const hasSettingKeys =
    mergedSettings.creatorModeEnabled !== undefined || mergedSettings.leaderModeEnabled !== undefined;
  if (hasSettingKeys) {
    updates.settings = normalizeWorkspaceSettings({
      ...mergedSettings,
    });
  }
  updates.updated_at = new Date();
  await db.collection(WORKSPACE_COLLECTION).doc(String(workspaceId)).set(updates, { merge: true });
  const snap = await db.collection(WORKSPACE_COLLECTION).doc(String(workspaceId)).get();
  return normalizeWorkspaceDoc(snap);
}

export async function listUserWorkspaces(userId) {
  if (!userId) return [];
  const snap = await db
    .collection(WORKSPACE_MEMBERS_COLLECTION)
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .limit(500)
    .get();

  let memberships = snap.docs.map((doc) => normalizeMemberDoc(doc)).filter(Boolean);

  // Fast-read mirror fallback
  if (!memberships.length) {
    const mirrorSnap = await db
      .collection("users")
      .doc(String(userId))
      .collection("memberships")
      .where("status", "==", "active")
      .limit(500)
      .get();
    if (!mirrorSnap.empty) {
      memberships = mirrorSnap.docs.map((doc) => normalizeMemberDoc(doc)).filter(Boolean);
    }
  }

  // Legacy migration: if no memberships yet, seed from user-scoped workspaces
  if (!memberships.length) {
    const legacySnap = await db
      .collection("users")
      .doc(String(userId))
      .collection("workspaces")
      .limit(50)
      .get();
    if (!legacySnap.empty) {
      const batch = db.batch();
      const now = new Date();
      legacySnap.forEach((doc) => {
        const data = doc.data() || {};
        const wsRef = db.collection(WORKSPACE_COLLECTION).doc(doc.id);
        batch.set(
          wsRef,
          {
            name: data.name || "Workspace",
            icon: data.icon || "📦",
            theme: data.theme || data.color || "indigo",
            ownerId: data.ownerId || userId,
            timezone: data.timezone || "UTC",
            workspaceType: data.workspaceType || data.type || "team",
            description: data.description || "",
            lastOpenedAt: data.lastOpenedAt || data.last_opened_at || now,
            created_at: data.created_at || data.createdAt || now,
            updated_at: now,
          },
          { merge: true },
        );
        const mRef = memberRef(doc.id, userId);
        batch.set(
          mRef,
          {
            workspaceId: doc.id,
            userId,
            role: "admin",
            invitedBy: data.ownerId || userId,
            status: "active",
            joined_at: data.created_at || data.createdAt || now,
            updated_at: now,
          },
          { merge: true },
        );
      });
      await batch.commit();
      // Recurse once to load migrated memberships
      return await listUserWorkspaces(userId);
    }
  }

  const refs = memberships
    .map((m) => m.workspaceId)
    .filter(Boolean)
    .map((id) => db.collection(WORKSPACE_COLLECTION).doc(String(id)));
  const workspaceSnaps = refs.length ? await db.getAll(...refs) : [];
  const workspaceMap = new Map();
  workspaceSnaps.forEach((snap) => {
    const workspace = normalizeWorkspaceDoc(snap);
    if (workspace?.id) workspaceMap.set(workspace.id, workspace);
  });

  return memberships
    .map((m) => {
      const workspace = workspaceMap.get(m.workspaceId);
      if (!workspace) return null;
      return {
        ...workspace,
        role: m.role || "viewer",
        membershipStatus: m.status,
        joined_at: m.joined_at,
        invitedBy: m.invitedBy || null,
      };
    })
    .filter(Boolean);
}

export async function listWorkspaceMembers(workspaceId) {
  if (!workspaceId) return [];
  const snap = await db
    .collection(WORKSPACE_MEMBERS_COLLECTION)
    .where("workspaceId", "==", workspaceId)
    .where("status", "in", ["active", "invited"])
    .limit(500)
    .get();
  const members = snap.docs.map((doc) => normalizeMemberDoc(doc)).filter(Boolean);
  if (!members.length) return [];

  const userRefs = members.map((m) => db.collection("users").doc(String(m.userId)));
  const userSnaps = userRefs.length ? await db.getAll(...userRefs) : [];
  const userMap = new Map();
  userSnaps.forEach((snap) => {
    const data = snap.exists ? snap.data() || {} : {};
    userMap.set(snap.id, {
      email: data.email || null,
      name: data.name || data.displayName || null,
      photoURL: data.avatarUrl || null,
    });
  });

  return members.map((m) => ({
    userId: m.userId,
    workspaceId: m.workspaceId,
    role: m.role,
    status: m.status,
    invitedBy: m.invitedBy,
    joined_at: m.joined_at,
    email: m.email || userMap.get(m.userId)?.email || null,
    name: userMap.get(m.userId)?.name || null,
    photoURL: userMap.get(m.userId)?.photoURL || null,
  }));
}

export async function setWorkspaceMemberRole(workspaceId, userId, role, extra = {}) {
  if (!workspaceId || !userId) throw new Error("workspaceId and userId are required");
  if (!isValidWorkspaceRole(role)) throw new Error("Invalid role");
  const now = new Date();
  await memberRef(workspaceId, userId).set(
    {
      workspaceId,
      userId,
      role,
      status: extra.status || "active",
      invitedBy: extra.invitedBy || null,
      email: extra.email || null,
      joined_at: extra.joined_at || extra.joinedAt || now,
      updated_at: now,
    },
    { merge: true },
  );
  await mirrorUserMembership(workspaceId, userId, {
    role,
    status: extra.status || "active",
    invitedBy: extra.invitedBy || null,
    email: extra.email || null,
    joined_at: extra.joined_at || extra.joinedAt || now,
  });
  const snap = await memberRef(workspaceId, userId).get();
  return normalizeMemberDoc(snap);
}

export async function removeWorkspaceMember(workspaceId, userId) {
  if (!workspaceId || !userId) throw new Error("workspaceId and userId are required");
  const now = new Date();
  await memberRef(workspaceId, userId).set(
    {
      workspaceId,
      userId,
      status: "removed",
      updated_at: now,
    },
    { merge: true },
  );
  await mirrorUserMembership(workspaceId, userId, {
    status: "removed",
    role: "viewer",
    joined_at: now,
  });
  await recomputeSeatsUsed(workspaceId, { excludeViewers: true });
  return true;
}

export async function createWorkspaceInvite({
  workspaceId,
  email,
  role = "editor",
  invitedBy,
  expiresInDays = 7,
}) {
  if (!workspaceId) throw new Error("workspaceId is required");
  if (!email) throw new Error("email is required");
  const normalizedRole = String(role || "").toLowerCase();
  if (!isValidWorkspaceRole(normalizedRole)) throw new Error("Invalid role");
  const emailLower = String(email).trim().toLowerCase();

  // De-dupe pending invites
  const existingSnap = await db
    .collection(WORKSPACE_INVITES_COLLECTION)
    .where("workspaceId", "==", workspaceId)
    .where("emailLower", "==", emailLower)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    const invite = normalizeInviteDoc(existingSnap.docs[0]);
    return { ...invite, duplicate: true };
  }

  const token = generateInviteToken();
  const hashedToken = hashToken(token);
  const now = new Date();
  const expires_at = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  const ref = db.collection(WORKSPACE_INVITES_COLLECTION).doc();
  await ref.set({
    workspaceId,
    email: emailLower,
    emailLower,
    role: normalizedRole,
    token,
    hashedToken,
    invitedBy: invitedBy || null,
    invitedByUid: invitedBy || null,
    expires_at,
    status: "pending",
    created_at: now,
    emailStatus: "pending",
  });
  return {
    id: ref.id,
    workspaceId,
    email: emailLower,
    emailLower,
    role: normalizedRole,
    token,
    hashedToken,
    invitedBy: invitedBy || null,
    expires_at,
    status: "pending",
    created_at: now,
    emailStatus: "pending",
  };
}

export async function getInviteByToken(token) {
  if (!token) return null;
  const hashedToken = hashToken(token);
  const collection = db.collection(WORKSPACE_INVITES_COLLECTION);
  let snap = hashedToken
    ? await collection.where("hashedToken", "==", hashedToken).limit(1).get()
    : null;
  if (!snap || snap.empty) {
    snap = await collection.where("token", "==", token).limit(1).get();
  }
  if (!snap || snap.empty) return null;
  const doc = snap.docs[0];
  const invite = normalizeInviteDoc(doc);
  if (!invite) return null;
  const expired = invite.expires_at && invite.expires_at.getTime() < Date.now();
  if (expired && invite.status === "pending") {
    await doc.ref.set({ status: "expired", updated_at: new Date() }, { merge: true });
    invite.status = "expired";
  }
  return invite;
}

export async function listWorkspaceInvites(workspaceId, statuses = ["pending"]) {
  if (!workspaceId) return [];
  const statusList = Array.isArray(statuses) && statuses.length ? statuses : ["pending"];
  const snap = await db
    .collection(WORKSPACE_INVITES_COLLECTION)
    .where("workspaceId", "==", workspaceId)
    .where("status", "in", statusList)
    .limit(200)
    .get();

  const invites = [];
  for (const doc of snap.docs) {
    const invite = normalizeInviteDoc(doc);
    if (!invite) continue;
    const expired = invite.expires_at && invite.expires_at.getTime() < Date.now();
    if (expired && invite.status === "pending") {
      await doc.ref.set({ status: "expired", updated_at: new Date() }, { merge: true });
      invite.status = "expired";
    }
    invites.push(invite);
  }
  return invites;
}

export async function acceptInviteToken(token, user) {
  if (!token) throw new Error("token is required");
  if (!user?.uid) throw new Error("user is required");

  const invite = await getInviteByToken(token);
  if (!invite) throw new Error("Invite not found");
  if (invite.status === "revoked" || invite.status === "expired") throw new Error("Invite is no longer valid");
  if (invite.status === "accepted") throw new Error("Invite already accepted");
  if (invite.expires_at && invite.expires_at.getTime() < Date.now()) {
    await db.collection(WORKSPACE_INVITES_COLLECTION).doc(invite.id).set(
      { status: "expired", updated_at: new Date() },
      { merge: true },
    );
    throw new Error("Invite expired");
  }
  const workspace = await getWorkspace(invite.workspaceId);
  if (!workspace) throw new Error("Workspace not found");

  // Enforce email match when available to avoid token leakage
  const inviteEmail = String(invite.emailLower || invite.email || "").trim().toLowerCase();
  const userEmail = String(user.email || "").trim().toLowerCase();
  if (inviteEmail && userEmail && inviteEmail !== userEmail) {
    throw new Error("Invite is addressed to a different email");
  }

  const existing = await getWorkspaceMembership(invite.workspaceId, user.uid);
  const roleToApply = existing?.status === "active" && existing.role ? existing.role : invite.role || "editor";
  const billableRole = roleToApply !== "viewer";
  if (billableRole) {
    const seatsCap =
      typeof workspace.seats === "number" && workspace.seats > 0
        ? workspace.seats
        : workspace.plan !== "free"
          ? Math.max(3, Number(workspace.seats) || 3)
          : null;
    if (seatsCap) {
      const currentSeats = await countBillableMembers(invite.workspaceId, { excludeViewers: true });
      if (currentSeats >= seatsCap) {
        throw new Error("No seats available in this workspace");
      }
    }
  }

  const now = new Date();

  await setWorkspaceMemberRole(invite.workspaceId, user.uid, roleToApply, {
    invitedBy: invite.invitedByUid || invite.invitedBy || user.uid,
    email: invite.emailLower || invite.email || userEmail || null,
    joined_at: existing?.joined_at || now,
    status: "active",
  });

  await recomputeSeatsUsed(invite.workspaceId, { excludeViewers: true });

  await db.collection(WORKSPACE_INVITES_COLLECTION).doc(invite.id).set(
    {
      status: "accepted",
      accepted_at: now,
      acceptedBy: user.uid,
      acceptedByUid: user.uid,
      email: invite.emailLower || invite.email || userEmail || null,
      updated_at: now,
    },
    { merge: true },
  );
  try {
    console.info("[WorkspaceInvite] accepted", {
      workspaceId: invite.workspaceId,
      token: `${String(token).slice(0, 6)}…`,
      userId: user.uid,
    });
  } catch {}

  return {
    workspace,
    role: roleToApply,
  };
}

export async function revokeInviteToken(token, revokedBy) {
  if (!token) throw new Error("token is required");
  const invite = await getInviteByToken(token);
  if (!invite) throw new Error("Invite not found");
  const now = new Date();
  await db.collection(WORKSPACE_INVITES_COLLECTION).doc(invite.id).set(
    {
      status: "revoked",
      revoked_at: now,
      revokedBy: revokedBy || null,
      updated_at: now,
    },
    { merge: true },
  );
  return { ...invite, status: "revoked", revoked_at: now, revokedBy: revokedBy || null };
}

export async function updateInviteEmailStatus(inviteId, status, error = null, providerStatus = null) {
  if (!inviteId) return null;
  await db.collection(WORKSPACE_INVITES_COLLECTION).doc(String(inviteId)).set(
    {
      emailStatus: status || null,
      emailError: error || null,
      emailProviderStatus: providerStatus || null,
      updated_at: new Date(),
      lastAttemptAt: new Date(),
    },
    { merge: true },
  );
}
