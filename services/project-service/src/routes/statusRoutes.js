import express from "express";
import { store } from "../store/firestoreStore.js";
import { requireAuth, requireWorkspace, requireWorkspaceMember, withRole } from "../middleware/auth.js";
import { requireProjectManagementEnabled } from "../middleware/pluginGate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace, requireWorkspaceMember, requireProjectManagementEnabled);

function hasWorkspaceAdmin(req) {
  const roles = (req.headers["x-roles"] || "").split(",").map((r) => r.trim()).filter(Boolean);
  return roles.includes("workspace_admin");
}

async function assertProject(projectId, workspaceId) {
  const project = await store.getProject(projectId);
  if (!project || project.workspaceId !== workspaceId) return null;
  return project;
}

router.post(
  "/:projectId/statuses",
  withRole("project_admin"),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await assertProject(projectId, req.workspaceId);
    if (!project) return res.status(404).json({ error: "Not found" });
    const { name, order } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const status = await store.createStatus({ projectId, name, order: Number(order) || 1 });
    res.status(201).json(status);
  }),
);

router.get(
  "/:projectId/statuses",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await assertProject(projectId, req.workspaceId);
    if (!project) return res.status(404).json({ error: "Not found" });
    const statuses = await store.listStatuses(projectId);
    res.json({ statuses });
  }),
);

router.patch(
  "/statuses/:statusId",
  withRole("project_admin"),
  asyncHandler(async (req, res) => {
    const status = await store.getStatus(req.params.statusId);
    if (!status) return res.status(404).json({ error: "Not found" });
    const project = await assertProject(status.projectId, req.workspaceId);
    if (!project) return res.status(404).json({ error: "Not found" });
    if (status.isSystem && !hasWorkspaceAdmin(req)) {
      return res.status(403).json({ error: "Cannot modify system status", code: "SYSTEM_STATUS_PROTECTED" });
    }
    const patch = {};
    if (typeof req.body.name === "string") patch.name = req.body.name;
    if (req.body.order !== undefined) patch.order = Number(req.body.order);
    const updated = await store.updateStatus(status.id, patch);
    res.json(updated);
  }),
);

router.delete(
  "/statuses/:statusId",
  withRole("project_admin"),
  asyncHandler(async (req, res) => {
    const status = await store.getStatus(req.params.statusId);
    if (!status) return res.status(404).json({ error: "Not found" });
    const project = await assertProject(status.projectId, req.workspaceId);
    if (!project) return res.status(404).json({ error: "Not found" });
    if (status.isSystem) {
      return res.status(403).json({ error: "Cannot delete system status", code: "SYSTEM_STATUS_PROTECTED" });
    }
    const moveTo = req.query.moveTasksToStatusId;
    const mappings = await store.listProjectTasks(status.projectId);
    const hasMappings = mappings.some((m) => m.statusId === status.id);
    if (hasMappings && !moveTo) {
      return res.status(400).json({ error: "Status in use; provide moveTasksToStatusId" });
    }
    if (hasMappings && moveTo) {
      await Promise.all(
        mappings
          .filter((m) => m.statusId === status.id)
          .map((m) => store.updateProjectTask(m.projectId, m.taskId, { statusId: moveTo })),
      );
    }
    await store.deleteStatus(status.id);
    res.json({ success: true });
  }),
);

export default router;
