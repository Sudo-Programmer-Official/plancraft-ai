import express from "express";
import { store } from "../store/firestoreStore.js";
import { requireAuth, requireWorkspace, requireWorkspaceMember } from "../middleware/auth.js";
import { requireProjectManagementEnabled, requireSprintEnabled } from "../middleware/pluginGate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { emitEvent } from "../events/eventEmitter.js";
import { PROJECT_EVENTS } from "../events/projectEvents.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace, requireWorkspaceMember, requireProjectManagementEnabled);

async function ensureProject(projectId, workspaceId) {
  const project = await store.getProject(projectId);
  return project && project.workspaceId === workspaceId ? project : null;
}

async function defaultStatusId(projectId) {
  const statuses = await store.listStatuses(projectId);
  const todo = statuses.find((s) => s.name.toLowerCase() === "todo");
  return (todo && todo.id) || (statuses[0] && statuses[0].id) || null;
}

function actorMeta(req) {
  const displayName = req.user?.name || req.user?.email || null;
  return { actorUserId: req.user?.id || null, actorDisplayName: displayName };
}

router.post(
  "/project-tasks",
  asyncHandler(async (req, res) => {
    const { projectId, taskId, statusId, sprintId } = req.body || {};
    if (!projectId || !taskId) return res.status(400).json({ error: "projectId and taskId are required" });
    if (!(await ensureProject(projectId, req.workspaceId))) return res.status(404).json({ error: "Project not found" });
    const effectiveStatusId = statusId || (await defaultStatusId(projectId));
    if (!effectiveStatusId) return res.status(400).json({ error: "No status configured for project" });
    if (sprintId) {
      const sprint = await store.getSprint(sprintId);
      if (!sprint || sprint.projectId !== projectId) return res.status(400).json({ error: "Invalid sprintId" });
      const settings = req.pluginSettings || (await store.getPluginSettings(req.workspaceId));
      if (!settings.sprintEnabled) return res.status(403).json({ error: "Sprints disabled", code: "PLUGIN_DISABLED" });
    }
    const mapping = await store.createProjectTask({
      projectId,
      taskId,
      statusId: effectiveStatusId,
      sprintId,
      addedBy: req.user?.id || null,
    });
    emitEvent(PROJECT_EVENTS.TASK_CREATED, {
      workspaceId: req.workspaceId,
      projectId,
      ...actorMeta(req),
      entityType: "task",
      entityId: taskId,
      data: { taskId, statusId: mapping.statusId, sprintId: mapping.sprintId },
    });
    res.status(201).json(mapping);
  }),
);

router.get(
  "/projects/:projectId/tasks",
  asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    if (!(await ensureProject(projectId, req.workspaceId))) return res.status(404).json({ error: "Not found" });
    const filters = {
      sprintId: req.query.sprintId || undefined,
      statusId: req.query.statusId || undefined,
    };
    const items = await store.listProjectTasks(projectId, filters);
    res.json({ tasks: items });
  }),
);

router.patch(
  "/project-tasks/:projectId/:taskId",
  asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;
    if (!(await ensureProject(projectId, req.workspaceId))) return res.status(404).json({ error: "Not found" });
    const mapping = await store.getProjectTask(projectId, taskId);
    if (!mapping) return res.status(404).json({ error: "Not found" });
    const prevStatusId = mapping.statusId;
    const patch = {};
    if (req.body.statusId) patch.statusId = req.body.statusId;
    if (req.body.hasOwnProperty("sprintId")) {
      const sprintId = req.body.sprintId;
      if (sprintId) {
        const sprint = await store.getSprint(sprintId);
        if (!sprint || sprint.projectId !== projectId) return res.status(400).json({ error: "Invalid sprintId" });
        const settings = req.pluginSettings || (await store.getPluginSettings(req.workspaceId));
        if (!settings.sprintEnabled) return res.status(403).json({ error: "Sprints disabled", code: "PLUGIN_DISABLED" });
      }
      patch.sprintId = sprintId || null;
    }
    const updated = await store.updateProjectTask(projectId, taskId, patch);
    if (patch.statusId && patch.statusId !== prevStatusId) {
      emitEvent(PROJECT_EVENTS.TASK_STATUS_CHANGED, {
        workspaceId: req.workspaceId,
        projectId,
        ...actorMeta(req),
        entityType: "task",
        entityId: taskId,
        data: { taskId, from: prevStatusId, to: patch.statusId },
      });
    } else {
      emitEvent(PROJECT_EVENTS.TASK_UPDATED, {
        workspaceId: req.workspaceId,
        projectId,
        ...actorMeta(req),
        entityType: "task",
        entityId: taskId,
        data: { taskId, patch },
      });
    }
    res.json(updated);
  }),
);

router.delete(
  "/project-tasks/:projectId/:taskId",
  asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;
    if (!(await ensureProject(projectId, req.workspaceId))) return res.status(404).json({ error: "Not found" });
    const removed = await store.deleteProjectTask(projectId, taskId);
    if (!removed) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  }),
);

export default router;
