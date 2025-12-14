import crypto from "crypto";
import { db } from "../firebaseAdmin.js";
import { getWorkspaceMembership } from "../workspaceService.js";
import { createTask } from "../taskService.js";
import { evaluatePolicies } from "./policyService.js";

const PROPOSALS = "impact_proposals";
const APPROVALS = "proposal_approvals";
const ACTIONS = "approval_actions";
const AUDIT = "audit_log";

const ALLOWED_ACTION_TYPES = ["create_task", "update_task", "mark_review"];
const ALLOWED_UPDATE_FIELDS = ["title", "details", "date", "link", "priority", "metadata"];
const MAX_ACTIONS_PER_PROPOSAL = Number(process.env.MAX_ACTIONS_PER_PROPOSAL || 50);
const EXECUTE_LIMIT_WINDOW_MS = Number(process.env.EXECUTE_LIMIT_WINDOW_MS || 10000);
const EXECUTE_LIMIT_COUNT = Number(process.env.EXECUTE_LIMIT_COUNT || 5);

const executeRateMap = new Map(); // key -> timestamps

function now() {
  return new Date();
}

async function ensureWorkspaceMember(workspaceId, userId, allowedRoles = null) {
  const membership = await getWorkspaceMembership(workspaceId, userId);
  if (!membership || membership.status !== "active") {
    const err = new Error("Not a member of this workspace");
    err.status = 403;
    throw err;
  }
  if (Array.isArray(allowedRoles) && allowedRoles.length) {
    const role = String(membership.role || "").toLowerCase();
    if (!allowedRoles.includes(role)) {
      const err = new Error("Insufficient role for this action");
      err.status = 403;
      throw err;
    }
  }
  return membership;
}

function hashActionKey(input) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function buildActionKey(proposalId, impact, actionType) {
  const ref = impact?.refId || impact?.nodeId || "";
  const type = impact?.nodeType || "";
  return hashActionKey(`${proposalId}|${type}|${ref}|${actionType}`);
}

function allowedUpdatePatch(patch = {}) {
  const safe = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (patch[key] !== undefined) safe[key] = patch[key];
  }
  return safe;
}

function checkExecuteRateLimit(workspaceId, userId) {
  const key = `${workspaceId}:${userId}`;
  const nowMs = Date.now();
  const windowStart = nowMs - EXECUTE_LIMIT_WINDOW_MS;
  const entries = (executeRateMap.get(key) || []).filter((ts) => ts >= windowStart);
  if (entries.length >= EXECUTE_LIMIT_COUNT) {
    const err = new Error("Execution rate limit exceeded");
    err.status = 429;
    throw err;
  }
  entries.push(nowMs);
  executeRateMap.set(key, entries);
}

export async function createProposal({ workspaceId, source, impacts, note, userId }) {
  await ensureWorkspaceMember(workspaceId, userId, ["admin", "editor"]);
  const nowTs = now();
  const ref = db.collection(PROPOSALS).doc();

  let policyEval = { decision: null, policyFlags: { requiresTwoApprovals: false, requiresAdminApproval: false }, appliedPolicyIds: [] };
  try {
    policyEval = await evaluatePolicies({ workspaceId, source, impacts, note });
  } catch (err) {
    // Policy evaluation failures should not block creation
    policyEval = { decision: null, policyFlags: { requiresTwoApprovals: false, requiresAdminApproval: false }, appliedPolicyIds: [] };
  }

  let status = "pending";
  if (policyEval.decision === "auto_reject") status = "rejected";
  if (policyEval.decision === "auto_approve") status = "approved";

  const payload = {
    workspaceId,
    source: { type: source?.type, refId: source?.refId },
    impacts: Array.isArray(impacts) ? impacts : [],
    status,
    note: note || null,
    createdBy: userId,
    createdAt: nowTs,
    updatedAt: nowTs,
    policyFlags: policyEval.policyFlags || { requiresTwoApprovals: false, requiresAdminApproval: false },
    policyDecision: policyEval.decision || null,
    policyAppliedIds: policyEval.appliedPolicyIds || [],
  };

  await ref.set(payload);

  await db.collection(AUDIT).add({
    workspaceId,
    actorId: userId,
    eventType: "proposal_created",
    ref: { proposalId: ref.id },
    meta: { policyDecision: payload.policyDecision, policyFlags: payload.policyFlags, policies: payload.policyAppliedIds },
    createdAt: now(),
  });

  if (payload.policyDecision === "auto_reject") {
    await db.collection(AUDIT).add({
      workspaceId,
      actorId: userId,
      eventType: "proposal_policy_auto_reject",
      ref: { proposalId: ref.id },
      meta: { policies: payload.policyAppliedIds },
      createdAt: now(),
    });
  }

  if (payload.policyDecision === "auto_approve") {
    await db.collection(AUDIT).add({
      workspaceId,
      actorId: userId,
      eventType: "proposal_policy_auto_approve",
      ref: { proposalId: ref.id },
      meta: { policies: payload.policyAppliedIds },
      createdAt: now(),
    });
    // auto-approval still only prepares actions; execution is manual
    await upsertActionsForProposal({ id: ref.id, ...payload }, userId);
  }

  return { id: ref.id, ...payload };
}

export async function listProposals(workspaceId, userId, status) {
  await ensureWorkspaceMember(workspaceId, userId);
  let q = db.collection(PROPOSALS).where("workspaceId", "==", workspaceId);
  if (status) q = q.where("status", "==", status);
  const snap = await q.orderBy("createdAt", "desc").limit(50).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
}

export async function getProposal(proposalId, userId) {
  const snap = await db.collection(PROPOSALS).doc(proposalId).get();
  if (!snap.exists) throw new Error("Proposal not found");
  const data = snap.data() || {};
  await ensureWorkspaceMember(data.workspaceId, userId);
  return { id: snap.id, ...data };
}

function mapActionFromImpact(proposalId, impact) {
  const proposals = Array.isArray(impact?.proposals) ? impact.proposals : ["review"];
  const actions = [];
  for (const p of proposals) {
    const normalized = String(p || "").toLowerCase();
    if (normalized === "create") {
      actions.push({ type: "create_task" });
    } else if (normalized === "update") {
      actions.push({ type: "update_task" });
    } else {
      actions.push({ type: "mark_review" });
    }
  }
  const deduped = Array.from(new Set(actions.map((a) => a.type))).map((type) => ({ type }));
  return deduped.map((act) => ({
    workspaceId: impact.workspaceId, // may be undefined, will be set later
    proposalId,
    actionType: act.type,
    actionKey: buildActionKey(proposalId, impact, act.type),
    target: { type: impact.nodeType, refId: impact.refId || impact.nodeId },
    payload: buildActionPayload(act.type, impact),
    status: "ready",
    createdAt: now(),
    updatedAt: now(),
  }));
}

function buildActionPayload(type, impact) {
  const reason = impact?.reason || null;
  if (type === "create_task") {
    return {
      title: impact?.title || `Follow-up: ${impact?.refId || impact?.nodeId || "item"}`,
      details: reason || null,
      sourceRefs: impact?.sourceRefs || [],
    };
  }
  if (type === "update_task") {
    return {
      taskId: impact?.refId || impact?.nodeId || null,
      patch: allowedUpdatePatch({ details: reason }),
    };
  }
  if (type === "mark_review") {
    return {
      targetType: impact?.nodeType || null,
      refId: impact?.refId || impact?.nodeId || null,
      note: reason || null,
    };
  }
  return {};
}

async function upsertActionsForProposal(proposal, userId) {
  const workspaceId = proposal.workspaceId;
  const impacts = Array.isArray(proposal.impacts) ? proposal.impacts : [];
  const actions = impacts.flatMap((impact) => mapActionFromImpact(proposal.id, impact));
  if (actions.length > MAX_ACTIONS_PER_PROPOSAL) {
    const err = new Error(`Action cap exceeded (${actions.length} > ${MAX_ACTIONS_PER_PROPOSAL})`);
    err.status = 400;
    throw err;
  }
  const existingSnap = await db
    .collection(ACTIONS)
    .where("proposalId", "==", proposal.id)
    .get();
  const existingKeys = new Set(
    existingSnap.docs.map((d) => {
      const data = d.data() || {};
      return data.actionKey;
    }),
  );

  const batch = db.batch();
  actions.forEach((action) => {
    if (!ALLOWED_ACTION_TYPES.includes(action.actionType)) return;
    if (existingKeys.has(action.actionKey)) return;
    const ref = db.collection(ACTIONS).doc(action.actionKey);
    batch.set(ref, {
      ...action,
      workspaceId,
      status: "ready",
      createdBy: userId,
    });
  });
  await batch.commit();
  return actions.length;
}

export async function approveProposal({ proposalId, userId, approve, note }) {
  const proposalRef = db.collection(PROPOSALS).doc(proposalId);
  const approvalRef = db.collection(APPROVALS).doc();

  let finalStatus = null;
  let waitingForSecond = false;
  let proposalData = null;

  const nowTs = now();

  await db.runTransaction(async (tx) => {
    const proposalSnap = await tx.get(proposalRef);
    if (!proposalSnap.exists) throw new Error("Proposal not found");
    const proposal = proposalSnap.data() || {};
    proposalData = { id: proposalId, ...proposal };

    const requiresAdmin = proposal.policyFlags?.requiresAdminApproval === true;
    const allowedRoles = requiresAdmin ? ["admin"] : ["admin", "editor"];
    await ensureWorkspaceMember(proposal.workspaceId, userId, allowedRoles);

    if (proposal.status !== "pending") {
      const err = new Error("Proposal already decided");
      err.status = 409;
      throw err;
    }

    // Gather existing approvals for two-approver flows
    const approvalsSnap = await tx.get(
      db.collection(APPROVALS).where("proposalId", "==", proposalId),
    );
    const existingApprovers = new Set(
      approvalsSnap.docs
        .map((d) => (d.data() || {}).approverId)
        .filter(Boolean),
    );

    if (existingApprovers.has(userId)) {
      const err = new Error("Already approved by this user");
      err.status = 409;
      throw err;
    }

    const requiresTwo = proposal.policyFlags?.requiresTwoApprovals === true;

    if (approve) {
      const totalApprovals = existingApprovers.size + 1;
      const meetsThreshold = !requiresTwo || totalApprovals >= 2;

      // Record this approval
      tx.set(approvalRef, {
        workspaceId: proposal.workspaceId,
        proposalId,
        approverId: userId,
        status: "approved",
        approvedAt: nowTs,
        note: note || null,
      });

      if (meetsThreshold) {
        tx.set(
          proposalRef,
          {
            status: "approved",
            updatedAt: nowTs,
          },
          { merge: true },
        );
        finalStatus = "approved";
      } else {
        // Still pending while waiting for second approval
        tx.set(
          proposalRef,
          {
            status: "pending",
            updatedAt: nowTs,
          },
          { merge: true },
        );
        finalStatus = "pending";
        waitingForSecond = true;
      }
    } else {
      // Rejection path
      tx.set(
        proposalRef,
        {
          status: "rejected",
          updatedAt: nowTs,
        },
        { merge: true },
      );

      tx.set(approvalRef, {
        workspaceId: proposal.workspaceId,
        proposalId,
        approverId: userId,
        status: "rejected",
        approvedAt: nowTs,
        note: note || null,
      });
      finalStatus = "rejected";
    }
  });

  // Audit outside transaction
  await db.collection(AUDIT).add({
    workspaceId: proposalData.workspaceId,
    actorId: userId,
    eventType: approve ? "proposal_approved" : "proposal_rejected",
    ref: { proposalId },
    meta: { waitingForSecond },
    createdAt: now(),
  });

  // Only generate actions on final approval
  if (finalStatus === "approved") {
    await upsertActionsForProposal(proposalData, userId);
  }

  return { status: finalStatus, waitingForSecond };
}

export async function listActionsForProposal(proposalId, userId) {
  const proposalSnap = await db.collection(PROPOSALS).doc(proposalId).get();
  if (!proposalSnap.exists) throw new Error("Proposal not found");
  const proposal = proposalSnap.data() || {};
  await ensureWorkspaceMember(proposal.workspaceId, userId);
  const snap = await db
    .collection(ACTIONS)
    .where("proposalId", "==", proposalId)
    .orderBy("createdAt", "asc")
    .limit(100)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
}

async function executeCreateTask(action, userId, workspaceId) {
  const payload = action.payload || {};
  const task = await createTask(userId, {
    title: payload.title || "New Task",
    details: payload.details || "",
    workspaceId,
    metadata: payload.sourceRefs ? { sourceRefs: payload.sourceRefs } : undefined,
    source: "impact_action",
  }, { workspaceId, skipReminder: true, silent: true });
  return { taskId: task.id };
}

async function executeUpdateTask(action, workspaceId) {
  const payload = action.payload || {};
  const taskId = payload.taskId;
  if (!taskId) throw new Error("taskId is required for update_task");
  const patch = allowedUpdatePatch(payload.patch || {});
  if (Object.keys(patch).length === 0) return { taskId };
  const ref = db.collection("tasks").doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Task not found");
  const data = snap.data() || {};
  if (data.workspaceId !== workspaceId) throw new Error("Task not in workspace");
  await ref.set({ ...patch, updatedAt: now() }, { merge: true });
  return { taskId };
}

async function executeMarkReview(action, workspaceId) {
  // No-op beyond audit; returns success
  return {
    targetType: action.payload?.targetType || null,
    refId: action.payload?.refId || null,
  };
}

export async function executeAction({ proposalId, actionId, userId }) {
  const actionRef = db.collection(ACTIONS).doc(actionId);
  const proposalRef = db.collection(PROPOSALS).doc(proposalId);

  // Step 1: lock action by moving ready -> executing
  await db.runTransaction(async (tx) => {
    const [actionSnap, proposalSnap] = await Promise.all([tx.get(actionRef), tx.get(proposalRef)]);
    if (!actionSnap.exists) throw new Error("Action not found");
    if (!proposalSnap.exists) throw new Error("Proposal not found");
    const action = actionSnap.data() || {};
    const proposal = proposalSnap.data() || {};
    await ensureWorkspaceMember(proposal.workspaceId, userId, ["admin", "editor"]);
    if (proposal.status !== "approved") {
      const err = new Error("Proposal not approved");
      err.status = 409;
      throw err;
    }
    if (action.status !== "ready") {
      const err = new Error("Action not ready");
      err.status = 409;
      throw err;
    }
    if (!ALLOWED_ACTION_TYPES.includes(action.actionType)) {
      const err = new Error("Action type not allowed");
      err.status = 400;
      throw err;
    }
    checkExecuteRateLimit(proposal.workspaceId, userId);
    tx.set(
      actionRef,
      {
        status: "executing",
        executedBy: userId,
        updatedAt: now(),
        startedAt: now(),
      },
      { merge: true },
    );
  });

  let result = null;
  let error = null;
  let workspaceId = null;
  let actionType = null;
  let actionPayload = null;
  try {
    const actionSnap = await actionRef.get();
    const action = actionSnap.data() || {};
    const proposalSnap = await proposalRef.get();
    const proposal = proposalSnap.data() || {};
    workspaceId = proposal.workspaceId;
    actionType = action.actionType;
    actionPayload = action.payload;
    if (action.actionType === "create_task") {
      result = await executeCreateTask(action, userId, proposal.workspaceId);
    } else if (action.actionType === "update_task") {
      result = await executeUpdateTask(action, proposal.workspaceId);
    } else if (action.actionType === "mark_review") {
      result = await executeMarkReview(action, proposal.workspaceId);
    } else {
      throw new Error("Unsupported action type");
    }
  } catch (err) {
    error = err;
  }

  // Step 3: finalize status CAS from executing -> executed/failed
  await db.runTransaction(async (tx) => {
    const actionSnap = await tx.get(actionRef);
    if (!actionSnap.exists) throw new Error("Action not found");
    const action = actionSnap.data() || {};
    const proposalSnap = await tx.get(proposalRef);
    if (!proposalSnap.exists) throw new Error("Proposal not found");
    const proposal = proposalSnap.data() || {};
    await ensureWorkspaceMember(proposal.workspaceId, userId, ["admin", "editor"]);
    if (action.status !== "executing") {
      const err = new Error("Action already finalized");
      err.status = 409;
      throw err;
    }
    if (error) {
      tx.set(
        actionRef,
        {
          status: "failed",
          executedAt: now(),
          executedBy: userId,
          error: error?.message || "Action failed",
          updatedAt: now(),
        },
        { merge: true },
      );
      tx.set(db.collection(AUDIT).doc(), {
        workspaceId: proposal.workspaceId,
        actorId: userId,
        eventType: "action_failed",
        ref: { proposalId, actionId },
        meta: { error: error?.message || "Action failed" },
        createdAt: now(),
      });
      throw error;
    } else {
      tx.set(
        actionRef,
        {
          status: "executed",
          executedAt: now(),
          executedBy: userId,
          result,
          updatedAt: now(),
        },
        { merge: true },
      );
      tx.set(db.collection(AUDIT).doc(), {
        workspaceId: proposal.workspaceId,
        actorId: userId,
        eventType: "action_executed",
        ref: { proposalId, actionId },
        meta: result || null,
        createdAt: now(),
      });
    }
  });

  return { status: error ? "failed" : "executed" };
}
