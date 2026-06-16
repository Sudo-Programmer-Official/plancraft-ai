import express from "express";
import { requireAuth, ensureUserMatches } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/workspace.js";
import { canUseFeature, FEATURE_KEYS } from "../services/entitlements.js";
import { checkUserPlanUsage } from "../services/planService.js";
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

const requireWorkspaceEditor = requireWorkspaceRole(["editor", "admin", "owner"], {
  workspaceIdSelector: selectWorkspaceId,
});
const requireWorkspaceViewer = requireWorkspaceRole(["viewer", "editor", "admin", "owner"], {
  workspaceIdSelector: selectWorkspaceId,
});

function normalizeYmd(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function normalizeTaskJson(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((entry) => normalizeTaskJson(entry));
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeTaskJson(entry)]),
    );
  }
  return value;
}

function mapTaskDoc(docSnap, extra = {}) {
  return {
    id: docSnap.id,
    ...normalizeTaskJson(docSnap.data()),
    ...extra,
  };
}

async function listTasksForScope({ workspaceId, date = null, startDate = null, endDate = null }) {
  let ref = db.collection("tasks").where("workspaceId", "==", workspaceId);
  if (date) {
    ref = ref.where("date", "==", date);
  } else {
    if (startDate) ref = ref.where("date", ">=", startDate);
    if (endDate) ref = ref.where("date", "<=", endDate);
  }
  const snap = await ref.get();
  return snap.docs.map((docSnap) => mapTaskDoc(docSnap));
}

function toTaskPayload(task = {}) {
  if (!task || typeof task !== "object") return {};
  return {
    id: task.id || null,
    workspaceId: task.workspaceId || task.workspace_id || null,
    title: task.title || task.text || "Untitled Task",
    details: task.details || task.description || "",
    completed: task.completed ?? false,
    category: task.category || task.categoryName || "Uncategorized",
    logs: Array.isArray(task.logs) ? task.logs : [],
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
    date: task.date || task.dueDate || null,
    reminderTime: task.reminderTime || task.time || null,
    scheduledTime: task.scheduledTime || task.when || null,
    repeat: task.repeat && typeof task.repeat === "object" ? task.repeat : null,
    reminder: task.reminder && typeof task.reminder === "object" ? task.reminder : null,
    reminderOffsetDays: Number.isFinite(task.reminderOffsetDays) ? task.reminderOffsetDays : null,
    repeatMeta: task.repeatMeta && typeof task.repeatMeta === "object" ? task.repeatMeta : null,
    reminderChannels: Array.isArray(task.reminderChannels) ? task.reminderChannels : null,
    channels: Array.isArray(task.channels) ? task.channels : null,
    deliveryChannels: Array.isArray(task.deliveryChannels) ? task.deliveryChannels : null,
    type: task.type || null,
    timezone: task.timezone || task.tz || null,
    order: Number.isFinite(task.order) ? task.order : null,
    link: task.link || null,
    priority: task.priority ?? null,
    duration: Number.isFinite(task.duration) ? task.duration : null,
    source: task.source || null,
    estimate_minutes: Number.isFinite(task.estimate_minutes) ? task.estimate_minutes : null,
    timeHint: task.timeHint || task.time_hint || null,
    timeRelation: task.timeRelation || task.relation || task.time_relation || null,
    gapMinutes: Number.isFinite(task.gapMinutes) ? task.gapMinutes : null,
    timeConfidence: Number.isFinite(task.timeConfidence) ? task.timeConfidence : null,
    timeMeta: typeof task.timeMeta === "object" && task.timeMeta ? task.timeMeta : null,
    goalId: task.goalId || null,
    goalTitle: task.goalTitle || null,
    goalTargetDate: task.goalTargetDate || null,
    metadata: typeof task.metadata === "object" ? task.metadata : null,
  };
}

router.get("/", requireWorkspaceViewer, async (req, res) => {
  try {
    const workspaceId = selectWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });

    const date = normalizeYmd(req.query?.date || null);
    const startDate = normalizeYmd(req.query?.startDate || req.query?.start || null);
    const endDate = normalizeYmd(req.query?.endDate || req.query?.end || null);

    const items = await listTasksForScope({
      workspaceId,
      date,
      startDate,
      endDate,
    });

    return res.json({ success: true, items });
  } catch (err) {
    console.error("[TaskRoutes] list failed", err?.message || err);
    return res.status(500).json({ error: "Failed to list tasks" });
  }
});

router.patch("/:taskId/completion", requireWorkspaceViewer, async (req, res) => {
  try {
    const workspaceId = selectWorkspaceId(req);
    const taskId = String(req.params?.taskId || "").trim();
    const completed = req.body?.completed === true;
    const completedAtRaw = req.body?.completedAt || null;

    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    if (!taskId) return res.status(400).json({ error: "taskId is required" });

    const ref = db.collection("tasks").doc(taskId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Task not found" });

    const data = snap.data() || {};
    if (String(data.workspaceId || "") !== workspaceId) {
      return res.status(403).json({ error: "Task does not belong to the active workspace" });
    }

    const completedAt =
      completed && completedAtRaw
        ? new Date(completedAtRaw)
        : completed
          ? new Date()
          : null;

    const updates = {
      completed,
      updatedAt: new Date(),
    };
    if (completed && completedAt && !Number.isNaN(completedAt.getTime())) {
      updates.completedAt = completedAt;
    }
    if (!completed) {
      updates.completedAt = null;
    }

    await ref.set(updates, { merge: true });
    const refreshed = await ref.get();
    return res.json({ success: true, task: mapTaskDoc(refreshed) });
  } catch (err) {
    console.error("[TaskRoutes] completion update failed", err?.message || err);
    return res.status(500).json({ error: "Failed to update task completion" });
  }
});

router.post("/create", requireWorkspaceEditor, async (req, res) => {
  try {
    const { userId, options = {}, ...payload } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const workspaceId = selectWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });

    const taskUsage = await checkUserPlanUsage(userId, "tasks");
    if (!taskUsage?.ok) {
      return res.status(403).json({
        error: "Daily task limit reached. Upgrade to Premium to continue.",
        code: "task_limit_reached",
        details: taskUsage?.details || null,
      });
    }

    const task = await createTask(userId, { ...payload, workspaceId }, { ...options, workspaceId });
    return res.json({ success: true, task });
  } catch (err) {
    console.error("[TaskRoutes] create failed", err?.message || err);
    return res.status(500).json({ error: "Failed to create task" });
  }
});

router.post("/announce", requireWorkspaceEditor, async (req, res) => {
  try {
    const { userId, task, schedule = true, notificationOptions = {}, clientNow } = req.body || {};
    if (!userId || !task) return res.status(400).json({ error: "Missing userId or task" });
    const workspaceId = selectWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });

    // Allow non-voice notifications even if the workspace is not entitled to voice reminders.
    const role = req.workspaceRole || req.workspaceMembership?.role || null;
    const voiceAllowed = canUseFeature({ workspace: req.workspace, userRole: role }, FEATURE_KEYS.voiceReminders);

    let base = toTaskPayload(task);
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
    if (!voiceAllowed) {
      console.info("[TaskRoutes] workspace voice entitlement unavailable; delivery quota will decide", {
        workspaceId,
        userId,
        taskId: base?.id || task?.id || null,
      });
    }
    const reminderPayload = base;

    try {
      await notifyTaskCreated(userId, [base], notificationOptions);
    } catch (err) {
      console.error("[TaskRoutes] notifyTaskCreated failed", err?.message || err);
    }

    let scheduled = null;
    if (schedule !== false) {
      scheduled = await scheduleTaskReminder(userId, base, reminderPayload, {
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
