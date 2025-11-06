import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { db } from "./firebaseAdmin.js";
import { handleTextReminder } from "./textHandler.js";
import { createTask } from "./taskService.js";
import { recordCompletion } from "./habitService.js";
import { extractReminderTime as extractReminderTimeAI } from "./openaiService.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = "UTC";
const RELATIVE_UNIT_MAP = {
  minute: "minute",
  minutes: "minute",
  min: "minute",
  mins: "minute",
  m: "minute",
  hour: "hour",
  hours: "hour",
  hr: "hour",
  hrs: "hour",
  h: "hour",
  day: "day",
  days: "day",
  d: "day",
};

function asIso(value) {
  try {
    if (!value) return null;
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

async function fetchRecentTasks(uid, limit = 14) {
  const tasks = [];
  try {
    const snap = await db
      .collection("tasks")
      .where("userId", "==", String(uid))
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();

    snap.forEach((doc) => {
      const data = doc.data() || {};
      tasks.push({
        id: doc.id,
        title: data.title || "",
        date: data.date || null,
        completed: !!data.completed,
        category: data.category || "Uncategorized",
        reminderTime: data.reminderTime || null,
        priority: data.priority || null,
        updatedAt: asIso(data.updatedAt) || asIso(data.createdAt),
      });
    });
    return tasks;
  } catch (err) {
    console.warn("[PlannerAssistant] fetchRecentTasks primary query failed", err?.message || err);
  }

  try {
    const snap = await db
      .collection("tasks")
      .where("userId", "==", String(uid))
      .limit(limit)
      .get();
    snap.forEach((doc) => {
      const data = doc.data() || {};
      tasks.push({
        id: doc.id,
        title: data.title || "",
        date: data.date || null,
        completed: !!data.completed,
        category: data.category || "Uncategorized",
        reminderTime: data.reminderTime || null,
        priority: data.priority || null,
        updatedAt: asIso(data.updatedAt) || asIso(data.createdAt),
      });
    });
    tasks.sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  } catch (err) {
    console.warn("[PlannerAssistant] fetchRecentTasks fallback failed", err?.message || err);
  }
  return tasks.slice(0, limit);
}

async function fetchUpcomingReminders(uid, limit = 10) {
  try {
    const snap = await db
      .collection("reminders")
      .where("userId", "==", String(uid))
      .orderBy("scheduledTime", "asc")
      .limit(limit)
      .get();

    const reminders = [];
    snap.forEach((doc) => {
      const data = doc.data() || {};
      reminders.push({
        id: doc.id,
        text: data.text || data.task || "",
        scheduledTime: asIso(data.scheduledTime),
        status: data.status || "scheduled",
        channels: data.channels || [],
        taskId: data.taskId || null,
      });
    });
    return reminders;
  } catch (err) {
    console.warn("[PlannerAssistant] fetchUpcomingReminders failed", err?.message || err);
    try {
      const fallback = await db
        .collection("reminders")
        .where("userId", "==", String(uid))
        .limit(limit)
        .get();
      const reminders = [];
      fallback.forEach((doc) => {
        const data = doc.data() || {};
        reminders.push({
          id: doc.id,
          text: data.text || data.task || "",
          scheduledTime: asIso(data.scheduledTime),
          status: data.status || "scheduled",
          channels: data.channels || [],
          taskId: data.taskId || null,
        });
      });
      reminders.sort((a, b) => {
        const aTime = a.scheduledTime ? new Date(a.scheduledTime).getTime() : Infinity;
        const bTime = b.scheduledTime ? new Date(b.scheduledTime).getTime() : Infinity;
        return aTime - bTime;
      });
      return reminders.slice(0, limit);
    } catch (fallbackErr) {
      console.warn("[PlannerAssistant] fetchUpcomingReminders fallback failed", fallbackErr?.message || fallbackErr);
      return [];
    }
  }
}

async function fetchRecentReports(uid, limit = 5) {
  try {
    const snap = await db
      .collection("reports")
      .where("userId", "==", String(uid))
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const reports = [];
    snap.forEach((doc) => {
      const data = doc.data() || {};
      reports.push({
        id: doc.id,
        period: data.period || "",
        start: data.start || null,
        end: data.end || null,
        metrics: data.metrics || {},
        urls: data.urls || {},
        createdAt: asIso(data.createdAt),
      });
    });
    return reports;
  } catch (err) {
    console.warn("[PlannerAssistant] fetchRecentReports failed", err?.message || err);
    return [];
  }
}

async function fetchRecentNotes(uid, limit = 6) {
  try {
    const snap = await db
      .collection("journalEntries")
      .where("userId", "==", String(uid))
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const notes = [];
    snap.forEach((doc) => {
      const data = doc.data() || {};
      notes.push({
        id: doc.id,
        title: data.title || "",
        mood: data.mood || null,
        summary: (data.summary || data.text || "").slice(0, 320),
        createdAt: asIso(data.createdAt),
      });
    });
    return notes;
  } catch (err) {
    console.warn("[PlannerAssistant] fetchRecentNotes failed", err?.message || err);
    return [];
  }
}

function normalizeIdToken(value) {
  if (value === undefined || value === null) return null;
  const token = String(value).trim();
  return token.length ? token : null;
}

function normalizeTitleToken(value) {
  if (!value && value !== 0) return null;
  return String(value).trim().toLowerCase();
}

function findTasksMatchingText(text, taskList = []) {
  if (!text || !Array.isArray(taskList)) return [];
  const haystack = String(text).toLowerCase();
  if (!haystack) return [];
  const significantTokens = new Set(
    haystack
      .replace(/[^a-z0-9\s]/gi, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3),
  );

  return taskList.filter((task) => {
    const title = String(task?.title || "").toLowerCase().trim();
    if (!title) return false;
    if (haystack.includes(title)) return true;
    const tokens = title.split(/\s+/).filter((token) => token.length >= 3);
    if (!tokens.length) return false;
    return tokens.some((token) => significantTokens.has(token));
  });
}

function formatDateLabel(value) {
  if (!value) return null;
  try {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      const parsed = dayjs(value.trim());
      if (parsed.isValid()) return parsed.format("MMM D");
    }
    const parsed = dayjs(value);
    if (parsed.isValid()) return parsed.format("MMM D");
  } catch {
    /* noop */
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${m}/${d}/${y}`;
  }
  return String(value);
}

function resolveStatusFilter(token) {
  const normalized = normalizeTitleToken(token);
  if (normalized === "done" || normalized === "completed" || normalized === "complete") return "completed";
  if (normalized === "all" || normalized === "any") return "all";
  return "open";
}

function deriveRelativeReminderIso(message, timezoneId, baseIso) {
  if (!message) return null;
  const normalized = String(message).toLowerCase();
  if (!/\b(in|after)\s+\d+/.test(normalized)) return null;

  const matches = Array.from(
    normalized.matchAll(/\b(?:in|after)\s+(\d+)\s*(minute|minutes|min|mins|m|hour|hours|hr|hrs|h|day|days|d)\b/g),
  );
  if (!matches.length) return null;

  const tz = timezoneId || DEFAULT_TIMEZONE;
  let base = baseIso ? dayjs(baseIso) : dayjs();
  if (!base.isValid()) base = dayjs();
  let candidate = base.tz(tz);
  matches.forEach((match) => {
    const amount = Number.parseInt(match[1], 10);
    const unitToken = match[2];
    const unit = RELATIVE_UNIT_MAP[unitToken] || "minute";
    if (Number.isFinite(amount) && amount > 0) {
      candidate = candidate.add(amount, unit);
    }
  });
  if (!candidate.isValid()) return null;
  const baseTz = base.tz(tz);
  if (candidate.isBefore(baseTz)) {
    candidate = candidate.add(1, "minute");
  }
  return candidate.utc().toISOString();
}

async function lookupTask(uid, payload = {}, context = {}) {
  const id = normalizeIdToken(payload.taskId || payload.id);
  const titleToken =
    payload.title ||
    payload.name ||
    payload.task ||
    payload.description ||
    payload.label ||
    null;

  const tasks = Array.isArray(context?.tasks) ? context.tasks : [];
  if (id) {
    const fromContext = tasks.find((task) => String(task.id) === id);
    if (fromContext) return fromContext;
    try {
      const snap = await db.collection("tasks").doc(id).get();
      if (snap.exists) {
        const data = snap.data() || {};
        if (!data.userId || String(data.userId) !== String(uid)) return null;
        return {
          id,
          title: data.title || "",
          date: data.date || null,
          completed: !!data.completed,
          category: data.category || "Uncategorized",
          reminderTime: data.reminderTime || null,
          priority: data.priority || null,
        };
      }
    } catch (err) {
      console.warn("[PlannerAssistant] lookupTask by id failed", err?.message || err);
    }
  }

  const normalizedTitle = normalizeTitleToken(titleToken);
  if (!normalizedTitle) return null;

  const directMatch = tasks.find((task) => normalizeTitleToken(task.title) === normalizedTitle);
  if (directMatch) return directMatch;

  const fuzzyMatch = tasks.find((task) =>
    normalizeTitleToken(task.title)?.includes(normalizedTitle),
  );
  if (fuzzyMatch) return fuzzyMatch;

  return null;
}

async function completeTaskForUser(uid, payload = {}, context = {}) {
  const task = await lookupTask(uid, payload, context);
  if (!task) {
    return {
      status: "error",
      type: "complete_task",
      payload,
      message: "I couldn't find that task to mark complete.",
    };
  }

  try {
    const ref = db.collection("tasks").doc(String(task.id));
    const completedAt = new Date();
    await ref.set({ completed: true, completedAt, updatedAt: completedAt }, { merge: true });
    try {
      console.log("[HabitTracker] planner completion hook", {
        userId: uid,
        taskId: task.id,
      });
      await recordCompletion(uid, task, {
        completedAt,
        timezone:
          context?.profile?.timezone ||
          context?.profile?.tz ||
          context?.summary?.timezone ||
          null,
        source: "planner_assistant",
      });
    } catch (habitErr) {
      console.warn("[PlannerAssistant] habit logging skipped", habitErr?.message || habitErr);
    }
    return {
      status: "completed",
      type: "complete_task",
      payload: { taskId: task.id, title: task.title },
      message: `Marked “${task.title}” as complete.`,
    };
  } catch (err) {
    console.error("[PlannerAssistant] completeTaskForUser failed", err?.message || err);
    return {
      status: "error",
      type: "complete_task",
      payload: { taskId: task.id, title: task.title },
      message: err?.message || "Failed to mark task complete.",
    };
  }
}

function sanitizeString(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}

function toYMD(value) {
  try {
    if (!value) return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return value.trim();
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  } catch {
    /* noop */
  }
  return null;
}

function describeUpdates(updates = {}) {
  const labels = [];
  if ("title" in updates) labels.push("title");
  if ("details" in updates) labels.push("details");
  if ("date" in updates) labels.push("date");
  if ("reminderTime" in updates || "scheduledTime" in updates) labels.push("reminder");
  if ("category" in updates) labels.push("category");
  if ("completed" in updates) labels.push("status");
  return labels.length ? labels.join(", ") : "task";
}

async function updateTaskForUser(uid, payload = {}, context = {}) {
  const task = await lookupTask(uid, payload, context);
  if (!task) {
    return {
      status: "error",
      type: "update_task",
      payload,
      message: "I couldn't find the task you wanted to update.",
    };
  }

  const updates = {};
  const wasCompleted = !!task.completed;
  let completedAt = null;
  if (payload.title) updates.title = sanitizeString(payload.title, task.title).slice(0, 180);
  if (payload.details || payload.description) {
    updates.details = sanitizeString(
      payload.details || payload.description,
      task.details || "",
    ).slice(0, 1500);
  }
  if (payload.category || payload.categoryName) {
    updates.category = sanitizeString(
      payload.category || payload.categoryName,
      task.category || "Uncategorized",
    );
  }
  if (payload.priority) updates.priority = sanitizeString(payload.priority, task.priority || "");
  const nextDate = toYMD(payload.date || payload.dueDate);
  if (nextDate) updates.date = nextDate;
  if (payload.reminderTime !== undefined) updates.reminderTime = payload.reminderTime || null;
  if (payload.reminderAt) updates.reminderTime = payload.reminderAt;
  if (payload.scheduledTime) updates.scheduledTime = payload.scheduledTime;
  if (payload.channels) updates.reminderChannels = payload.channels;
  if (payload.reminderChannels) updates.reminderChannels = payload.reminderChannels;

  if (payload.completed === true) {
    updates.completed = true;
    if (!wasCompleted) {
      completedAt = new Date();
      updates.completedAt = completedAt;
    }
  }
  if (payload.completed === false) updates.completed = false;

  if (!Object.keys(updates).length) {
    return {
      status: "ignored",
      type: "update_task",
      payload: { taskId: task.id, title: task.title },
      message: "I didn't spot any changes to apply to that task.",
    };
  }

  updates.updatedAt = new Date();

  const ref = db.collection("tasks").doc(String(task.id));
  try {
    await ref.set(updates, { merge: true });
  } catch (err) {
    console.error("[PlannerAssistant] updateTaskForUser failed", err?.message || err);
    return {
      status: "error",
      type: "update_task",
      payload: { taskId: task.id, updates },
      message: err?.message || "Failed to update the task.",
    };
  }

  const summary = describeUpdates(updates);

  if (updates.completed === true && !wasCompleted && completedAt) {
    try {
      console.log("[HabitTracker] planner update hook", {
        userId: uid,
        taskId: task.id,
      });
      await recordCompletion(uid, task, {
        completedAt,
        timezone:
          context?.profile?.timezone ||
          context?.profile?.tz ||
          context?.summary?.timezone ||
          task?.timezone ||
          null,
        source: "planner_update",
      });
    } catch (habitErr) {
      console.warn("[PlannerAssistant] habit logging (update) skipped", habitErr?.message || habitErr);
    }
  }
  return {
    status: "completed",
    type: "update_task",
    payload: { taskId: task.id, updates },
    message: `Updated ${summary} for “${task.title}”.`,
  };
}

function buildTaskSummary(tasks = [], options = {}) {
  if (!Array.isArray(tasks) || !tasks.length) {
    return options.emptyMessage || "No tasks to show right now.";
  }
  const lines = tasks.slice(0, options.limit || 5).map((task, idx) => {
    const parts = [`${idx + 1}. ${task.title || "Untitled task"}`];
    if (task.date) parts.push(`due ${formatDateLabel(task.date)}`);
    if (task.completed) parts.push("✅ done");
    if (!task.completed && task.reminderTime) parts.push(`⏰ ${task.reminderTime}`);
    return parts.join(" — ");
  });
  return lines.join("\n");
}

async function getTasksForUser(uid, payload = {}, context = {}) {
  const statusFilter = resolveStatusFilter(payload.status || payload.filter);
  const limitRaw = Number(payload.limit) || 5;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 15) : 5;
  const dateFilter = toYMD(payload.date || payload.dueDate || payload.forDate);

  let tasks = Array.isArray(context?.tasks) && context.tasks.length
    ? context.tasks.slice()
    : await fetchRecentTasks(uid, 20);

  if (statusFilter === "open") {
    tasks = tasks.filter((task) => !task.completed);
  } else if (statusFilter === "completed") {
    tasks = tasks.filter((task) => task.completed);
  }

  if (dateFilter) {
    tasks = tasks.filter((task) => toYMD(task.date) === dateFilter);
  }

  const sliced = tasks.slice(0, limit);
  return {
    status: "completed",
    type: "get_tasks",
    payload: { tasks: sliced, status: statusFilter, date: dateFilter || null },
    message: buildTaskSummary(sliced, {
      limit,
      emptyMessage: dateFilter
        ? "You have no tasks on that date."
        : "No tasks match that filter yet.",
    }),
  };
}

function buildReminderSummary(reminders = [], options = {}) {
  if (!Array.isArray(reminders) || !reminders.length) {
    return options.emptyMessage || "No reminders are scheduled.";
  }
  const lines = reminders.slice(0, options.limit || 5).map((reminder, idx) => {
    const parts = [`${idx + 1}. ${reminder.text || reminder.title || "Reminder"}`];
    if (reminder.scheduledTime) parts.push(`for ${formatDateLabel(reminder.scheduledTime)}`);
    if (Array.isArray(reminder.channels) && reminder.channels.length) {
      parts.push(`via ${reminder.channels.join(", ")}`);
    }
    return parts.join(" — ");
  });
  return lines.join("\n");
}

async function getRemindersForUser(uid, payload = {}, context = {}) {
  const limitRaw = Number(payload.limit) || 5;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 15) : 5;

  let reminders =
    Array.isArray(context?.reminders) && context.reminders.length
      ? context.reminders.slice()
      : await fetchUpcomingReminders(uid, 20);

  if (payload.status) {
    const statusToken = normalizeTitleToken(payload.status);
    reminders = reminders.filter((reminder) => {
      const status = normalizeTitleToken(reminder.status);
      if (statusToken === "sent" || statusToken === "completed") {
        return status === "sent" || status === "completed";
      }
      if (statusToken === "scheduled" || statusToken === "upcoming") {
        return status === "scheduled" || status === "pending" || !status;
      }
      return true;
    });
  }

  const sliced = reminders.slice(0, limit);
  return {
    status: "completed",
    type: "get_reminders",
    payload: { reminders: sliced },
    message: buildReminderSummary(sliced, { limit, emptyMessage: "No reminders found." }),
  };
}

export async function buildUserContext(uid) {
  const [profileSnap, tasks, reminders, reports, notes] = await Promise.all([
    db.collection("users").doc(String(uid)).get(),
    fetchRecentTasks(uid),
    fetchUpcomingReminders(uid),
    fetchRecentReports(uid),
    fetchRecentNotes(uid),
  ]);

  const profile = profileSnap.exists ? profileSnap.data() || {} : {};

  const categoryTotals = tasks.reduce((acc, task) => {
    const key = (task.category || "Uncategorized").trim() || "Uncategorized";
    // eslint-disable-next-line no-param-reassign
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const completedCount = tasks.filter((t) => t.completed).length;

  return {
    profile: {
      name: profile.name || profile.displayName || null,
      email: profile.email || null,
      plan: profile.plan || profile.subscriptionPlan || null,
      timezone: profile.timezone || profile.tz || null,
      preferences: profile.preferences || {},
      secureDocs: profile.secureDocs || [],
    },
    summary: {
      generatedAt: new Date().toISOString(),
      totalTasks: tasks.length,
      completedTasks: completedCount,
      openTasks: tasks.length - completedCount,
      categoryTotals,
    },
    tasks,
    reminders,
    reports,
    notes,
  };
}

export function extractActionsFromText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { text: "", actions: [] };
  }
  const fence = /```json([\s\S]*?)```/i;
  const match = rawText.match(fence);
  if (!match) {
    try {
      const parsed = JSON.parse(rawText);
      return {
        text: "",
        actions: Array.isArray(parsed?.actions) ? parsed.actions : [],
      };
    } catch {
      const stripped = rawText.replace(/```[\s\S]*?```/g, "").trim();
      return { text: stripped, actions: [] };
    }
  }
  let actions = [];
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed?.actions)) actions = parsed.actions;
  } catch (err) {
    console.warn("[PlannerAssistant] Failed to parse actions JSON", err?.message || err);
  }
  const cleaned = rawText.replace(/```[\s\S]*?```/g, "").trim();
  return { text: cleaned, actions };
}

async function createTaskFromAction(uid, payload = {}) {
  try {
    const task = await createTask(uid, payload, {
      origin: "planner-assistant",
      silent: payload.silent === true,
      notificationOptions: { reason: "planner-assistant" },
    });
    return {
      status: "completed",
      type: "create_task",
      label: payload.label || task.title,
      taskId: task.id,
      payload: { ...payload, id: task.id },
      message: `Created task “${task.title}” for ${task.date}`,
    };
  } catch (err) {
    console.error("[PlannerAssistant] createTaskFromAction failed", err?.message || err);
    return {
      status: "error",
      type: "create_task",
      payload,
      message: err?.message || "Failed to create task",
    };
  }
}

async function scheduleReminderFromAction(uid, payload = {}) {
  const text = payload.text || payload.title || "";
  const scheduledTime = payload.scheduledTime || payload.when || null;
  if (!text || !scheduledTime) {
    return {
      status: "error",
      type: "schedule_reminder",
      payload,
      message: "Missing text or scheduledTime for reminder",
    };
  }
  try {
    const channels = Array.isArray(payload.channels) ? payload.channels : undefined;
    const reminder = await handleTextReminder(text, uid, channels, {
      scheduledTime,
      timezone: payload.timezone || payload.tz || "UTC",
      taskId: payload.taskId || null,
    });
    return {
      status: "completed",
      type: "schedule_reminder",
      payload,
      message: `Scheduled reminder “${text}” for ${scheduledTime}`,
      reminderId: reminder?.id || null,
    };
  } catch (err) {
    return {
      status: "error",
      type: "schedule_reminder",
      payload,
      message: err?.message || "Failed to schedule reminder",
    };
  }
}

export async function executePlannerActions(uid, actions = [], context = {}) {
  if (!Array.isArray(actions) || !actions.length) return [];
  const results = [];
  for (const raw of actions.slice(0, 5)) {
    try {
      const type = String(raw?.type || raw?.name || "").toLowerCase();
      if (type === "create_task") {
        results.push(await createTaskFromAction(uid, raw?.payload || raw));
      } else if (type === "schedule_reminder") {
        results.push(await scheduleReminderFromAction(uid, raw?.payload || raw));
      } else if (type === "complete_task") {
        results.push(await completeTaskForUser(uid, raw?.payload || raw, context));
      } else if (type === "update_task") {
        results.push(await updateTaskForUser(uid, raw?.payload || raw, context));
      } else if (type === "get_tasks") {
        results.push(await getTasksForUser(uid, raw?.payload || raw, context));
      } else if (type === "get_reminders") {
        results.push(await getRemindersForUser(uid, raw?.payload || raw, context));
      } else {
        results.push({
          status: "ignored",
          type: raw?.type || raw?.name || "unknown",
          payload: raw?.payload || raw,
          message: "Unsupported action type",
        });
      }
    } catch (err) {
      results.push({
        status: "error",
        type: raw?.type || raw?.name || "unknown",
        payload: raw?.payload || raw,
        message: err?.message || "Action failed",
      });
    }
  }
  return results;
}

export function detectIntentFromMessage(message = "") {
  if (!message) return null;
  const text = String(message).toLowerCase();
  if (/create|add|new/.test(text) && /task/.test(text)) return "create_task";
  if (/remind|reminder|nudge|follow\s*up/.test(text)) return "schedule_reminder";
  if (/(show|list|fetch|what).*task/.test(text)) return "get_tasks";
  if (/(document|file|report|pdf)/.test(text)) return "get_documents";
  if (/(journal|note|entry)/.test(text)) return "get_journal";
  if (/(complete|finish|done|mark).*(task|them|all)/.test(text)) return "complete_task";
  return null;
}

export async function buildFallbackActionsFromIntent(intent, message = "", context = {}) {
  const lower = String(message || "").toLowerCase();
  const tasks = Array.isArray(context?.tasks) ? context.tasks : [];
  const timezoneId =
    context?.profile?.timezone ||
    context?.summary?.timezone ||
    context?.profile?.preferences?.timezone ||
    DEFAULT_TIMEZONE;
  const nowIso = new Date().toISOString();

  if (intent === "get_tasks") {
    const payload = {};
    if (/completed|done/.test(lower)) payload.status = "completed";
    if (/all/.test(lower)) payload.status = "all";
    if (/today|tonight/.test(lower)) payload.date = toYMD(new Date());
    if (/tomorrow/.test(lower)) payload.date = toYMD(new Date(Date.now() + 86400000));
    return [{ type: "get_tasks", payload }];
  }

  if (intent === "get_reminders") {
    const payload = {};
    if (/sent|done/.test(lower)) payload.status = "sent";
    if (/upcoming|scheduled|pending/.test(lower)) payload.status = "scheduled";
    return [{ type: "get_reminders", payload }];
  }

  if (intent === "schedule_reminder") {
    const reminderText = message?.trim() || "Reminder";
    let scheduledIso = deriveRelativeReminderIso(reminderText, timezoneId, nowIso);
    if (!scheduledIso) {
      try {
        scheduledIso = await extractReminderTimeAI(reminderText, {
          nowISO: nowIso,
          timezone: timezoneId,
          timeContext: { plan_date: context?.summary?.planDate || context?.summary?.plan_date || null },
        });
      } catch (err) {
        console.warn("[PlannerAssistant] fallback reminder time parse failed", err?.message || err);
      }
    }
    if (!scheduledIso) return [];
    return [
      {
        type: "schedule_reminder",
        payload: {
          text: reminderText,
          scheduledTime: scheduledIso,
          timezone: timezoneId,
        },
      },
    ];
  }

  if (intent === "create_task") {
    const base = dayjs().tz(timezoneId);
    let due = base;
    if (/tomorrow/.test(lower)) due = due.add(1, "day");
    if (/next\s+week/.test(lower)) due = due.add(1, "week");
    const weekdayMatch = lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (weekdayMatch) {
      const targetDow = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"].indexOf(weekdayMatch[1]);
      let candidate = base.add(1, "day");
      while (candidate.day() !== targetDow) candidate = candidate.add(1, "day");
      due = candidate;
    }

    const title = (() => {
      const stripped = message
        ?.replace(/^[\s"]+|[\s"]+$/g, "")
        .replace(/^(please\s+)?(create|add|make|set)\s+(me\s+)?(a\s+)?(new\s+)?task(\s+to)?/i, "")
        .trim();
      if (stripped) return stripped.charAt(0).toUpperCase() + stripped.slice(1);
      return "New task";
    })();

    const payload = {
      title,
      details: message?.trim() || "",
      date: due.format("YYYY-MM-DD"),
      source: "planner-assistant",
    };

    return [{ type: "create_task", payload }];
  }

  if (intent === "complete_task") {
    const pending = tasks.filter((task) => !task.completed);
    if (!pending.length) return [];
    let targets = findTasksMatchingText(lower, pending);
    if (!targets.length && /(all|everything|today|for today)/.test(lower)) {
      targets = pending;
    }
    return targets.length
      ? targets.map((task) => ({
          type: "update_task",
          payload: { taskId: task.id, completed: true },
        }))
      : [];
  }

  return [];
}
