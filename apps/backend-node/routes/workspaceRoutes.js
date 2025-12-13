import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/workspace.js";
import {
  acceptInviteToken,
  createWorkspace,
  createWorkspaceInvite,
  getInviteByToken,
  getWorkspaceMembership,
  getWorkspace,
  isValidWorkspaceRole,
  listUserWorkspaces,
  listWorkspaceInvites,
  listWorkspaceMembers,
  removeWorkspaceMember,
  revokeInviteToken,
  setWorkspaceMemberRole,
  updateInviteEmailStatus,
  updateWorkspace,
} from "../services/workspaceService.js";
import { sendEmail } from "../services/emailService.js";
import { db } from "../services/firebaseAdmin.js";

const router = express.Router();

function roleLabel(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "admin") return "Admin";
  if (normalized === "editor") return "Editor";
  return "Viewer";
}

function buildInviteEmail({ workspaceName, inviterName, role, inviteLink }) {
  const safeWorkspace = workspaceName || "this workspace";
  const safeInviter = inviterName || "A teammate";
  const safeRole = roleLabel(role);
  const link = inviteLink || "#";
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px">
      <p style="text-transform:uppercase;letter-spacing:0.2em;font-size:12px;color:#a5b4fc;margin:0 0 8px">Workspace invite</p>
      <h2 style="margin:0 0 10px;">${safeInviter} invited you to ${safeWorkspace}</h2>
      <p style="margin:0 0 12px;color:#cbd5e1;">Role: <strong>${safeRole}</strong></p>
      <p style="margin:0 0 18px;color:#cbd5e1;">Join to collaborate with your team. Access stays scoped to this workspace.</p>
      <a href="${link}" style="display:inline-block;padding:12px 18px;background:#6366f1;color:#0b1021;text-decoration:none;border-radius:12px;font-weight:700;">Join workspace</a>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">If the button does not work, copy and paste this link:</p>
      <p style="margin:4px 0 0;color:#a5b4fc;font-size:13px;word-break:break-all;">${link}</p>
    </div>
  `;
}

async function getUserIdentity(uid) {
  if (!uid) return { name: null, email: null };
  const snap = await db.collection("users").doc(String(uid)).get();
  const data = snap.exists ? snap.data() || {} : {};
  return {
    name: data.name || data.displayName || null,
    email: data.email || null,
  };
}

function sanitizeInvite(invite) {
  if (!invite) return null;
  const { hashedToken, ...rest } = invite;
  return rest;
}

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
    const invitesRaw = await listWorkspaceInvites(req.workspaceId, ["pending"]);
    const invites = invitesRaw.map((invite) => sanitizeInvite(invite));
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
    const workspace = req.workspace || (await getWorkspace(req.workspaceId));
    const baseUrl =
      process.env.APP_BASE_URL ||
      process.env.FRONTEND_URL ||
      process.env.VITE_APP_URL ||
      process.env.PUBLIC_URL ||
      "https://plancraftai.com";
    const normalizedBaseUrl = baseUrl ? baseUrl.replace(/\/+$/, "") : "";
    const inviteLink = normalizedBaseUrl ? `${normalizedBaseUrl}/invite/${invite.token}` : null;
    let emailStatus = "skipped";
    let emailError = null;
    let emailProviderStatus = null;

    if (inviteLink && (invite.emailLower || invite.email)) {
      try {
        const inviter = await getUserIdentity(req.user.uid);
        const subject = `${inviter.name || inviter.email || "A teammate"} invited you to ${
          workspace?.name || "PlanCraftAI"
        }`;
        const html = buildInviteEmail({
          workspaceName: workspace?.name || null,
          inviterName: inviter.name || inviter.email || req.user.email || "A teammate",
          role: invite.role,
          inviteLink,
        });
        const text = `${inviter.name || inviter.email || "A teammate"} invited you to ${
          workspace?.name || "PlanCraftAI"
        }. Join: ${inviteLink}`;
        const result = await sendEmail({
          to: invite.emailLower || invite.email,
          subject,
          html,
          text,
        });
        emailProviderStatus = result?.status || null;
        if (result?.success) {
          emailStatus = "sent";
        } else {
          emailStatus = "failed";
          emailError = result?.error || result?.reason || "Email failed to send";
        }
        console.info("[WorkspaceInvite] email send", {
          workspaceId: req.workspaceId,
          to: invite.emailLower || invite.email,
          status: emailStatus,
          providerStatus: emailProviderStatus,
        });
      } catch (err) {
        emailStatus = "failed";
        emailError = err?.message || "Failed to send email";
        console.error("[WorkspaceInvite] email send failed", err?.message || err);
      }
    } else {
      emailStatus = "failed";
      emailError = "Invite link unavailable";
    }

    try {
      await updateInviteEmailStatus(invite.id, emailStatus, emailError, emailProviderStatus);
    } catch (err) {
      console.warn("[WorkspaceInvite] failed to persist email status", err?.message || err);
    }

    const safeInvite = sanitizeInvite({ ...invite, emailStatus, emailError, emailProviderStatus });
    return res.status(emailStatus === "failed" ? 202 : 201).json({
      invite: safeInvite,
      link: inviteLink,
      emailStatus,
      emailError,
      emailProviderStatus,
    });
  } catch (err) {
    console.error("[WorkspaceRoutes] invite failed", err?.message || err);
    return res.status(500).json({ error: "Failed to send invite" });
  }
});

async function inviteLookupHandler(req, res) {
  try {
    const { token } = req.params || {};
    const invite = await getInviteByToken(token);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    const workspace = invite.workspaceId ? await getWorkspace(invite.workspaceId) : null;
    const inviter = invite.invitedBy || invite.invitedByUid ? await getUserIdentity(invite.invitedBy || invite.invitedByUid) : { name: null, email: null };
    const expired = invite.expires_at && invite.expires_at.getTime() < Date.now();
    const status = expired && invite.status === "pending" ? "expired" : invite.status;
    const safeInvite = sanitizeInvite({ ...invite, status });
    return res.json({
      invite: safeInvite,
      workspace: workspace
        ? { id: workspace.id, name: workspace.name, icon: workspace.icon, theme: workspace.theme }
        : null,
      inviter,
      expired: status === "expired",
    });
  } catch (err) {
    console.error("[WorkspaceRoutes] invite lookup failed", err?.message || err);
    return res.status(500).json({ error: "Failed to load invite" });
  }
}

async function inviteAcceptHandler(req, res) {
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
}

async function inviteRevokeHandler(req, res) {
  try {
    const { token } = req.params || {};
    if (!token) return res.status(400).json({ error: "Missing token" });
    const invite = await getInviteByToken(token);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.status === "accepted") return res.status(400).json({ error: "Invite already accepted" });
    const membership = await getWorkspaceMembership(invite.workspaceId, req.user.uid);
    if (!membership || membership.status !== "active" || membership.role !== "admin") {
      return res.status(403).json({ error: "Only workspace admins can revoke invites" });
    }
    const revoked = await revokeInviteToken(token, req.user.uid);
    return res.json({ invite: sanitizeInvite(revoked) });
  } catch (err) {
    console.error("[WorkspaceRoutes] revoke failed", err?.message || err);
    return res.status(400).json({ error: err?.message || "Failed to revoke invite" });
  }
}

router.get("/workspaces/invites/:token", inviteLookupHandler);
router.get("/invites/:token", inviteLookupHandler);

router.post("/workspaces/invites/:token/accept", requireAuth, inviteAcceptHandler);
router.post("/invites/:token/accept", requireAuth, inviteAcceptHandler);

router.post("/workspaces/invites/:token/revoke", requireAuth, inviteRevokeHandler);
router.post("/invites/:token/revoke", requireAuth, inviteRevokeHandler);

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
