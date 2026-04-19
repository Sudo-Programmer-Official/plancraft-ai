import dayjs from "../utils/dayjs.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { db } from "./firebaseAdmin.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const HABIT_COLLECTION = "habit_tracker";
const DEFAULT_CATEGORY = "General";

function isEnabled() {
  const flag = String(process.env.ENABLE_HABITS || "").trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

function normalizeCategory(raw) {
  if (!raw && raw !== 0) return DEFAULT_CATEGORY;
  const text = String(raw).trim();
  return text.length ? text.slice(0, 60) : DEFAULT_CATEGORY;
}

function resolveTimezone(task = {}, options = {}) {
  const candidates = [
    options.timezone,
    task.timezone,
    task.metadata?.timezone,
    process.env.DEFAULT_USER_TIMEZONE,
    "UTC",
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "UTC";
}

function toDate(value) {
  if (!value && value !== 0) return new Date();
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  try {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  } catch {
    /* noop */
  }
  return new Date();
}

function buildDayKey(date, timezoneId) {
  try {
    const tz = timezoneId || "UTC";
    return dayjs(date).tz(tz).format("YYYY-MM-DD");
  } catch {
    return dayjs(date).utc().format("YYYY-MM-DD");
  }
}

export async function recordCompletion(userId, task = {}, options = {}) {
  if (!isEnabled()) return null;
  const uid = String(userId || "").trim();
  if (!uid) return null;

  const taskId = String(task?.id || task?.taskId || "").trim();
  if (!taskId) return null;

  const completedAt = toDate(options.completedAt || new Date());
  const timezoneId = resolveTimezone(task, options);
  const dayKey = buildDayKey(completedAt, timezoneId);
  const docId = `${uid}_${taskId}_${dayKey}`;
  const category = normalizeCategory(task?.category);

  const payload = {
    userId: uid,
    taskId,
    category,
    status: "done",
    day: dayKey,
    completionTime: completedAt.toISOString(),
    timezone: timezoneId,
    updatedAt: new Date().toISOString(),
  };

  const collection = db.collection(HABIT_COLLECTION);
  const docRef = collection.doc(docId);

  try {
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);
      if (!snapshot.exists) {
        tx.set(docRef, {
          ...payload,
          createdAt: payload.updatedAt,
          source: options.source || "task_completion",
        });
        return;
      }

      const existing = snapshot.data() || {};
      if (existing.status === "done") {
        return;
      }

      tx.set(docRef, payload, { merge: true });
    });
    console.log("[HabitTracker] logged completion", {
      userId: uid,
      taskId,
      day: dayKey,
      source: options.source || "unknown",
    });
    return { id: docId, ...payload };
  } catch (err) {
    console.error("[HabitService] recordCompletion failed", err?.message || err);
    return null;
  }
}

export function habitsEnabled() {
  return isEnabled();
}
