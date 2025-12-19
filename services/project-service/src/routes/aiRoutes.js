import express from "express";
import { requireAuth, requireWorkspace } from "../middleware/auth.js";
import { requireProjectManagementEnabled } from "../middleware/pluginGate.js";

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireWorkspace, requireProjectManagementEnabled);

function okStub(message) {
  return { status: "stub", message };
}

router.get("/projects/:id/summary", (req, res) => {
  res.status(501).json(okStub("Project summary AI hook not implemented"));
});

router.get("/sprints/:id/health", (req, res) => {
  res.status(501).json(okStub("Sprint health AI hook not implemented"));
});

router.get("/projects/:id/stalled-tasks", (req, res) => {
  res.status(501).json(okStub("Stalled tasks AI hook not implemented"));
});

export default router;
