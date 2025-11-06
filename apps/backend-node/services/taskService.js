import dayjs from "dayjs";
import { db } from "./firebaseAdmin.js";
import { notifyTaskCreated } from "./notificationService.js";

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

  const ref = await db.collection("tasks").add(doc);
  const task = { id: ref.id, ...doc };

  if (!options.silent) {
    try {
      const notificationOptions = options.notificationOptions || {};
      await notifyTaskCreated(uid, [task], notificationOptions);
    } catch (err) {
      console.error("[TaskService] sendTaskNotification failed", err?.message || err);
    }
  }

  return task;
}
