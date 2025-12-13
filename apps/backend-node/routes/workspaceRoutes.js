import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/workspace.js";
import {
  acceptInviteToken,
  createWorkspace,
  createWorkspaceInvite,
  getInviteByToken,
  getWorkspace,
  isValidWorkspaceRole,
  listUserWorkspaces,
  listWorkspaceInvites,
  listWorkspaceMembers,
  removeWorkspaceMember,
  setWorkspaceMemberRole,
  updateWorkspace,
} from "../services/workspaceService.js";

const router = express.Router();

router.post("/workspaces", requireAuth, async (req, res) => {
  try {
    const { name, icon, theme, timezone, workspaceType = "team", description = "" } = req.body || {};
    const workspace = await createWorkspace({
      name,
      icon,
      theme,
      timezone,
      workspaceType,
      description,
      ownerId: req.user.uid,
    });
    return res.status(201).json({ workspace, role: "admin" });
  } catch (err) {
    console.error("[WorkspaceRoutes] create failed", err?.message || err);
    return res.status(500).json({ error: "Failed to create workspace" });
  }
});

router.get("/workspaces", requireAuth, async (req, res) => {
  try {
    const workspaces = await listUserWorkspaces(req.user.uid);
    return res.json({ workspaces });
  } catch (err) {
    console.error("[WorkspaceRoutes] list failed", err?.message || err);
    return res.status(500).json({ error: "Failed to load workspaces" });
  }
});

router.patch("/workspaces/:workspaceId", requireAuth, requireWorkspaceRole(["admin"]), async (req, res) => {
  try {
    const workspace = await updateWorkspace(req.workspaceId, req.body || {});
    return res.json({ workspace });
  } catch (err) {
    console.error("[WorkspaceRoutes] update failed", err?.message || err);
    return res.status(400).json({ error: "Failed to update workspace" });
  }
});

router.get("/workspaces/:workspaceId/members", requireAuth, requireWorkspaceRole(["admin"]), async (req, res) => {
  try {
    const members = await listWorkspaceMembers(req.workspaceId);
    const invites = await listWorkspaceInvites(req.workspaceId, ["pending"]);
    return res.json({ members, invites });
  } catch (err) {
    console.error("[WorkspaceRoutes] members failed", err?.message || err);
    return res.status(500).json({ error: "Failed to load members" });
  }
});

router.post("/workspaces/:workspaceId/invite", requireAuth, requireWorkspaceRole(["admin"]), async (req, res) => {
  try {
    const { email, role = "editor", expiresInDays = 7 } = req.body || {};
    if (!email) return res.status(400).json({ error: "Email is required" });
    const normalizedRole = String(role || "").toLowerCase();
    if (!isValidWorkspaceRole(normalizedRole)) {
      return res.status(400).json({ error: "Role must be viewer, editor, or admin" });
    }
    const invite = await createWorkspaceInvite({
      workspaceId: req.workspaceId,
      email,
      role: normalizedRole,
      invitedBy: req.user.uid,
      expiresInDays: Number(expiresInDays) || 7,
    });
    const baseUrl =
      process.env.APP_BASE_URL ||
      process.env.FRONTEND_URL ||
      process.env.VITE_APP_URL ||
      process.env.PUBLIC_URL ||
      "";
    const normalizedBaseUrl = baseUrl ? baseUrl.replace(/\/+$/, "") : "";
    const inviteLink = normalizedBaseUrl ? `${normalizedBaseUrl}/invite/${invite.token}` : null;
    return res.status(201).json({ invite, link: inviteLink });
  } catch (err) {
    console.error("[WorkspaceRoutes] invite failed", err?.message || err);
    return res.status(500).json({ error: "Failed to send invite" });
  }
});

router.get("/workspaces/invites/:token", async (req, res) => {
  try {
    const { token } = req.params || {};
    const invite = await getInviteByToken(token);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    const workspace = invite.workspaceId ? await getWorkspace(invite.workspaceId) : null;
    const expired = invite.expires_at && invite.expires_at.getTime() < Date.now();
    const status = expired && invite.status === "pending" ? "expired" : invite.status;
    return res.json({
      invite: { ...invite, status },
      workspace: workspace
        ? { id: workspace.id, name: workspace.name, icon: workspace.icon, theme: workspace.theme }
        : null,
    });
  } catch (err) {
    console.error("[WorkspaceRoutes] invite lookup failed", err?.message || err);
    return res.status(500).json({ error: "Failed to load invite" });
  }
});

router.post("/workspaces/invites/:token/accept", requireAuth, async (req, res) => {
  try {
    const { token } = req.params || {};
    if (!token) return res.status(400).json({ error: "Missing token" });
    const result = await acceptInviteToken(token, req.user);
    return res.json({
      workspace: result.workspace,
      role: result.role,
      membership: { workspaceId: result.workspace?.id, role: result.role, status: "active" },
    });
  } catch (err) {
    const msg = String(err?.message || "").toLowerCase();
    if (msg.includes("not found")) return res.status(404).json({ error: "Invite not found" });
    if (msg.includes("expired")) return res.status(410).json({ error: "Invite expired" });
    if (msg.includes("different email")) return res.status(403).json({ error: err.message });
    if (msg.includes("workspace not found"))
      return res.status(404).json({ error: "Workspace not found" });
    console.error("[WorkspaceRoutes] accept failed", err?.message || err);
    return res.status(400).json({ error: err?.message || "Failed to accept invite" });
  }
});

router.delete(
  "/workspaces/:workspaceId/members/:userId",
  requireAuth,
  requireWorkspaceRole(["admin"]),
  async (req, res) => {
    try {
      const targetId = req.params?.userId;
      if (!targetId) return res.status(400).json({ error: "userId is required" });
      if (req.workspace?.ownerId && req.workspace.ownerId === targetId) {
        return res.status(400).json({ error: "Cannot remove workspace owner" });
      }
      await removeWorkspaceMember(req.workspaceId, targetId);
      return res.json({ success: true });
    } catch (err) {
      console.error("[WorkspaceRoutes] remove failed", err?.message || err);
      return res.status(500).json({ error: "Failed to remove member" });
    }
  },
);

router.patch(
  "/workspaces/:workspaceId/members/:userId",
  requireAuth,
  requireWorkspaceRole(["admin"]),
  async (req, res) => {
    try {
      const targetId = req.params?.userId;
      const { role } = req.body || {};
      if (!isValidWorkspaceRole(role)) {
        return res.status(400).json({ error: "Role must be viewer, editor, or admin" });
      }
      if (req.workspace?.ownerId && req.workspace.ownerId === targetId) {
        return res.status(400).json({ error: "Cannot downgrade workspace owner" });
      }
      const member = await setWorkspaceMemberRole(req.workspaceId, targetId, String(role).toLowerCase());
      return res.json({ member });
    } catch (err) {
      console.error("[WorkspaceRoutes] role update failed", err?.message || err);
      return res.status(500).json({ error: "Failed to update member" });
    }
  },
);

export default router;
