import {
  approveProposal,
  createProposal,
  executeAction,
  getProposal,
  listProposals,
  listActionsForProposal,
} from "../services/knowledge/approvalService.js";

function selectWorkspaceId(req) {
  return (
    req.body?.workspaceId ||
    req.body?.workspace_id ||
    req.params?.workspaceId ||
    req.query?.workspaceId ||
    req.headers?.["x-workspace-id"] ||
    null
  );
}

export async function createProposalHandler(req, res) {
  try {
    const workspaceId = selectWorkspaceId(req);
    const { source, impacts, note } = req.body || {};
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    if (!source?.type || !source?.refId) return res.status(400).json({ error: "source {type, refId} is required" });
    const result = await createProposal({
      workspaceId,
      source,
      impacts,
      note,
      userId: req.user?.uid,
    });
    return res.status(201).json(result);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to create proposal" });
  }
}

export async function listProposalsHandler(req, res) {
  try {
    const workspaceId = selectWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    const status = req.query?.status || null;
    const result = await listProposals(workspaceId, req.user?.uid, status);
    return res.json({ proposals: result });
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to list proposals" });
  }
}

export async function getProposalHandler(req, res) {
  try {
    const { proposalId } = req.params || {};
    if (!proposalId) return res.status(400).json({ error: "proposalId is required" });
    const result = await getProposal(proposalId, req.user?.uid);
    return res.json(result);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to load proposal" });
  }
}

export async function approveProposalHandler(req, res) {
  try {
    const { proposalId } = req.params || {};
    const { approve, note } = req.body || {};
    if (!proposalId) return res.status(400).json({ error: "proposalId is required" });
    const result = await approveProposal({
      proposalId,
      userId: req.user?.uid,
      approve: approve === true,
      note,
    });
    return res.json(result);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to approve proposal" });
  }
}

export async function executeActionHandler(req, res) {
  try {
    const { proposalId, actionId } = req.params || {};
    if (!proposalId || !actionId) return res.status(400).json({ error: "proposalId and actionId required" });
    const result = await executeAction({ proposalId, actionId, userId: req.user?.uid });
    return res.json(result);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to execute action" });
  }
}

export async function listActionsHandler(req, res) {
  try {
    const { proposalId } = req.params || {};
    if (!proposalId) return res.status(400).json({ error: "proposalId is required" });
    const actions = await listActionsForProposal(proposalId, req.user?.uid);
    return res.json({ actions });
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to load actions" });
  }
}
