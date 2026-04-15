import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/workspace.js";
import { checkUserPlanUsage } from "../services/planService.js";
import {
  confirmActionSuggestion,
  detectAndStoreActionSuggestions,
  getActionInboxDailyIntent,
  getActionInboxInsights,
  ignoreActionSuggestion,
  listActionSuggestions,
  runActionInboxSweep,
  triggerActionInboxDigest,
} from "../services/actionInboxService.js";

const router = express.Router();

const selectWorkspaceId = (req) =>
  req.body?.workspaceId ||
  req.body?.workspace_id ||
  req.headers?.["x-workspace-id"] ||
  req.query?.workspaceId ||
  req.query?.workspace_id ||
  null;

const requireWorkspaceViewer = requireWorkspaceRole(["viewer", "editor", "admin", "owner"], {
  workspaceIdSelector: selectWorkspaceId,
});
const requireWorkspaceEditor = requireWorkspaceRole(["editor", "admin", "owner"], {
  workspaceIdSelector: selectWorkspaceId,
});

router.use(requireAuth);

router.get("/", requireWorkspaceViewer, async (req, res) => {
  try {
    const workspaceId = selectWorkspaceId(req);
    const userId = req.user?.uid;
    const status = typeof req.query?.status === "string" ? req.query.status : "pending";
    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 24, 1), 60);

    const suggestions = await listActionSuggestions(userId, workspaceId, { status, limit });
    return res.json({ success: true, suggestions });
  } catch (err) {
    console.error("[ActionInboxRoutes] list failed", err?.message || err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to load suggestions" });
  }
});

router.get("/insights", requireWorkspaceViewer, async (req, res) => {
  try {
    const workspaceId = selectWorkspaceId(req);
    const userId = req.user?.uid;
    const days = Math.min(Math.max(parseInt(req.query?.days, 10) || 30, 7), 90);

    const insights = await getActionInboxInsights(userId, workspaceId, { days });
    return res.json({ success: true, insights });
  } catch (err) {
    console.error("[ActionInboxRoutes] insights failed", err?.message || err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to load inbox insights" });
  }
});

router.get("/daily-intent", requireWorkspaceViewer, async (req, res) => {
  try {
    const workspaceId = selectWorkspaceId(req);
    const userId = req.user?.uid;
    const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 3, 1), 5);

    const intent = await getActionInboxDailyIntent(userId, workspaceId, { limit });
    return res.json({ success: true, intent });
  } catch (err) {
    console.error("[ActionInboxRoutes] daily intent failed", err?.message || err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to load daily intent" });
  }
});

router.post("/sync", requireWorkspaceViewer, async (req, res) => {
  try {
    const workspaceId = selectWorkspaceId(req);
    const userId = req.user?.uid;
    const trigger = typeof req.body?.trigger === "string" ? req.body.trigger : "app_open";
    const limit = Math.min(Math.max(parseInt(req.body?.limit, 10) || 24, 1), 60);

    const result = await runActionInboxSweep(userId, workspaceId, { trigger, limit });
    return res.json({ success: true, reopened: result.reopened, nudged: result.nudged || 0, suggestions: result.suggestions });
  } catch (err) {
    console.error("[ActionInboxRoutes] sync failed", err?.message || err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to sync suggestions" });
  }
});

router.post("/digest", requireWorkspaceViewer, async (req, res) => {
  try {
    const workspaceId = selectWorkspaceId(req);
    const userId = req.user?.uid;
    const force = req.body?.force === true;
    const result = await triggerActionInboxDigest(userId, workspaceId, {
      trigger: "manual_test",
      force,
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("[ActionInboxRoutes] digest failed", err?.message || err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to send inbox digest" });
  }
});

router.post("/detect", requireWorkspaceViewer, async (req, res) => {
  try {
    const workspaceId = selectWorkspaceId(req);
    const userId = req.user?.uid;
    const {
      text,
      sourceType = "note",
      sourceLabel = "note",
      sourceRefId = null,
      maxItems = 6,
      now = null,
      timezone = req.headers["x-user-tz"] || "UTC",
    } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    try {
      const usage = await checkUserPlanUsage(String(userId), "ai");
      if (!usage?.ok) {
        return res.status(403).json({
          error: "Daily AI limit reached. Upgrade to Premium to continue.",
          code: "ai_limit_reached",
          details: usage?.details || null,
        });
      }
    } catch {}

    const suggestions = await detectAndStoreActionSuggestions(userId, workspaceId, text, {
      timezone,
      nowISO: now,
      maxItems: Math.min(Math.max(parseInt(maxItems, 10) || 6, 1), 8),
      sourceType,
      sourceLabel,
      sourceRefId,
    });

    return res.json({ success: true, suggestions });
  } catch (err) {
    console.error("[ActionInboxRoutes] detect failed", err?.message || err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to detect suggestions" });
  }
});

router.post("/:id/ignore", requireWorkspaceViewer, async (req, res) => {
  try {
    const workspaceId = selectWorkspaceId(req);
    const userId = req.user?.uid;
    const suggestion = await ignoreActionSuggestion(userId, workspaceId, req.params.id);
    return res.json({ success: true, suggestion });
  } catch (err) {
    console.error("[ActionInboxRoutes] ignore failed", err?.message || err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to ignore suggestion" });
  }
});

router.post("/:id/confirm", requireWorkspaceEditor, async (req, res) => {
  try {
    const workspaceId = selectWorkspaceId(req);
    const userId = req.user?.uid;
    const timezone = req.body?.timezone || req.headers["x-user-tz"] || "UTC";
    const result = await confirmActionSuggestion(userId, workspaceId, req.params.id, {
      title: req.body?.title,
      details: req.body?.details,
      date: req.body?.date,
      category: req.body?.category,
      scheduledTime: req.body?.scheduledTime,
      timeHint: req.body?.timeHint,
      timezone,
    });

    return res.json({ success: true, task: result.task, suggestion: result.suggestion });
  } catch (err) {
    console.error("[ActionInboxRoutes] confirm failed", err?.message || err);
    return res.status(err?.statusCode || 500).json({ error: err?.message || "Failed to confirm suggestion" });
  }
});

export default router;
