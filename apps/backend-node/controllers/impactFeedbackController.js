import { db } from "../services/firebaseAdmin.js";

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

export async function impactFeedbackHandler(req, res) {
  try {
    const workspaceId = selectWorkspaceId(req);
    const { source, impacted, confidence, userAction } = req.body || {};
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    if (!source?.type || !source?.refId) return res.status(400).json({ error: "source {type, refId} is required" });
    if (!impacted?.type || !impacted?.refId) return res.status(400).json({ error: "impacted {type, refId} is required" });
    if (userAction !== "relevant" && userAction !== "irrelevant") {
      return res.status(400).json({ error: "userAction must be relevant or irrelevant" });
    }
    const conf = Number(confidence);
    const now = new Date();
    await db.collection("knowledge_impact_feedback").add({
      workspaceId,
      source: { type: source.type, refId: source.refId },
      impacted: { type: impacted.type, refId: impacted.refId },
      confidence: Number.isFinite(conf) ? conf : null,
      userAction,
      createdBy: req.user?.uid || null,
      createdAt: now,
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[ImpactFeedback] failed", err?.message || err);
    return res.status(500).json({ error: "Failed to record feedback" });
  }
}
