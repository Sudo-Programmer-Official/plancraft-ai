import crypto from "crypto";
import { assessChangeImpact } from "./changeImpactService.js";
import { createProposal } from "./approvalService.js";
import { db } from "../firebaseAdmin.js";
import { getWorkspaceMembership } from "../workspaceService.js";

function hashId(input) {
  return crypto.createHash("sha256").update(String(input || "")).digest("hex").slice(0, 24);
}

function ensureMember(workspaceId, userId) {
  return getWorkspaceMembership(workspaceId, userId);
}

function normalizeEventEnvelope(input = {}) {
  const now = new Date();
  return {
    source: input.source || "webhook",
    event: input.event || "unknown",
    eventId: input.eventId || hashId(`${input.source || "evt"}|${input.event || "unknown"}|${now.toISOString()}`),
    occurredAt: input.occurredAt || now.toISOString(),
    workspaceId: input.workspaceId || null,
    payload: input.payload || {},
  };
}

function buildChangeSummary(envelope) {
  const { source, event, payload } = envelope;
  if (source === "jira" && payload?.issueKey) {
    return `${event}: ${payload.issueKey} ${payload.summary || ""}`.trim();
  }
  if (source === "email" && payload?.subject) {
    return `Email: ${payload.subject}`;
  }
  return `${source} ${event}`.trim();
}

function buildSourceForImpact(envelope) {
  // Default to synthetic requirement for external events
  const syntheticId = `req_evt_${hashId(envelope.eventId || envelope.payload?.issueKey || envelope.payload?.subject || "")}`;
  return { type: "requirement", refId: syntheticId };
}

export async function ingestExternalEvent({ envelope, userId }) {
  const normalized = normalizeEventEnvelope(envelope);
  if (!normalized.workspaceId) {
    const err = new Error("workspaceId is required");
    err.status = 400;
    throw err;
  }
  const membership = await ensureMember(normalized.workspaceId, userId);
  if (!membership || membership.status !== "active") {
    const err = new Error("Not a member of this workspace");
    err.status = 403;
    throw err;
  }

  const changeSummary = buildChangeSummary(normalized);
  let impacts = [];
  try {
    const impactResult = await assessChangeImpact({
      workspaceId: normalized.workspaceId,
      source: buildSourceForImpact(normalized),
      changeSummary,
      maxHops: 2,
    });
    impacts = impactResult?.impacts || [];
  } catch (err) {
    // fall through with empty impacts
    impacts = [];
  }

  const proposal = await createProposal({
    workspaceId: normalized.workspaceId,
    source: buildSourceForImpact(normalized),
    impacts,
    note: changeSummary,
    userId,
  });

  // optional: record ingestion log
  try {
    await db.collection("integration_events").add({
      workspaceId: normalized.workspaceId,
      source: normalized.source,
      event: normalized.event,
      eventId: normalized.eventId,
      payload: normalized.payload,
      proposalId: proposal.id,
      createdAt: new Date(),
      createdBy: userId,
    });
  } catch {}

  return { proposalId: proposal.id, status: "pending" };
}
