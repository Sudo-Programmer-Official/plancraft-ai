// Lightweight auth placeholder. Replace with shared middleware once wired to real identity.
export function requireAuth(req, res, next) {
  const userId = req.headers["x-user-id"] || req.headers["x-user"] || req.headers["authorization"];
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  req.user = { id: String(userId) };
  next();
}

export function requireWorkspace(req, res, next) {
  const workspaceId =
    req.params?.workspaceId ||
    req.headers["x-workspace-id"] ||
    req.query.workspaceId ||
    req.query.workspace_id ||
    req.body?.workspaceId ||
    req.body?.workspace_id;
  if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
  req.workspaceId = String(workspaceId);
  next();
}

export function withRole(role) {
  return function roleCheck(req, res, next) {
    // Role resolution is a placeholder; replace with real workspace membership lookup.
    const roles = (req.headers["x-roles"] || "").split(",").map((r) => r.trim()).filter(Boolean);
    if (!roles.includes(role) && !roles.includes("workspace_admin")) {
      return res.status(403).json({ error: "forbidden", code: "INSUFFICIENT_ROLE" });
    }
    next();
  };
}
