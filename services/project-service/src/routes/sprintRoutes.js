import express from "express";
import { store } from "../store/firestoreStore.js";
import { requireAuth, requireWorkspace, withRole } from "../middleware/auth.js";
import { requireProjectManagementEnabled, requireSprintEnabled } from "../middleware/pluginGate.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace, requireProjectManagementEnabled, requireSprintEnabled);

async function projectBelongs(projectId, workspaceId) {
  const project = await store.getProject(projectId);
  return project && project.workspaceId === workspaceId;
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
    const updated = await store.updateSprint(sprint.id, {
      name: typeof name === "string" ? name : sprint.name,
      startDate: startDate ?? sprint.startDate,
      endDate: endDate ?? sprint.endDate,
    });
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
