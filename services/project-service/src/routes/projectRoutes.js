import express from "express";
import { v4 as uuid } from "uuid";
import { store } from "../store/firestoreStore.js";
import { requireAuth, requireWorkspace, withRole } from "../middleware/auth.js";
import { requireProjectManagementEnabled } from "../middleware/pluginGate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace, requireProjectManagementEnabled);

function ensureWorkspaceMatch(project, workspaceId) {
  return project && project.workspaceId === workspaceId;
}

router.post(
  "/",
  withRole("project_admin"),
  asyncHandler(async (req, res) => {
    const { workspaceId } = req;
    const { name, description } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const project = await store.createProjectWithDefaults({
      workspaceId,
      name,
      description: description || "",
      createdBy: req.user?.id || null,
    });
    res.status(201).json(project);
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { workspaceId } = req;
    const isActive = typeof req.query.isActive === "string" ? req.query.isActive === "true" : undefined;
    const projects = await store.listProjects({ workspaceId, isActive });
    res.json({ projects });
  }),
);

router.get(
  "/:projectId",
  asyncHandler(async (req, res) => {
    const project = await store.getProject(req.params.projectId);
    if (!ensureWorkspaceMatch(project, req.workspaceId)) return res.status(404).json({ error: "Not found" });
    res.json(project);
  }),
);

router.patch(
  "/:projectId",
  withRole("project_admin"),
  asyncHandler(async (req, res) => {
    const project = await store.getProject(req.params.projectId);
    if (!ensureWorkspaceMatch(project, req.workspaceId)) return res.status(404).json({ error: "Not found" });
    const patch = {};
    if (typeof req.body.name === "string") patch.name = req.body.name;
    if (typeof req.body.description === "string") patch.description = req.body.description;
    if (typeof req.body.isActive === "boolean") patch.isActive = req.body.isActive;
    const updated = await store.updateProject(project.id, patch);
    res.json(updated);
  }),
);

router.delete(
  "/:projectId",
  withRole("workspace_admin"),
  asyncHandler(async (req, res) => {
    const project = await store.getProject(req.params.projectId);
    if (!ensureWorkspaceMatch(project, req.workspaceId)) return res.status(404).json({ error: "Not found" });
    await store.softDeleteProject(project.id);
    res.json({ success: true });
  }),
);

export default router;
