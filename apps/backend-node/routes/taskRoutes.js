import express from "express";
import { requireAuth, ensureUserMatches } from "../middleware/auth.js";
import { requireWorkspaceRole } from "../middleware/workspace.js";
import { canUseFeature, FEATURE_KEYS } from "../services/entitlements.js";
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

async function listTasksForScope({ workspaceId, userId, date = null, startDate = null, endDate = null }) {
  async function runQuery({ useLegacy = false } = {}) {
    let ref = db.collection("tasks");
    ref = ref.where("workspaceId", "==", useLegacy ? null : workspaceId);
    if (useLegacy) ref = ref.where("userId", "==", userId);
    if (date) {
      ref = ref.where("date", "==", date);
    } else {
      if (startDate) ref = ref.where("date", ">=", startDate);
      if (endDate) ref = ref.where("date", "<=", endDate);
    }
    const snap = await ref.get();
    return snap.docs.map((docSnap) => mapTaskDoc(docSnap, useLegacy ? { legacyWorkspace: true } : {}));
  }

  const [primary, legacy] = await Promise.all([
    runQuery({ useLegacy: false }),
    userId ? runQuery({ useLegacy: true }).catch(() => []) : Promise.resolve([]),
  ]);

  const deduped = new Map();
  [...primary, ...legacy].forEach((task) => {
    if (task?.id) deduped.set(task.id, task);
  });
  return Array.from(deduped.values());
}

function stripVoiceChannels(channels, voiceAllowed) {
  if (voiceAllowed) return channels;
  if (!Array.isArray(channels)) return null;
  const filtered = channels
    .map((c) => String(c || "").trim())
    .filter(Boolean)
    .filter((c) => {
      const normalized = c.toLowerCase();
      return (
        normalized !== "voice" &&
        normalized !== "voice_call" &&
        normalized !== "voice-call" &&
        normalized !== "call" &&
        normalized !== "phone"
      );
    });
  return filtered.length ? filtered : null;
}

function sanitizeVoiceChannels(task, voiceAllowed) {
  if (voiceAllowed || !task || typeof task !== "object") return task;
  const next = { ...task };
  if ("channels" in next) next.channels = stripVoiceChannels(next.channels, voiceAllowed);
  if ("reminderChannels" in next) next.reminderChannels = stripVoiceChannels(next.reminderChannels, voiceAllowed);
  return next;
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
    reminderChannels: Array.isArray(task.reminderChannels) ? task.reminderChannels : null,
    channels: Array.isArray(task.channels) ? task.channels : null,
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

    const userId = String(req.query?.userId || req.user?.uid || "").trim();
    const date = normalizeYmd(req.query?.date || null);
    const startDate = normalizeYmd(req.query?.startDate || req.query?.start || null);
    const endDate = normalizeYmd(req.query?.endDate || req.query?.end || null);

    const items = await listTasksForScope({
      workspaceId,
      userId,
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
    base = sanitizeVoiceChannels(base, voiceAllowed);
    if (!voiceAllowed) {
      console.info("[TaskRoutes] voice stripped", {
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
