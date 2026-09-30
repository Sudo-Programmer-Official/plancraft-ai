import dayjs from "../utils/dayjs.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { db } from "./firebaseAdmin.js";
import { notifyTaskCreated } from "./notificationService.js";
import { createReminderFromText } from "./reminderService.js";
import {
  ensureTaskNode,
  ensureDocNode,
  ensureChunkNode,
  createEdgeIfMissing,
  ensureRequirementNode,
} from "./knowledge/graphWriter.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const REMINDER_CHANNEL_ALLOW_LIST = ["pwa", "whatsapp", "email", "sms", "voice_call"];
const TASK_REPEAT_TYPE_VALUES = new Set(["daily", "weekly", "weekend", "monthly", "custom"]);

function toYMD(value) {
  try {
    if (!value) return dayjs().format("YYYY-MM-DD");
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return value.trim();
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return dayjs(date).format("YYYY-MM-DD");
    }
  } catch {
    /* noop */
  }
  return dayjs().format("YYYY-MM-DD");
}

function computeNextRecurringDate(dateYmd, repeat) {
  if (!repeat || !dateYmd) return null;
  const base = dayjs(String(dateYmd).trim());
  if (!base.isValid()) return null;
  if (repeat.type === "daily") return base.add(1, "day").format("YYYY-MM-DD");
  if (repeat.type === "weekly") return base.add(1, "week").format("YYYY-MM-DD");
  if (repeat.type === "weekend") {
    const dayOfWeek = base.day();
    if (dayOfWeek === 6 || dayOfWeek === 0) return base.add(7, "day").format("YYYY-MM-DD");
    return base.add(6 - dayOfWeek, "day").format("YYYY-MM-DD");
  }
  if (repeat.type === "monthly") return base.add(1, "month").format("YYYY-MM-DD");
  return base.add(repeat.intervalDays || 1, "day").format("YYYY-MM-DD");
}

function sanitizeString(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function normalizeTaskRepeat(value) {
  if (!value || typeof value !== "object") return null;
  const type = sanitizeString(value.type, "").toLowerCase();
  if (!TASK_REPEAT_TYPE_VALUES.has(type)) return null;
  if (type === "custom") {
    const intervalDays = Math.max(1, Math.min(365, Math.trunc(Number(value.intervalDays) || 0)));
    if (!intervalDays) return null;
    return { type: "custom", intervalDays };
  }
  return { type, intervalDays: null };
}

function normalizeReminderOffsetDays(value, fallback = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const next = Math.trunc(Number(value));
  if (!Number.isFinite(next)) return fallback;
  return Math.max(0, Math.min(next, 365));
}

function sanitizeReminderConfig(value, fallbackOffsetDays = null) {
  if (!value || typeof value !== "object") {
    const fallback = normalizeReminderOffsetDays(fallbackOffsetDays, null);
    if (fallback && fallback > 0) {
      return { offsetDays: fallback, includeOnDue: true };
    }
    return null;
  }
  const includeOnDue = value.includeOnDue !== false;
  const offsetDays = normalizeReminderOffsetDays(value.offsetDays, fallbackOffsetDays);
  const next = { includeOnDue };
  if (offsetDays && offsetDays > 0) next.offsetDays = offsetDays;
  return next;
}

function sanitizeRepeatMeta(value) {
  if (!value || typeof value !== "object") return null;
  const lastSpawnedDate = toYMD(value.lastSpawnedDate || value.nextDate || null);
  const lastSpawnedTaskId = sanitizeString(value.lastSpawnedTaskId || "", "");
  const advancedAt = toUtcIso(value.advancedAt || value.lastSpawnedAt || null, "UTC");
  const next = {};
  if (lastSpawnedDate) next.lastSpawnedDate = lastSpawnedDate;
  if (lastSpawnedTaskId) next.lastSpawnedTaskId = lastSpawnedTaskId;
  if (advancedAt) next.advancedAt = advancedAt;
  return Object.keys(next).length ? next : null;
}

function normalizeReminderChannels(...sources) {
  const set = new Set();
  for (const source of sources) {
    if (!source && source !== 0) continue;
    const list = Array.isArray(source) ? source : [source];
    for (const entry of list) {
      if (!entry && entry !== 0) continue;
      const normalized = String(entry).trim().toLowerCase();
      if (!normalized) continue;
      if (normalized === "voice" || normalized === "voice-call" || normalized === "call") {
        set.add("voice_call");
      } else if (normalized === "push" || normalized === "webpush" || normalized === "web-push") {
        set.add("pwa");
      } else {
        set.add(normalized);
      }
    }
  }
  const filtered = Array.from(set).filter((channel) => REMINDER_CHANNEL_ALLOW_LIST.includes(channel));
  return filtered.length ? filtered : null;
}

function normalizeTaskType(value) {
  const token = sanitizeString(value, "").toLowerCase();
  if (!token) return null;
  if (token === "wake_up" || token === "wake-up" || token === "alarm") return "wake_up";
  return token;
}

function coerceDate(input) {
  if (!input && input !== 0) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input?.toDate === "function") {
    try {
      const d = input.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  if (typeof input?.seconds === "number") {
    const d = new Date(input.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === "number") {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  try {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function toUtcIso(value, timezoneHint) {
  const date = coerceDate(value);
  if (date) return date.toISOString();

  if (typeof value !== "string") return null;
  const token = value.trim();
  if (!token) return null;

  try {
    if (/[zZ]|[+-]\d\d:?\d\d$/.test(token)) {
      const iso = new Date(token);
      if (!Number.isNaN(iso.getTime())) return iso.toISOString();
      const parsed = dayjs(token);
      if (parsed.isValid()) return parsed.utc().toISOString();
    }

    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(token) && timezoneHint) {
      const normalized = token.replace("T", " ").replace(/\.\d+/, "");
      const parsed = dayjs.tz(normalized, timezoneHint, true);
      if (parsed.isValid()) return parsed.utc().toISOString();
    }

    const fallback = new Date(token);
    if (!Number.isNaN(fallback.getTime())) return fallback.toISOString();
  } catch {
    /* noop */
  }
  return null;
}

function buildIsoFromDateTime(dateToken, timeToken, timezone) {
  const dateStr = String(dateToken || "").trim();
  const timeStr = String(timeToken || "").trim();
  if (!dateStr || !timeStr) return null;
  const tz = typeof timezone === "string" && timezone.trim() ? timezone.trim() : "UTC";

  try {
    const parsed = dayjs.tz(`${dateStr} ${timeStr}`, tz, true);
    if (parsed.isValid()) return parsed.utc().toISOString();
  } catch {
    /* noop */
  }

  try {
    const fallback = new Date(`${dateStr}T${timeStr}`);
    if (!Number.isNaN(fallback.getTime())) return fallback.toISOString();
  } catch {
    /* noop */
  }
  return null;
}

function resolveReminderTimezone(task = {}, payload = {}, overrides = {}) {
  const candidates = [
    payload.timezone,
    payload.tz,
    task.timezone,
    task.metadata?.timezone,
    task.metadata?.tz,
    overrides.timezone,
    process.env.DEFAULT_USER_TIMEZONE,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "UTC";
}

function resolveReminderIso(task = {}, payload = {}, timezone) {
  const tz = timezone || resolveReminderTimezone(task, payload, {});
  const directTokens = [
    payload.scheduledTime,
    payload.when,
    payload.reminderAt,
    task.scheduledTime,
  ];

  for (const token of directTokens) {
    const iso = toUtcIso(token, tz);
    if (iso) return iso;
  }

  const reminderTime =
    payload.reminderTime ||
    payload.time ||
    task.reminderTime ||
    null;
  const dateToken = payload.date || task.date || null;
  if (reminderTime && dateToken) {
    const iso = buildIsoFromDateTime(dateToken, reminderTime, tz);
    if (iso) return iso;
  }
  return null;
}

function shouldScheduleReminder(task = {}, payload = {}, options = {}) {
  if (options.force === true) return true;
  if (payload?.reminderEnabled === false || task?.reminderEnabled === false) return false;
  return Boolean(
    payload?.reminderTime ||
      payload?.time ||
      payload?.scheduledTime ||
      payload?.when ||
      payload?.reminderAt ||
      task?.reminderTime ||
      task?.scheduledTime
  );
}

export async function scheduleTaskReminder(userId, task, payload = {}, options = {}) {
  try {
    if (!userId || !task) return null;
    if (!shouldScheduleReminder(task, payload, options)) return null;

    const timezone = resolveReminderTimezone(task, payload, options);
    const iso = resolveReminderIso(task, payload, timezone);
    if (!iso) {
      console.warn("[TaskService] Unable to resolve reminder time for task", task?.id || payload?.id || "unknown");
      return null;
    }

    const channels = normalizeReminderChannels(
      payload.deliveryChannels,
      payload.reminderChannels,
      payload.channels,
      task.deliveryChannels,
      task.reminderChannels,
      task.channels
    );

    const reminder = await createReminderFromText(
      task.title || payload.title || "Task Reminder",
      userId,
      channels || undefined,
      {
        scheduledTime: iso,
        timezone,
        taskId: task.id || payload.id || null,
        workspaceId: task.workspaceId || payload.workspaceId || options.workspaceId || null,
        source: options.source || "task_create",
        now: options.clientNow,
        context: options.context || payload.context || null,
        type: normalizeTaskType(payload.type || task.type || null),
        deliveryChannels: channels || undefined,
      }
    );

    const scheduledIso =
      reminder?.scheduledTime?.toISOString?.() ||
      reminder?.scheduledTime ||
      iso;
    console.log(
      `[Scheduler] Reminder scheduled for ${scheduledIso} (task ${task?.id || payload?.id || "n/a"})`
    );
    return reminder;
  } catch (err) {
    console.error("[TaskService] scheduleTaskReminder failed", err?.message || err);
    return null;
  }
}

export async function advanceRecurringTask(userId, task = {}, options = {}) {
  const repeat = normalizeTaskRepeat(task?.repeat);
  if (!repeat || !task?.completed) return null;

  const sourceDate = toYMD(task?.date || task?.dueDate || null);
  const nextDate = computeNextRecurringDate(sourceDate, repeat);
  if (!nextDate) return null;

  const repeatMeta = sanitizeRepeatMeta(task?.repeatMeta) || {};
  if (repeatMeta?.lastSpawnedDate === nextDate) return null;

  const timezone = resolveReminderTimezone(task, task, options);
  const reminderOffsetDays = normalizeReminderOffsetDays(task?.reminderOffsetDays, 0) || 0;
  const reminderTime = sanitizeString(task?.reminderTime || task?.time || "", "") || null;
  const reminderDate = reminderOffsetDays > 0 ? dayjs(nextDate).subtract(reminderOffsetDays, "day").format("YYYY-MM-DD") : nextDate;
  const scheduledTime = reminderTime ? buildIsoFromDateTime(reminderDate, reminderTime, timezone) : null;

  const nextPayload = {
    title: task?.title || "Recurring task",
    details: task?.details || "",
    category: task?.category || "Uncategorized",
    date: nextDate,
    reminderTime,
    scheduledTime,
    reminderChannels: Array.isArray(task?.reminderChannels) ? task.reminderChannels : null,
    channels: Array.isArray(task?.channels) ? task.channels : Array.isArray(task?.reminderChannels) ? task.reminderChannels : null,
    timezone,
    attachments: Array.isArray(task?.attachments) ? task.attachments : [],
    link: task?.link || null,
    priority: task?.priority ?? null,
    duration: Number.isFinite(task?.duration) ? task.duration : null,
    estimate_minutes: Number.isFinite(task?.estimate_minutes) ? task.estimate_minutes : null,
    source: task?.source || "recurring",
    repeat,
    reminderOffsetDays,
    reminder: sanitizeReminderConfig(task?.reminder, reminderOffsetDays),
    type: normalizeTaskType(task?.type || null),
    deliveryChannels: normalizeReminderChannels(
      task?.deliveryChannels,
      task?.reminderChannels,
      task?.channels,
    ),
    metadata: {
      ...(task?.metadata && typeof task.metadata === "object" ? task.metadata : {}),
      recurringOriginTaskId: task?.id || null,
      recurringGeneratedAt: new Date().toISOString(),
      recurringPreviousDate: sourceDate,
    },
    workspaceId: task?.workspaceId || options.workspaceId || null,
  };

  const saved = await createTask(userId, nextPayload, {
    workspaceId: task?.workspaceId || options.workspaceId || null,
    origin: "recurring_task",
  });

  const nextRepeatMeta = {
    ...repeatMeta,
    lastSpawnedDate: nextDate,
    lastSpawnedTaskId: saved?.id || null,
    advancedAt: new Date().toISOString(),
  };

  await db.collection("tasks").doc(String(task.id)).set(
    {
      repeatMeta: nextRepeatMeta,
      updatedAt: new Date(),
    },
    { merge: true },
  );

  return saved;
}

export async function createTask(userId, payload = {}, options = {}) {
  const uid = sanitizeString(String(userId || ""), "").trim();
  if (!uid) throw new Error("Missing userId for task creation");

  let workspaceId = payload.workspaceId || payload.workspace_id || options.workspaceId || null;
  if (!workspaceId && typeof options.resolveWorkspaceId === "function") {
    try {
      workspaceId = await options.resolveWorkspaceId(uid, payload, options);
    } catch (err) {
      console.warn("[TaskService] workspace resolver failed", err?.message || err);
    }
  }
  if (!workspaceId) {
    throw new Error("workspaceId is required for task creation");
  }

  const now = new Date();
  const title =
    sanitizeString(payload.title, "") ||
    sanitizeString(payload.label, "") ||
    "Untitled Task";

  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? payload.metadata
      : { origin: options.origin || "planner-assistant" };
  const repeat = normalizeTaskRepeat(payload.repeat);
  const reminderOffsetDays = normalizeReminderOffsetDays(payload.reminderOffsetDays, null);
  const repeatMeta = sanitizeRepeatMeta(payload.repeatMeta);
  const reminder = sanitizeReminderConfig(payload.reminder, reminderOffsetDays);

  const doc = {
    title: title.slice(0, 160),
    details: sanitizeString(payload.details || payload.description || "", "").slice(0, 1000),
    completed: Boolean(payload.completed),
    category: sanitizeString(payload.category || payload.categoryName || "Uncategorized", "Uncategorized"),
    logs: Array.isArray(payload.logs) ? payload.logs.slice(0, 10) : [],
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    date: toYMD(payload.date || payload.dueDate),
    reminderTime: payload.reminderTime || payload.time || null,
    channels: Array.isArray(payload.channels) ? payload.channels : null,
    reminderChannels: Array.isArray(payload.reminderChannels)
      ? payload.reminderChannels
      : Array.isArray(payload.channels)
        ? payload.channels
        : null,
    order: Number.isFinite(payload.order) ? payload.order : null,
    link: sanitizeString(payload.link || "", ""),
    priority: payload.priority || null,
    duration: Number.isFinite(payload.duration) ? payload.duration : null,
    estimate_minutes: Number.isFinite(payload.estimate_minutes) ? payload.estimate_minutes : null,
    scheduledTime: payload.scheduledTime || null,
    metadata,
    timezone: payload.timezone || options.timezone || null,
    source: sanitizeString(payload.source || options.origin || "planner-assistant", "planner-assistant"),
    parentTaskId: sanitizeString(payload.parentTaskId || "", "") || null,
    parentTaskTitle: sanitizeString(payload.parentTaskTitle || "", "").slice(0, 160) || null,
    repeat,
    reminderOffsetDays,
    reminder,
    repeatMeta,
    timeHint: sanitizeString(payload.timeHint || payload.time_hint || "", "") || null,
    timeRelation:
      sanitizeString(payload.timeRelation || payload.relation || payload.time_relation || "", "") || null,
    gapMinutes: Number.isFinite(payload.gapMinutes) ? payload.gapMinutes : null,
    timeConfidence: Number.isFinite(payload.timeConfidence) ? payload.timeConfidence : null,
    timeMeta: payload.timeMeta && typeof payload.timeMeta === "object" ? payload.timeMeta : null,
    type: normalizeTaskType(payload.type || null),
    deliveryChannels: normalizeReminderChannels(
      payload.deliveryChannels,
      payload.reminderChannels,
      payload.channels,
    ),
    userId: uid,
    workspaceId,
    createdAt: now,
    updatedAt: now,
  };

  const linkedGoalId = sanitizeString(
    payload.goalId ||
      (typeof payload.goal === "object" ? payload.goal?.id || payload.goal?.goalId : null) ||
      "",
    "",
  );
  if (linkedGoalId) doc.goalId = linkedGoalId;
  const linkedGoalTitle = sanitizeString(
    payload.goalTitle || (typeof payload.goal === "object" ? payload.goal?.title : null) || "",
    "",
  );
  if (linkedGoalTitle) doc.goalTitle = linkedGoalTitle;
  const linkedGoalTarget = payload.goalTargetDate || payload.goal?.targetDate || null;
  if (linkedGoalTarget) doc.goalTargetDate = linkedGoalTarget;

  if (!doc.link) delete doc.link;
  if (!doc.scheduledTime) delete doc.scheduledTime;
  if (!doc.channels) delete doc.channels;
  if (!doc.reminderTime) delete doc.reminderTime;
  if (!doc.reminderChannels) delete doc.reminderChannels;
  if (!doc.priority) delete doc.priority;
  if (!doc.duration) delete doc.duration;
  if (!doc.estimate_minutes) delete doc.estimate_minutes;
  if (!doc.timezone) delete doc.timezone;
  if (!doc.repeat) delete doc.repeat;
  if (doc.reminderOffsetDays === null || doc.reminderOffsetDays === undefined || doc.reminderOffsetDays <= 0) delete doc.reminderOffsetDays;
  if (!doc.reminder) delete doc.reminder;
  if (!doc.repeatMeta) delete doc.repeatMeta;
  if (!doc.timeHint) delete doc.timeHint;
  if (!doc.timeRelation) delete doc.timeRelation;
  if (!doc.gapMinutes && doc.gapMinutes !== 0) delete doc.gapMinutes;
  if (!doc.timeConfidence && doc.timeConfidence !== 0) delete doc.timeConfidence;
  if (!doc.timeMeta) delete doc.timeMeta;
  if (!doc.type) delete doc.type;
  if (!doc.parentTaskId) delete doc.parentTaskId;
  if (!doc.parentTaskTitle) delete doc.parentTaskTitle;
  if (!doc.deliveryChannels) delete doc.deliveryChannels;
  if (!doc.goalId) delete doc.goalId;
  if (!doc.goalTitle) delete doc.goalTitle;
  if (!doc.goalTargetDate) delete doc.goalTargetDate;

  const ref = await db.collection("tasks").add(doc);
  const task = { id: ref.id, ...doc };

  let scheduledReminder = null;
  if (options.skipReminder !== true) {
    scheduledReminder = await scheduleTaskReminder(uid, task, payload, {
      source: options.origin || "task_create",
      timezone: options.timezone,
      force: options.forceReminder === true,
    });
  }

  if (!options.silent) {
    try {
      const notificationOptions = options.notificationOptions || {};
      await notifyTaskCreated(uid, [task], notificationOptions);
    } catch (err) {
      console.error("[TaskService] sendTaskNotification failed", err?.message || err);
    }
  }

  // Fire-and-forget graph population (V2.2)
  try {
    await ensureTaskNode({
      workspaceId,
      taskId: ref.id,
      title: task.title,
      createdBy: uid,
    });
    const sourceRefs = Array.isArray(metadata?.sourceRefs) ? metadata.sourceRefs : [];
    const requirementId = metadata?.requirementId || null;
    if (requirementId) {
      await ensureRequirementNode({
        workspaceId,
        requirementId,
        text: metadata?.requirementText || metadata?.requirementTitle || null,
        createdBy: uid,
      });
      const reqNodeId = `req_${requirementId}`;
      const taskNodeId = `task_${ref.id}`;
      await createEdgeIfMissing({
        workspaceId,
        fromNodeId: taskNodeId,
        toNodeId: reqNodeId,
        relationType: "implements",
        confidence: 0.7,
      });
      const firstDoc = sourceRefs.find((r) => r?.docId);
      if (firstDoc?.docId) {
        const docNodeId = firstDoc.docId;
        await ensureDocNode({ workspaceId, docId: docNodeId, title: null, source: "doc" });
        await createEdgeIfMissing({
          workspaceId,
          fromNodeId: reqNodeId,
          toNodeId: docNodeId,
          relationType: "derived_from",
          confidence: Number(firstDoc.score) || 0.5,
        });
      }
    }
    if (sourceRefs.length) {
      const taskNodeId = `task_${ref.id}`;
      for (const refEntry of sourceRefs) {
        if (!refEntry) continue;
        const docId = refEntry.docId || null;
        const chunkId = refEntry.chunkId || null;
        const targetNodeId = chunkId ? `chunk_${chunkId}` : docId;
        if (!targetNodeId) continue;
        if (chunkId) {
          await ensureChunkNode({
            workspaceId,
            chunkId,
            docId: docId || null,
            heading: refEntry.heading || null,
          });
        } else if (docId) {
          await ensureDocNode({ workspaceId, docId, title: null, source: "doc" });
        }
        await createEdgeIfMissing({
          workspaceId,
          fromNodeId: taskNodeId,
          toNodeId: targetNodeId,
          relationType: "derived_from",
          confidence: Number(refEntry.score) || 0.5,
          metadata: {
            docId,
            chunkId,
          },
        });
      }
    }
  } catch (err) {
    console.warn("[TaskService] graph population skipped", err?.message || err);
  }

  return scheduledReminder
    ? { ...task, scheduledReminder: { id: scheduledReminder.id, scheduledTime: scheduledReminder.scheduledTime } }
    : task;
}
