import { canUseFeature } from "../services/entitlements.js";
import { extractWorkspaceId } from "./workspace.js";
import { getWorkspace, getWorkspaceMembership } from "../services/workspaceService.js";
import { attachAuth } from "./auth.js";

export function requireFeature(featureKey) {
  return async function featureMiddleware(req, res, next) {
    try {
      if (!req.user) {
        await attachAuth(req, res, () => {});
      }
      if (!req.user?.uid) return res.status(401).json({ error: "Unauthorized" });

      const workspaceId = extractWorkspaceId(req);
      if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });

      const workspace = req.workspace || (await getWorkspace(workspaceId));
      if (!workspace) return res.status(404).json({ error: "Workspace not found" });
      req.workspace = workspace;

      const membership = req.workspaceMembership || (await getWorkspaceMembership(workspaceId, req.user.uid));
      if (!membership || membership.status !== "active") {
        return res.status(403).json({ error: "Not a member of this workspace" });
      }

      const allowed = canUseFeature({ workspace, userRole: membership.role }, featureKey);
      if (!allowed) {
        return res.status(403).json({ error: "Feature not available for this workspace plan" });
      }
      return next();
    } catch (err) {
      console.error("[FeatureMiddleware] failed", err?.message || err);
      return res.status(500).json({ error: "Feature enforcement failed" });
    }
  };
}
