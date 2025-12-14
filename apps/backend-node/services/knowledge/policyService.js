import { db } from "../firebaseAdmin.js";
import { getWorkspaceMembership } from "../workspaceService.js";

const POLICIES = "workspace_policies";

const EFFECT_PRIORITY = {
  auto_reject: 4,
  auto_approve: 3,
  require_two_approvals: 2,
  require_admin: 1,
};

function normalizeMatch(match = {}) {
  return {
    source: match.source || null,
    contains: match.contains || null,
    actionType: match.actionType || null,
    maxActions: typeof match.maxActions === "number" ? match.maxActions : null,
  };
}

function ruleMatches(rule = {}, ctx) {
  const match = normalizeMatch(rule.match || {});
  if (match.source) {
    const src = (ctx.source?.type || ctx.source?.origin || "").toLowerCase();
    if (src !== String(match.source || "").toLowerCase()) return false;
  }
  if (match.contains) {
    const text = `${ctx.note || ""}`.toLowerCase();
    if (!text.includes(String(match.contains || "").toLowerCase())) return false;
  }
  if (match.actionType) {
    if (!ctx.predictedActionTypes.has(match.actionType)) return false;
  }
  if (typeof match.maxActions === "number") {
    if (ctx.predictedActionCount > match.maxActions) {
      // match if actions exceed threshold
    } else {
      return false;
    }
  }
  return true;
}

export async function listPolicies(workspaceId, userId) {
  const membership = await getWorkspaceMembership(workspaceId, userId);
  if (!membership || membership.status !== "active") {
    const err = new Error("Not a member of this workspace");
    err.status = 403;
    throw err;
  }
  const snap = await db
    .collection(POLICIES)
    .where("workspaceId", "==", workspaceId)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
}

export async function upsertPolicy({ workspaceId, userId, policy }) {
  const membership = await getWorkspaceMembership(workspaceId, userId);
  const role = String(membership?.role || "").toLowerCase();
  if (!membership || membership.status !== "active" || !["admin", "owner"].includes(role)) {
    const err = new Error("Insufficient role for policy change");
    err.status = 403;
    throw err;
  }
  const now = new Date();
  const ref = policy?.id
    ? db.collection(POLICIES).doc(policy.id)
    : db.collection(POLICIES).doc();
  const payload = {
    workspaceId,
    name: policy?.name || "Policy",
    rules: Array.isArray(policy?.rules) ? policy.rules : [],
    enabled: policy?.enabled !== false,
    updatedAt: now,
    createdAt: policy?.id ? policy?.createdAt || now : now,
    createdBy: policy?.createdBy || userId,
  };
  await ref.set(payload, { merge: true });
  return { id: ref.id, ...payload };
}

export async function evaluatePolicies({ workspaceId, source, impacts, note }) {
  const policiesSnap = await db
    .collection(POLICIES)
    .where("workspaceId", "==", workspaceId)
    .where("enabled", "==", true)
    .limit(10)
    .get();

  const predictedActionTypes = new Set();
  let predictedActionCount = 0;
  (impacts || []).forEach((impact) => {
    const proposals = Array.isArray(impact?.proposals) ? impact.proposals : ["review"];
    const types = new Set();
    proposals.forEach((p) => {
      const normalized = String(p || "").toLowerCase();
      if (normalized === "create") types.add("create_task");
      else if (normalized === "update") types.add("update_task");
      else types.add("mark_review");
    });
    types.forEach((t) => predictedActionTypes.add(t));
    predictedActionCount += types.size;
  });

  let decision = null; // auto_reject | auto_approve
  const policyFlags = {
    requiresTwoApprovals: false,
    requiresAdminApproval: false,
  };
  const appliedPolicyIds = [];

  const ctx = { source, impacts, note, predictedActionTypes, predictedActionCount };

  policiesSnap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const rules = Array.isArray(data.rules) ? data.rules : [];
    rules.forEach((rule) => {
      if (!rule?.effect) return;
      if (!ruleMatches(rule, ctx)) return;
      appliedPolicyIds.push(doc.id);
      const effect = String(rule.effect || "").toLowerCase();
      if (effect === "require_two_approvals") policyFlags.requiresTwoApprovals = true;
      if (effect === "require_admin") policyFlags.requiresAdminApproval = true;
      const currentPriority = EFFECT_PRIORITY[decision] || 0;
      const nextPriority = EFFECT_PRIORITY[effect] || 0;
      if (nextPriority > currentPriority) {
        if (effect === "auto_reject") decision = "auto_reject";
        else if (effect === "auto_approve") decision = "auto_approve";
      }
    });
  });

  // If auto decision chosen, drop flags to avoid conflict
  if (decision === "auto_reject" || decision === "auto_approve") {
    policyFlags.requiresTwoApprovals = false;
    policyFlags.requiresAdminApproval = false;
  }

  return { decision, policyFlags, appliedPolicyIds, predictedActionCount, predictedActionTypes: Array.from(predictedActionTypes) };
}
