import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { db } from "./firebaseAdmin.js";
import { notifyTaskCreated } from "./notificationService.js";
import { createReminderFromText } from "./reminderService.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const REMINDER_CHANNEL_ALLOW_LIST = ["pwa", "whatsapp", "email", "sms", "voice_call"];

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

function sanitizeString(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
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
      payload.reminderChannels,
      payload.channels,
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
        source: options.source || "task_create",
        now: options.clientNow,
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

export async function createTask(userId, payload = {}, options = {}) {
  const uid = sanitizeString(String(userId || ""), "").trim();
  if (!uid) throw new Error("Missing userId for task creation");

  const now = new Date();
  const title =
    sanitizeString(payload.title, "") ||
    sanitizeString(payload.label, "") ||
    "Untitled Task";

  const metadata =
    payload.metadata && typeof payload.metadata === "object"
      ? payload.metadata
      : { origin: options.origin || "planner-assistant" };

  const doc = {
    title: title.slice(0, 160),
    details: sanitizeString(payload.details || payload.description || "", "").slice(0, 1000),
    completed: Boolean(payload.completed),
    category: sanitizeString(payload.category || payload.categoryName || "Uncategorized", "Uncategorized"),
    logs: Array.isArray(payload.logs) ? payload.logs.slice(0, 10) : [],
    attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
    date: toYMD(payload.date || payload.dueDate),
    reminderTime: payload.reminderTime || payload.time || null,
    reminderChannels: Array.isArray(payload.reminderChannels)
      ? payload.reminderChannels
      : Array.isArray(payload.channels)
        ? payload.channels
        : null,
    order: Number.isFinite(payload.order) ? payload.order : null,
    link: sanitizeString(payload.link || "", ""),
    priority: payload.priority || null,
    duration: Number.isFinite(payload.duration) ? payload.duration : null,
    scheduledTime: payload.scheduledTime || null,
    metadata,
    timezone: payload.timezone || options.timezone || null,
    source: sanitizeString(payload.source || options.origin || "planner-assistant", "planner-assistant"),
    userId: uid,
    createdAt: now,
    updatedAt: now,
  };

  if (!doc.link) delete doc.link;
  if (!doc.scheduledTime) delete doc.scheduledTime;
  if (!doc.reminderTime) delete doc.reminderTime;
  if (!doc.reminderChannels) delete doc.reminderChannels;
  if (!doc.priority) delete doc.priority;
  if (!doc.duration) delete doc.duration;
  if (!doc.timezone) delete doc.timezone;

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

  return scheduledReminder
    ? { ...task, scheduledReminder: { id: scheduledReminder.id, scheduledTime: scheduledReminder.scheduledTime } }
    : task;
}
