import { listPolicies, upsertPolicy } from "../services/knowledge/policyService.js";

export async function listPoliciesHandler(req, res) {
  try {
    const workspaceId = req.workspaceId || req.body?.workspaceId || req.query?.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    const policies = await listPolicies(workspaceId, req.user?.uid);
    return res.json({ policies });
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to load policies" });
  }
}

export async function upsertPolicyHandler(req, res) {
  try {
    const workspaceId = req.workspaceId || req.body?.workspaceId || req.query?.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    const result = await upsertPolicy({ workspaceId, userId: req.user?.uid, policy: req.body || {} });
    return res.status(201).json(result);
  } catch (err) {
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to save policy" });
  }
}

