import { assessChangeImpact } from "../services/knowledge/changeImpactService.js";

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

export async function changeImpactHandler(req, res) {
  try {
    const workspaceId = selectWorkspaceId(req);
    const { source, changeSummary, maxHops, maxItems } = req.body || {};
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    if (!source || !source.id) return res.status(400).json({ error: "source {id,type} is required" });

    const result = await assessChangeImpact({
      workspaceId,
      source,
      changeSummary,
      maxHops,
      maxItems,
    });
    return res.json(result);
  } catch (err) {
    const message = err?.message || "Failed to assess change impact";
    const status = /not found/i.test(message) ? 404 : 500;
    return res.status(status).json({ error: message });
  }
}
