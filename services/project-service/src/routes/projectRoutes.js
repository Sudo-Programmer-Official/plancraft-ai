import express from "express";
import { v4 as uuid } from "uuid";
import { store } from "../store/firestoreStore.js";
import { requireAuth, requireWorkspace, requireWorkspaceMember, withRole } from "../middleware/auth.js";
import { requireProjectManagementEnabled } from "../middleware/pluginGate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitEvent } from "../events/eventEmitter.js";
import { PROJECT_EVENTS } from "../events/projectEvents.js";
import { getEvents } from "../events/eventSink.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace, requireWorkspaceMember, requireProjectManagementEnabled);

function ensureWorkspaceMatch(project, workspaceId) {
  return project && project.workspaceId === workspaceId;
}

function actorMeta(req) {
  const displayName = req.user?.name || req.user?.email || null;
  return { actorUserId: req.user?.id || null, actorDisplayName: displayName };
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
    emitEvent(PROJECT_EVENTS.PROJECT_CREATED, {
      workspaceId,
      projectId: project.id,
      ...actorMeta(req),
      entityType: "project",
      entityId: project.id,
      data: { name: project.name, description: project.description },
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
    emitEvent(PROJECT_EVENTS.PROJECT_UPDATED, {
      workspaceId: req.workspaceId,
      projectId: project.id,
      ...actorMeta(req),
      entityType: "project",
      entityId: project.id,
      data: patch,
    });
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
    emitEvent(PROJECT_EVENTS.PROJECT_UPDATED, {
      workspaceId: req.workspaceId,
      projectId: project.id,
      ...actorMeta(req),
      entityType: "project",
      entityId: project.id,
      data: { isActive: false },
    });
    res.json({ success: true });
  }),
);

router.post(
  "/:projectId/feedback",
  asyncHandler(async (req, res) => {
    const project = await store.getProject(req.params.projectId);
    if (!ensureWorkspaceMatch(project, req.workspaceId)) return res.status(404).json({ error: "Not found" });
    const { source, text, url, author } = req.body || {};
    if (!text) return res.status(400).json({ error: "text is required" });
    const feedback = await store.createFeedback({
      projectId: project.id,
      workspaceId: req.workspaceId,
      source: source || "client",
      text,
      url: url || null,
      author: author || null,
      createdBy: req.user?.id || null,
    });
    emitEvent(PROJECT_EVENTS.FEEDBACK_INGESTED, {
      workspaceId: req.workspaceId,
      projectId: project.id,
      ...actorMeta(req),
      entityType: "feedback",
      entityId: feedback.id,
      data: { source: feedback.source, url: feedback.url, author: feedback.author },
    });
    res.status(201).json(feedback);
  }),
);

router.get(
  "/:projectId/activity",
  asyncHandler(async (req, res) => {
    const project = await store.getProject(req.params.projectId);
    if (!ensureWorkspaceMatch(project, req.workspaceId)) return res.status(404).json({ error: "Not found" });
    const { limit, cursor } = req.query || {};
    const result = getEvents({
      projectId: project.id,
      workspaceId: req.workspaceId,
      limit,
      cursor,
    });
    res.json(result);
  }),
);

export default router;
