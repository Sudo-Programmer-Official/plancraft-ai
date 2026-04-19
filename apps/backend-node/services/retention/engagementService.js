import dayjs from "../../utils/dayjs.js";
import { db } from "../firebaseAdmin.js";
import {
  WORKSPACE_MEMBERS_COLLECTION,
  WORKSPACE_COLLECTION,
} from "../workspaceService.js";
import { coerceDate, toIso } from "./defaults.js";

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mostRecent(...dates) {
  const parsed = dates
    .map((d) => coerceDate(d))
    .filter((d) => d && !Number.isNaN(d.getTime()));
  if (!parsed.length) return null;
  return new Date(Math.max(...parsed.map((d) => d.getTime())));
}

async function fetchUserWorkspaces(userId) {
  const ids = new Set();
  if (!userId) return [];
  try {
    const snap = await db
      .collection(WORKSPACE_MEMBERS_COLLECTION)
      .where("userId", "==", userId)
      .limit(50)
      .get();
    snap.forEach((doc) => {
      const data = doc.data() || {};
      if (data.workspaceId) ids.add(String(data.workspaceId));
    });
  } catch (err) {
    console.warn("[Retention] workspace membership lookup failed", err?.message || err);
  }
  return Array.from(ids);
}

async function fetchTaskMetrics({ userId = null, workspaceId = null, limit = 50 } = {}) {
  const metrics = {
    total: 0,
    completed: 0,
    lastCreatedAt: null,
    lastCompletedAt: null,
    lastActivityAt: null,
  };
  if (!userId && !workspaceId) return metrics;

  try {
    let ref = db.collection("tasks");
    if (userId) ref = ref.where("userId", "==", userId);
    if (workspaceId) ref = ref.where("workspaceId", "==", workspaceId);
    try {
      ref = ref.orderBy("createdAt", "desc");
    } catch {
      // ok to skip ordering if index missing
    }
    const snap = await ref.limit(limit).get();
    snap.forEach((doc) => {
      const data = doc.data() || {};
      metrics.total += 1;
      const created = coerceDate(data.createdAt || data.created_at || data.date);
      const updated = coerceDate(data.updatedAt || data.updated_at);
      const completedAt = coerceDate(data.completedAt || data.completed_at);
      const completedFlag =
        data.completed === true ||
        (typeof data.status === "string" && data.status.toLowerCase() === "done");
      if (completedFlag) metrics.completed += 1;

      if (created && (!metrics.lastCreatedAt || created > metrics.lastCreatedAt)) {
        metrics.lastCreatedAt = created;
      }
      if (completedAt && (!metrics.lastCompletedAt || completedAt > metrics.lastCompletedAt)) {
        metrics.lastCompletedAt = completedAt;
      }
      const activity = mostRecent(created, updated, completedAt);
      if (activity && (!metrics.lastActivityAt || activity > metrics.lastActivityAt)) {
        metrics.lastActivityAt = activity;
      }
    });
  } catch (err) {
    console.warn("[Retention] task metrics lookup failed", err?.message || err);
  }
  return metrics;
}

export async function computeUserEngagementState(userId) {
  if (!userId) return null;
  const ref = db.collection("users").doc(String(userId));
  const snap = await ref.get();
  const profile = snap.exists ? snap.data() || {} : {};

  const workspaceIds = await fetchUserWorkspaces(userId);
  const taskMetrics = await fetchTaskMetrics({ userId });

  const state = {
    userId: String(userId),
    last_login_at: toIso(profile.lastLoginAt || profile.last_login_at),
    signup_at: toIso(profile.createdAt || profile.signup_at),
    timezone: profile.timezone || profile.tz || "UTC",
    plan: profile.plan || "free",
    email_verified: !!(profile.emailVerified || profile.email_verified || profile.emailVerifiedAt),
    workspace_ids: workspaceIds,
    workspace_count: workspaceIds.length,
    tasks_created_count: taskMetrics.total,
    tasks_completed_count: taskMetrics.completed,
    last_task_created_at: toIso(taskMetrics.lastCreatedAt),
    last_task_completed_at: toIso(taskMetrics.lastCompletedAt),
    last_activity_at: toIso(
      mostRecent(
        taskMetrics.lastActivityAt,
        profile.lastActivityAt,
        profile.last_activity_at,
        profile.lastLoginAt
      )
    ),
    updated_at: new Date().toISOString(),
  };

  await db.collection("user_engagement_state").doc(String(userId)).set(state, { merge: true });
  return state;
}

export async function computeWorkspaceEngagementState(workspaceId) {
  if (!workspaceId) return null;
  const ref = db.collection(WORKSPACE_COLLECTION).doc(String(workspaceId));
  const snap = await ref.get();
  const data = snap.exists ? snap.data() || {} : {};

  let collaborators = 0;
  try {
    const memberSnap = await db
      .collection(WORKSPACE_MEMBERS_COLLECTION)
      .where("workspaceId", "==", String(workspaceId))
      .get();
    collaborators = memberSnap.size || 0;
  } catch (err) {
    console.warn("[Retention] workspace member lookup failed", err?.message || err);
  }

  const taskMetrics = await fetchTaskMetrics({ workspaceId });

  const state = {
    workspace_id: String(workspaceId),
    workspace_name: data.name || "Workspace",
    created_at: toIso(data.created_at || data.createdAt),
    last_activity_at: toIso(
      mostRecent(taskMetrics.lastActivityAt, data.updated_at, data.updatedAt)
    ),
    tasks_created_count: taskMetrics.total,
    tasks_completed_count: taskMetrics.completed,
    collaborators_count: collaborators,
    creator_mode_used: !!(data.creatorModeUsed || data.creator_mode_used),
    leader_mode_used: !!(data.leaderModeUsed || data.leader_mode_used),
    repurpose_used: !!data.repurpose_used,
    publish_attempted: !!data.publishAttempted,
    social_connected: safeNumber(data.social_connected || data.socialConnected || 0),
    ai_image_generated: !!data.ai_image_generated,
    updated_at: new Date().toISOString(),
  };

  await db.collection("workspace_engagement_state").doc(String(workspaceId)).set(state, {
    merge: true,
  });
  return state;
}

export async function refreshWorkspaceStatesForUser(workspaceIds = []) {
  const results = [];
  for (const wid of workspaceIds || []) {
    try {
      const state = await computeWorkspaceEngagementState(wid);
      if (state) results.push(state);
    } catch (err) {
      console.warn("[Retention] failed to compute workspace engagement", wid, err?.message || err);
    }
  }
  return results;
}

export async function listCandidateUsers(limit = 50) {
  try {
    let ref = db.collection("users");
    try {
      ref = ref.orderBy("lastLoginAt", "desc");
    } catch {
      // fallback to createdAt or no ordering
      try {
        ref = ref.orderBy("createdAt", "desc");
      } catch {
        /* noop */
      }
    }
    const snap = await ref.limit(limit).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
  } catch (err) {
    console.warn("[Retention] candidate user lookup failed", err?.message || err);
    return [];
  }
}
