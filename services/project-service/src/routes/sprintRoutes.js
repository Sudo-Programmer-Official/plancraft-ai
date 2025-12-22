import express from "express";
import { store } from "../store/firestoreStore.js";
import { requireAuth, requireWorkspace, requireWorkspaceMember, withRole } from "../middleware/auth.js";
import { requireProjectManagementEnabled, requireSprintEnabled } from "../middleware/pluginGate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitEvent } from "../events/eventEmitter.js";
import { PROJECT_EVENTS } from "../events/projectEvents.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace, requireWorkspaceMember, requireProjectManagementEnabled, requireSprintEnabled);

async function projectBelongs(projectId, workspaceId) {
  const project = await store.getProject(projectId);
  return project && project.workspaceId === workspaceId;
}

function actorMeta(req) {
  const displayName = req.user?.name || req.user?.email || null;
  return { actorUserId: req.user?.id || null, actorDisplayName: displayName };
}

router.post(
  "/:projectId/sprints",
  withRole("project_admin"),
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    if (!(await projectBelongs(projectId, req.workspaceId))) return res.status(404).json({ error: "Not found" });
    const { name, startDate, endDate } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const sprint = await store.createSprint({ projectId, name, startDate, endDate });
    emitEvent(PROJECT_EVENTS.SPRINT_CREATED, {
      workspaceId: req.workspaceId,
      projectId,
      ...actorMeta(req),
      entityType: "sprint",
      entityId: sprint.id,
      data: { name: sprint.name, startDate: sprint.startDate, endDate: sprint.endDate, sprintId: sprint.id },
    });
    res.status(201).json(sprint);
  }),
);

router.get(
  "/:projectId/sprints",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    if (!(await projectBelongs(projectId, req.workspaceId))) return res.status(404).json({ error: "Not found" });
    const sprints = await store.listSprints(projectId);
    res.json({ sprints });
  }),
);

router.patch(
  "/sprints/:sprintId",
  withRole("project_admin"),
  asyncHandler(async (req, res) => {
    const sprint = await store.getSprint(req.params.sprintId);
    if (!sprint) return res.status(404).json({ error: "Not found" });
    const project = await store.getProject(sprint.projectId);
    if (!project || project.workspaceId !== req.workspaceId) return res.status(404).json({ error: "Not found" });
    const { name, startDate, endDate } = req.body || {};
    const prevStart = sprint.startDate;
    const prevEnd = sprint.endDate;
    const updated = await store.updateSprint(sprint.id, {
      name: typeof name === "string" ? name : sprint.name,
      startDate: startDate ?? sprint.startDate,
      endDate: endDate ?? sprint.endDate,
    });
    if (startDate !== undefined && !prevStart && updated.startDate) {
      emitEvent(PROJECT_EVENTS.SPRINT_STARTED, {
        workspaceId: req.workspaceId,
        projectId: sprint.projectId,
        ...actorMeta(req),
        entityType: "sprint",
        entityId: sprint.id,
        data: { sprintId: sprint.id, startDate: updated.startDate },
      });
    }
    if (endDate !== undefined && !prevEnd && updated.endDate) {
      emitEvent(PROJECT_EVENTS.SPRINT_COMPLETED, {
        workspaceId: req.workspaceId,
        projectId: sprint.projectId,
        ...actorMeta(req),
        entityType: "sprint",
        entityId: sprint.id,
        data: { sprintId: sprint.id, endDate: updated.endDate },
      });
    }
    res.json(updated);
  }),
);

router.delete(
  "/sprints/:sprintId",
  withRole("project_admin"),
  asyncHandler(async (req, res) => {
    const sprint = await store.getSprint(req.params.sprintId);
    if (!sprint) return res.status(404).json({ error: "Not found" });
    const project = await store.getProject(sprint.projectId);
    if (!project || project.workspaceId !== req.workspaceId) return res.status(404).json({ error: "Not found" });
    const unassign = req.query.unassign === "true";
    if (!unassign) return res.status(400).json({ error: "unassign=true required to delete sprint" });
    await store.deleteSprint(sprint.id);
    res.json({ success: true });
  }),
);

export default router;
