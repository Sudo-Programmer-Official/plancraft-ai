import express from "express";
import { requireAuth, ensureUserMatches } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/workspace.js";
import { requireFeature } from "../middleware/feature.js";
import { FEATURE_KEYS } from "../services/entitlements.js";
import { createTask, scheduleTaskReminder } from "../services/taskService.js";
import { notifyTaskCreated } from "../services/notificationService.js";
import { db } from "../services/firebaseAdmin.js";

const router = express.Router();

router.use(requireAuth, ensureUserMatches);

const selectWorkspaceId = (req) =>
  req.body?.workspaceId ||
  req.body?.workspace_id ||
  req.headers?.["x-workspace-id"] ||
  req.query?.workspaceId ||
  req.query?.workspace_id ||
  null;

const requireWorkspaceEditor = requireWorkspaceRole(["editor", "admin"], {
  workspaceIdSelector: selectWorkspaceId,
});
const requireVoiceFeature = requireFeature(FEATURE_KEYS.voiceReminders);

function toTaskPayload(task = {}) {
  if (!task || typeof task !== "object") return {};
  return {
    id: task.id || null,
    workspaceId: task.workspaceId || task.workspace_id || null,
    title: task.title || task.text || "Untitled Task",
    details: task.details || task.description || "",
    date: task.date || task.dueDate || null,
    reminderTime: task.reminderTime || task.time || null,
    scheduledTime: task.scheduledTime || task.when || null,
    reminderChannels: Array.isArray(task.reminderChannels) ? task.reminderChannels : null,
    channels: Array.isArray(task.channels) ? task.channels : null,
    timezone: task.timezone || task.tz || null,
    goalId: task.goalId || null,
    goalTitle: task.goalTitle || null,
    goalTargetDate: task.goalTargetDate || null,
    metadata: typeof task.metadata === "object" ? task.metadata : null,
  };
}

router.post("/create", requireWorkspaceEditor, async (req, res) => {
  try {
    const { userId, options = {}, ...payload } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const workspaceId = selectWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });

    const task = await createTask(userId, { ...payload, workspaceId }, { ...options, workspaceId });
    return res.json({ success: true, task });
  } catch (err) {
    console.error("[TaskRoutes] create failed", err?.message || err);
    return res.status(500).json({ error: "Failed to create task" });
  }
});

router.post("/announce", requireWorkspaceEditor, requireVoiceFeature, async (req, res) => {
  try {
    const { userId, task, schedule = true, notificationOptions = {}, clientNow } = req.body || {};
    if (!userId || !task) return res.status(400).json({ error: "Missing userId or task" });
    const workspaceId = selectWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });

    const base = toTaskPayload(task);
    base.workspaceId = base.workspaceId || workspaceId;
    if (!base.title && base.id) {
      try {
        const snap = await db.collection("tasks").doc(String(base.id)).get();
        if (snap.exists) {
          const data = snap.data() || {};
          base.title = data.title || base.title || "Untitled Task";
          base.date = data.date || base.date || null;
          base.reminderTime = data.reminderTime || base.reminderTime || null;
          base.reminderChannels = Array.isArray(data.reminderChannels) ? data.reminderChannels : base.reminderChannels;
          base.channels = Array.isArray(data.channels) ? data.channels : base.channels;
        }
      } catch (err) {
        console.warn("[TaskRoutes] announce lookup failed", err?.message || err);
      }
    }

    try {
      await notifyTaskCreated(userId, [base], notificationOptions);
    } catch (err) {
      console.error("[TaskRoutes] notifyTaskCreated failed", err?.message || err);
    }

    let scheduled = null;
    if (schedule !== false) {
      scheduled = await scheduleTaskReminder(userId, base, task, {
        source: "task_sync",
        timezone: task?.timezone || task?.tz,
        clientNow,
        force: schedule === true,
      });
    }

    return res.json({
      success: true,
      scheduled: scheduled
        ? {
            id: scheduled.id || null,
            scheduledTime:
              scheduled.scheduledTime?.toISOString?.() || scheduled.scheduledTime || null,
          }
        : null,
    });
  } catch (err) {
    console.error("[TaskRoutes] announce failed", err?.message || err);
    return res.status(500).json({ error: "Failed to sync notifications" });
  }
});

export default router;
