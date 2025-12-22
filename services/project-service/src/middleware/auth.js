import { attachAuth } from "../services/auth.js";
import { getWorkspaceMembership } from "../services/workspace.js";

const allowHeaderRoleFallback = process.env.ALLOW_HEADER_ROLE_OVERRIDE !== "0";
const requireWorkspaceHeader = process.env.REQUIRE_WORKSPACE_HEADER === "1";
const platformAdmins = (process.env.PLATFORM_ADMIN_IDS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

function parseHeaderRoles(req) {
  return (req.headers["x-roles"] || "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.toLowerCase());
}

function isPlatformAdmin(req) {
  if (!platformAdmins.length) return false;
  const id = req.user?.id || req.user?.uid;
  return !!id && platformAdmins.includes(String(id));
}

async function resolveMembership(req) {
  if (req._membershipResolved) return req.workspaceMembership || null;
  req._membershipResolved = true;
  if (!req.workspaceId || !req.user?.id) return null;
  req.workspaceMembership = await getWorkspaceMembership(req.workspaceId, req.user.id);
  return req.workspaceMembership || null;
}

function applyMembershipRoles(target, membership) {
  if (!membership || membership.status !== "active") return;
  const role = String(membership.role || "").toLowerCase();
  target.add("member");
  if (role === "owner" || role === "admin") {
    target.add("workspace_admin");
    target.add("project_admin");
  } else if (role === "editor") {
    target.add("project_admin");
  }
}

export function deriveRoles({ membership, headerRoles = [], allowHeaderFallback = true }) {
  const roles = new Set();
  applyMembershipRoles(roles, membership);
  if (allowHeaderFallback) {
    headerRoles.forEach((r) => roles.add(r));
  }
  return Array.from(roles);
}

async function resolveRoles(req) {
  if (req._rolesResolved) return req.roles || [];
  const headerRoles = parseHeaderRoles(req);
  const membership = await resolveMembership(req);
  req.roles = deriveRoles({
    membership,
    headerRoles,
    allowHeaderFallback: allowHeaderRoleFallback,
  });
  req._rolesResolved = true;
  return req.roles;
}

export async function requireAuth(req, res, next) {
  try {
    await attachAuth(req);
    if (!req.user?.id) {
      if (req._headerAuthDenied) {
        return res.status(401).json({ error: "unauthorized (header auth disabled)" });
      }
      return res.status(401).json({ error: "unauthorized" });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireWorkspace(req, res, next) {
  const workspaceId =
    req.params?.workspaceId ||
    req.headers["x-workspace-id"] ||
    req.query.workspaceId ||
    req.query.workspace_id ||
    req.body?.workspaceId ||
    req.body?.workspace_id;
  const headerWorkspaceId = req.headers["x-workspace-id"];
  if (!workspaceId) {
    if (isPlatformAdmin(req)) return next();
    return res.status(400).json({ error: "workspaceId is required" });
  }
  if (requireWorkspaceHeader && !req.params?.workspaceId && !headerWorkspaceId && !isPlatformAdmin(req)) {
    return res.status(400).json({ error: "x-workspace-id header required" });
  }
  req.workspaceId = String(workspaceId);
  return next();
}

export async function requireWorkspaceMember(req, res, next) {
  try {
    if (isPlatformAdmin(req)) return next();

    const membership = await resolveMembership(req);
    if (membership) {
      if (membership.status !== "active") {
        return res.status(403).json({ error: "Workspace membership inactive" });
      }
      return next();
    }

    const headerRoles = parseHeaderRoles(req);
    if (allowHeaderRoleFallback && headerRoles.length) {
      req.roles = headerRoles;
      req._rolesResolved = true;
      return next();
    }
    return res.status(403).json({ error: "Workspace membership required" });
  } catch (err) {
    return next(err);
  }
}

export function withRole(role) {
  return async function roleCheck(req, res, next) {
    try {
      const roles = await resolveRoles(req);
      const hasRole = roles.includes(role) || (role !== "workspace_admin" && roles.includes("workspace_admin"));
      if (!hasRole) {
        return res.status(403).json({ error: "forbidden", code: "INSUFFICIENT_ROLE" });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
