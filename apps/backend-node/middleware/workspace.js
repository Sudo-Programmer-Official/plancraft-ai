import { attachAuth } from "./auth.js";
import {
  getWorkspace,
  getWorkspaceMembership,
  isValidWorkspaceRole,
} from "../services/workspaceService.js";

export function extractWorkspaceId(req) {
  const paramsId = req.params?.workspaceId || req.params?.workspace_id;
  const headerId = req.headers?.["x-workspace-id"];
  const queryId = req.query?.workspaceId || req.query?.workspace_id;
  const bodyId = req.body?.workspaceId || req.body?.workspace_id;
  return paramsId || headerId || bodyId || queryId || null;
}

export function requireWorkspaceId(req, res, next) {
  const workspaceId = extractWorkspaceId(req);
  if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
  req.workspaceId = workspaceId;
  return next();
}

export function requireWorkspaceRole(allowedRoles = ["viewer", "editor", "admin", "owner"], options = {}) {
  const allowed = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => String(r || "").toLowerCase())
    : [];

  return async function workspaceRoleMiddleware(req, res, next) {
    try {
      if (!req.user) {
        await attachAuth(req, res, () => {});
      }
      if (!req.user?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const workspaceId = options?.workspaceIdSelector
        ? options.workspaceIdSelector(req)
        : extractWorkspaceId(req);
      if (!workspaceId) {
        return res.status(400).json({ error: "workspaceId is required" });
      }
      req.workspaceId = workspaceId;

      const workspace = options?.skipWorkspaceLoad ? null : await getWorkspace(workspaceId);
      if (!workspace && !options?.skipWorkspaceLoad) {
        return res.status(404).json({ error: "Workspace not found" });
      }
      if (workspace) req.workspace = workspace;

      const membership = await getWorkspaceMembership(workspaceId, req.user.uid);
      if (!membership || membership.status !== "active") {
        return res.status(403).json({ error: "Not a member of this workspace" });
      }
      const role = String(membership.role || "").toLowerCase();
      if (allowed.length && !allowed.includes(role)) {
        return res.status(403).json({ error: "Insufficient workspace role" });
      }
      if (!isValidWorkspaceRole(role)) {
        return res.status(403).json({ error: "Invalid workspace role" });
      }
      req.workspaceRole = role;
      req.workspaceMembership = membership;
      return next();
    } catch (err) {
      console.error("[WorkspaceMiddleware] enforcement failed", err?.message || err);
      return res.status(500).json({ error: "Workspace authorization failed" });
    }
  };
}

function modeEnabled(workspace, modeKey) {
  const settings = workspace?.settings || {};
  if (modeKey === "creator") return !!settings.creatorModeEnabled;
  if (modeKey === "leader") return !!settings.leaderModeEnabled;
  return false;
}

function requireWorkspaceMode(modeKey) {
  return async function modeMiddleware(req, res, next) {
    try {
      if (!req.user) {
        await attachAuth(req, res, () => {});
      }
      if (!req.user?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const workspaceId = extractWorkspaceId(req);
      if (!workspaceId) {
        return res.status(400).json({ error: "workspaceId is required" });
      }
      req.workspaceId = workspaceId;

      const workspace = req.workspace || (await getWorkspace(workspaceId));
      if (!workspace) return res.status(404).json({ error: "Workspace not found" });
      req.workspace = workspace;

      const membership = req.workspaceMembership || (await getWorkspaceMembership(workspaceId, req.user.uid));
      if (!membership || membership.status !== "active") {
        return res.status(403).json({ error: "Not a member of this workspace" });
      }
      req.workspaceMembership = membership;
      req.workspaceRole = membership.role;

      if (!modeEnabled(workspace, modeKey)) {
        return res.status(403).json({ error: `${modeKey} mode is disabled for this workspace` });
      }
      return next();
    } catch (err) {
      console.error("[WorkspaceMiddleware] mode enforcement failed", err?.message || err);
      return res.status(500).json({ error: "Workspace mode enforcement failed" });
    }
  };
}

export function requireCreatorMode(req, res, next) {
  return requireWorkspaceMode("creator")(req, res, next);
}

export function requireLeaderMode(req, res, next) {
  return requireWorkspaceMode("leader")(req, res, next);
}
