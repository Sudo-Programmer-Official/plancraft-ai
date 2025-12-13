import crypto from "crypto";
import admin from "firebase-admin";
import { db } from "./firebaseAdmin.js";

export const WORKSPACE_COLLECTION = "workspaces";
export const WORKSPACE_MEMBERS_COLLECTION = "workspace_members";
export const WORKSPACE_INVITES_COLLECTION = "workspace_invites";

export const WORKSPACE_ROLES = ["viewer", "editor", "admin"];

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value.toDate();
  if (typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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

function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

function memberRef(workspaceId, userId) {
  const key = `${workspaceId}_${userId}`;
  return db.collection(WORKSPACE_MEMBERS_COLLECTION).doc(key);
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
}) {
  if (!ownerId) throw new Error("ownerId is required to create a workspace");
  const now = new Date();
  const ref = await db.collection(WORKSPACE_COLLECTION).add({
    name: (name || "New workspace").trim(),
    icon: icon || "📦",
    theme: theme || "indigo",
    ownerId,
    timezone: timezone || "UTC",
    workspaceType: workspaceType || "team",
    description: description || "",
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
    lastOpenedAt: now,
    created_at: now,
    updated_at: now,
  };

  await memberRef(ref.id, ownerId).set(
    {
      workspaceId: ref.id,
      userId: ownerId,
      role: "admin",
      invitedBy: ownerId,
      status: "active",
      joined_at: now,
      updated_at: now,
    },
    { merge: true },
  );

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
    "lastOpenedAt",
    "last_opened_at",
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
  const token = generateInviteToken();
  const now = new Date();
  const expires_at = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  const ref = db.collection(WORKSPACE_INVITES_COLLECTION).doc();
  await ref.set({
    workspaceId,
    email: String(email).trim().toLowerCase(),
    role: normalizedRole,
    token,
    invitedBy: invitedBy || null,
    expires_at,
    status: "pending",
    created_at: now,
  });
  return {
    id: ref.id,
    workspaceId,
    email: String(email).trim().toLowerCase(),
    role: normalizedRole,
    token,
    invitedBy: invitedBy || null,
    expires_at,
    status: "pending",
    created_at: now,
  };
}

export async function getInviteByToken(token) {
  if (!token) return null;
  const snap = await db
    .collection(WORKSPACE_INVITES_COLLECTION)
    .where("token", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data() || {};
  return {
    id: doc.id,
    workspaceId: data.workspaceId || null,
    email: data.email || null,
    role: data.role || "viewer",
    token: data.token || null,
    invitedBy: data.invitedBy || null,
    expires_at: normalizeDate(data.expires_at),
    status: data.status || "pending",
    created_at: normalizeDate(data.created_at),
    accepted_at: normalizeDate(data.accepted_at),
    acceptedBy: data.acceptedBy || null,
    revoked_at: normalizeDate(data.revoked_at),
  };
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
  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      workspaceId: data.workspaceId || null,
      email: data.email || null,
      role: data.role || "viewer",
      token: data.token || null,
      invitedBy: data.invitedBy || null,
      expires_at: normalizeDate(data.expires_at),
      status: data.status || "pending",
      created_at: normalizeDate(data.created_at),
      accepted_at: normalizeDate(data.accepted_at),
      acceptedBy: data.acceptedBy || null,
    };
  });
}

export async function acceptInviteToken(token, user) {
  if (!token) throw new Error("token is required");
  if (!user?.uid) throw new Error("user is required");

  const invite = await getInviteByToken(token);
  if (!invite) throw new Error("Invite not found");
  if (invite.status === "revoked" || invite.status === "expired") throw new Error("Invite is no longer valid");
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
  const inviteEmail = String(invite.email || "").trim().toLowerCase();
  const userEmail = String(user.email || "").trim().toLowerCase();
  if (inviteEmail && userEmail && inviteEmail !== userEmail) {
    throw new Error("Invite is addressed to a different email");
  }

  const now = new Date();
  const existing = await getWorkspaceMembership(invite.workspaceId, user.uid);
  const roleToApply = existing?.status === "active" && existing.role ? existing.role : invite.role || "editor";

  await setWorkspaceMemberRole(invite.workspaceId, user.uid, roleToApply, {
    invitedBy: invite.invitedBy || user.uid,
    email: invite.email || userEmail || null,
    joined_at: existing?.joined_at || now,
    status: "active",
  });

  await db.collection(WORKSPACE_INVITES_COLLECTION).doc(invite.id).set(
    {
      status: "accepted",
      accepted_at: now,
      acceptedBy: user.uid,
      updated_at: now,
    },
    { merge: true },
  );

  return {
    workspace,
    role: roleToApply,
  };
}
