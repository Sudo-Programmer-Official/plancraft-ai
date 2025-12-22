import express from "express";
import { store } from "../store/firestoreStore.js";
import { requireAuth, requireWorkspace, requireWorkspaceMember, withRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace, requireWorkspaceMember);

router.get(
  "/:workspaceId/plugins/project-management",
  asyncHandler(async (req, res) => {
    const settings = await store.getPluginSettings(req.params.workspaceId);
    res.json(settings);
  }),
);

router.put(
  "/:workspaceId/plugins/project-management",
  withRole("workspace_admin"),
  asyncHandler(async (req, res) => {
    const workspaceId = req.params.workspaceId;
    const body = req.body || {};
    const settings = await store.upsertPluginSettings(
      workspaceId,
      {
        projectManagementEnabled: Boolean(body.projectManagementEnabled),
        sprintEnabled: Boolean(body.sprintEnabled) && Boolean(body.projectManagementEnabled),
        sprintLabel: body.sprintLabel || "Sprint",
      },
      req.user?.id || null,
    );
    res.json(settings);
  }),
);

export default router;
