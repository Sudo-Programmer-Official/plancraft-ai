import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { db } from "./firebaseAdmin.js";
import { handleTextReminder } from "./textHandler.js";
import { createTask } from "./taskService.js";
import { recordCompletion } from "./habitService.js";
import { extractReminderTime as extractReminderTimeAI } from "./openaiService.js";
import { formatLocalTime } from "../utils/timezone.js";
import { listEventsForWindow, getNextMeeting } from "./externalEventsService.js";
import { createGoalViaService } from "./goalsClient.js";

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
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function extractTimeToken(text) {
  if (!text) return { cleaned: text, time: null };
  const timeRegex = /(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
  const match = text.match(timeRegex);
  if (!match) return { cleaned: text, time: null };
  let hour = Number(match[1] || 0);
  const minute = Number(match[2] || 0);
  const meridiem = match[3] || "";
  if (/pm/i.test(meridiem) && hour < 12) hour += 12;
  if (/am/i.test(meridiem) && hour === 12) hour = 0;
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const cleaned = text.replace(match[0], "").trim();
  return { cleaned: cleaned.replace(/\s+/g, " ").replace(/,\s*$/, "").trim(), time: `${hh}:${mm}` };
}

function resolveDateToken(text, timezoneId = DEFAULT_TIMEZONE) {
  const lower = String(text || "").toLowerCase();
  const base = dayjs().tz(timezoneId);
  if (lower.includes("tomorrow")) return base.add(1, "day").format("YYYY-MM-DD");
  const nextMatch = lower.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (nextMatch) {
    const target = WEEKDAYS.indexOf(nextMatch[1]);
    let cursor = base.add(1, "day");
    while (cursor.day() !== target) cursor = cursor.add(1, "day");
    return cursor.format("YYYY-MM-DD");
  }
  for (const dayName of WEEKDAYS) {
    if (lower.includes(dayName)) {
      const target = WEEKDAYS.indexOf(dayName);
      let cursor = base;
      if (cursor.day() > target) cursor = cursor.add(1, "week");
      while (cursor.day() !== target) cursor = cursor.add(1, "day");
      return cursor.format("YYYY-MM-DD");
    }
  }
  return base.format("YYYY-MM-DD");
}

function extractTaskListFromMessage(message, timezoneId = DEFAULT_TIMEZONE) {
  if (!message) return [];
  const lines = String(message)
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
  const tasks = [];
  const bulletRegex = /^(\d+[\).\s]|[-*•]\s+)/;
  for (const line of lines) {
    const cleanedLine = line.replace(bulletRegex, "").trim();
    if (!cleanedLine) continue;
    if (/^plan\s+my\s+day/i.test(cleanedLine)) continue;
    if (/^let'?s\s+plan/i.test(cleanedLine)) continue;
    if (/^thanks?/i.test(cleanedLine)) continue;
    const { cleaned, time } = extractTimeToken(cleanedLine);
    const title = (cleaned || cleanedLine).replace(/^[\-\d\.\s]+/, "").trim();
    if (title.length < 3) continue;
    tasks.push({
      title,
      reminderTime: time,
      date: resolveDateToken(cleanedLine, timezoneId),
    });
  }
  return tasks.length > 1 ? tasks : [];
}

const GOAL_CATEGORY_HINTS = [
  { value: "Health", regex: /(run|health|fitness|gym|workout|marathon|yoga|meditat)/i },
  { value: "Finance", regex: /(save|budget|finance|money|debt|invest)/i },
  { value: "Career", regex: /(career|promotion|business|client|startup|work)/i },
  { value: "Learning", regex: /(learn|study|course|class|book|reading|school)/i },
  { value: "Relationships", regex: /(family|relationship|partner|friends|community|social)/i },
];

function inferGoalCategoryFromText(text = "") {
  for (const hint of GOAL_CATEGORY_HINTS) {
    if (hint.regex.test(text)) return hint.value;
  }
  return "General";
}

function deriveGoalTitleFromMessage(message = "") {
  if (!message) return "New Goal";
  const trimmed = message.trim();
  const goalMatch = trimmed.match(/goal(?: to| for)?\s+([^.!?]+)/i);
  if (goalMatch?.[1]) {
    const candidate = goalMatch[1].trim();
    return candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }
  const toMatch = trimmed.match(/to\s+([^.!?]+)/i);
  if (toMatch?.[1]) {
    const candidate = toMatch[1].trim();
    return candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
}

function defaultGoalTargetDate(timezoneId = DEFAULT_TIMEZONE) {
  try {
    return dayjs().tz(timezoneId).add(90, "day").startOf("day").toISOString();
  } catch {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 90);
    return fallback.toISOString();
  }
}

function extractGoalTargetDateFromMessage(message = "", timezoneId = DEFAULT_TIMEZONE, context = {}) {
  if (!message) return null;
  const isoMatch = message.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    const iso = dayjs(isoMatch[0]);
    if (iso.isValid()) return iso.tz(timezoneId, true).startOf("day").toISOString();
  }

  const byMatch = message.match(/by\s+([^.,;]+)/i);
  if (byMatch?.[1]) {
    const candidate = byMatch[1].trim();
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const relative = message.match(/in\s+(\d+)\s+(month|months|week|weeks|year|years)/i);
  if (relative) {
    const amount = Number(relative[1]);
    const unitToken = relative[2].toLowerCase();
    const unitMap = {
      month: "month",
      months: "month",
      week: "week",
      weeks: "week",
      year: "year",
      years: "year",
    };
    const unit = unitMap[unitToken] || "month";
    try {
      return dayjs().tz(timezoneId).add(amount, unit).startOf("day").toISOString();
    } catch {
      /* noop */
    }
  }

  if (/next\s+year/i.test(message)) {
    try {
      return dayjs().tz(timezoneId).add(1, "year").startOf("month").toISOString();
    } catch {
      /* noop */
    }
  }

  if (/end\s+of\s+(the\s+)?year/i.test(message)) {
    try {
      return dayjs().tz(timezoneId).endOf("year").toISOString();
    } catch {
      /* noop */
    }
  }

  if (context?.summary?.planDate) {
    try {
      return dayjs(context.summary.planDate).tz(timezoneId).add(60, "day").toISOString();
    } catch {
      /* noop */
    }
  }

  return null;
}

function buildGoalPayloadFromMessage(message = "", timezoneId = DEFAULT_TIMEZONE, context = {}) {
  const description = String(message || "").trim();
  const category = inferGoalCategoryFromText(description);
  const targetDate = extractGoalTargetDateFromMessage(description, timezoneId, context) || defaultGoalTargetDate(timezoneId);
  return {
    title: deriveGoalTitleFromMessage(description),
    description,
    category,
    targetDate,
    autoPlan: true,
  };
}

function safeFormatInTimezone(value, timezoneId = DEFAULT_TIMEZONE) {
  try {
    const base = dayjs(value);
    if (!base.isValid()) return null;
    if (
      timezoneId &&
      typeof timezoneId === "string" &&
      timezoneId.trim() &&
      typeof base.tz === "function"
    ) {
      const shifted = base.tz(timezoneId, true);
      if (shifted.isValid()) return shifted;
    }
    return base;
  } catch {
    return null;
  }
}

function normalizeDateToken(value, timezoneId = DEFAULT_TIMEZONE) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = safeFormatInTimezone(trimmed, timezoneId);
    return parsed ? parsed.format("YYYY-MM-DD") : null;
  }
  if (value instanceof Date) {
    const parsed = safeFormatInTimezone(value, timezoneId);
    return parsed ? parsed.format("YYYY-MM-DD") : null;
  }
  if (typeof value?.toDate === "function") {
    try {
      const parsed = safeFormatInTimezone(value.toDate(), timezoneId);
      return parsed ? parsed.format("YYYY-MM-DD") : null;
    } catch {
      /* noop */
    }
  }
  if (typeof value === "number") {
    const parsed = safeFormatInTimezone(new Date(value), timezoneId);
    return parsed ? parsed.format("YYYY-MM-DD") : null;
  }
  return null;
}

function resolveCandidateTimezone(candidate = {}, context = {}) {
  const choices = [
    candidate.timezone,
    candidate.tz,
    context?.profile?.timezone,
    context?.profile?.tz,
    context?.summary?.timezone,
    context?.profile?.preferences?.timezone,
  ];
  for (const option of choices) {
    if (typeof option === "string" && option.trim()) return option.trim();
  }
  return DEFAULT_TIMEZONE;
}

function ensureCandidateDate(candidate = {}, context = {}) {
  const timezoneId = resolveCandidateTimezone(candidate, context);
  if (!candidate.timezone) candidate.timezone = timezoneId;

  const existing = normalizeDateToken(candidate.date, timezoneId);
  if (existing) {
    candidate.date = existing;
    return candidate.date;
  }

  const fromDue = normalizeDateToken(candidate.dueDate || candidate.due_date, timezoneId);
  if (fromDue) {
    candidate.date = fromDue;
    return candidate.date;
  }

  const planDate = normalizeDateToken(context?.summary?.planDate || context?.summary?.plan_date, timezoneId);
  if (planDate) {
    candidate.date = planDate;
    return candidate.date;
  }

  const fromSchedule = normalizeDateToken(candidate.scheduledTime || candidate.when, timezoneId);
  if (fromSchedule) {
    candidate.date = fromSchedule;
    return candidate.date;
  }

  try {
    candidate.date = dayjs().tz(timezoneId).format("YYYY-MM-DD");
  } catch {
    candidate.date = dayjs().format("YYYY-MM-DD");
  }
  return candidate.date;
}

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
        goalId: data.goalId || null,
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

function normalizeTaskTitleKey(value) {
  const token = normalizeTitleToken(value);
  if (!token) return null;
  return token.replace(/\s+/g, " ").trim();
}

function datesMatchLoose(left, right) {
  const a = toYMD(left);
  const b = toYMD(right);
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a === b;
}

function findTaskInListByKey(list = [], titleKey, dateKey) {
  if (!Array.isArray(list) || !titleKey) return null;
  return (
    list.find((task) => {
      const candidateKey = normalizeTaskTitleKey(task?.title);
      if (!candidateKey || candidateKey !== titleKey) return false;
      if (!dateKey) return true;
      return datesMatchLoose(task?.date, dateKey);
    }) || null
  );
}

async function lookupDuplicateTask(uid, candidate = {}, knownTasks = []) {
  const titleKey = normalizeTaskTitleKey(candidate?.title);
  if (!titleKey) return null;

  const dateKey = candidate?.date ? toYMD(candidate.date) : null;
  const inMemory = findTaskInListByKey(knownTasks, titleKey, dateKey);
  if (inMemory) return inMemory;

  if (!dateKey) return null;

  try {
    const snap = await db
      .collection("tasks")
      .where("userId", "==", String(uid))
      .where("date", "==", dateKey)
      .limit(25)
      .get();
    let duplicate = null;
    snap.forEach((doc) => {
      if (duplicate) return;
      const data = doc.data() || {};
      const docKey = normalizeTaskTitleKey(data.title);
      if (docKey && docKey === titleKey) {
        duplicate = { id: doc.id, ...data };
      }
    });
    return duplicate;
  } catch (err) {
    console.warn("[PlannerAssistant] duplicate lookup failed", err?.message || err);
    return null;
  }
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
  if ("goalId" in updates) labels.push("goal link");
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
  if (Object.prototype.hasOwnProperty.call(payload, "goalId")) {
    const goalToken = sanitizeString(payload.goalId, "");
    updates.goalId = goalToken || null;
  }

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

function buildMeetingSummary(meetings = [], options = {}) {
  if (!Array.isArray(meetings) || !meetings.length) {
    return options.emptyMessage || "No meetings found in that window.";
  }
  const limit = options.limit || 5;
  const lines = meetings.slice(0, limit).map((meeting, idx) => {
    const title = meeting.title || "Meeting";
    const when = meeting.startTime ? formatLocalTime(meeting.startTime, meeting.timezone || meeting.tz) : null;
    const join = meeting.joinUrl ? `Join: ${meeting.joinUrl}` : null;
    const parts = [`${idx + 1}. ${title}`];
    if (when) parts.push(`at ${when}`);
    if (join) parts.push(join);
    return parts.join(" — ");
  });
  return lines.join("\n");
}

async function getMeetingsForUser(uid, payload = {}, context = {}) {
  const limitRaw = Number(payload.limit) || 5;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 10) : 5;
  const windowHours = Number(payload.windowHours) || 24;
  const windowStart = new Date().toISOString();
  const windowEnd = dayjs().add(windowHours, "hour").toISOString();

  let meetings = Array.isArray(context?.meetings) && context.meetings.length
    ? context.meetings.slice()
    : await listEventsForWindow(uid, "google_calendar", {
        windowStart,
        windowEnd,
        statuses: ["confirmed", "tentative"],
      });

  meetings = meetings
    .filter((meeting) => meeting.status !== "cancelled")
    .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0));

  const sliced = meetings.slice(0, limit);
  return {
    status: "completed",
    type: "get_meetings",
    payload: { meetings: sliced },
    message: buildMeetingSummary(sliced, {
      limit,
      emptyMessage: "No meetings scheduled in that window.",
    }),
  };
}

async function joinNextMeetingForUser(uid) {
  const meeting = await getNextMeeting(uid, "google_calendar");
  if (!meeting) {
    return {
      status: "completed",
      type: "join_meeting",
      payload: null,
      message: "You have no upcoming meetings with join links.",
    };
  }
  const when = meeting.startTime ? formatLocalTime(meeting.startTime, meeting.timezone || meeting.tz) : null;
  const join = meeting.joinUrl || meeting.htmlLink || null;
  return {
    status: "completed",
    type: "join_meeting",
    payload: { meeting },
    message: join
      ? `Your next meeting \"${meeting.title || "Meeting"}\" is at ${when || "the scheduled time"}. Join link: ${join}`
      : `Your next meeting \"${meeting.title || "Meeting"}\" is at ${when || "the scheduled time"}, but no join link was provided.`,
  };
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
  const [profileSnap, tasks, reminders, reports, notes, meetings] = await Promise.all([
    db.collection("users").doc(String(uid)).get(),
    fetchRecentTasks(uid),
    fetchUpcomingReminders(uid),
    fetchRecentReports(uid),
    fetchRecentNotes(uid),
    listEventsForWindow(uid, "google_calendar", {
      windowStart: new Date().toISOString(),
      windowEnd: dayjs().add(24, "hour").toISOString(),
      statuses: ["confirmed", "tentative"],
    }),
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
    meetings: Array.isArray(meetings)
      ? meetings
          .filter((meeting) => meeting.status !== "cancelled")
          .sort((a, b) => new Date(a.startTime || 0) - new Date(b.startTime || 0))
          .slice(0, 6)
      : [],
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

async function createTaskFromAction(uid, payload = {}, context = {}) {
  try {
    const incoming = Array.isArray(payload.tasks) && payload.tasks.length ? payload.tasks : [payload];
    const basePayload = { ...payload };
    delete basePayload.tasks;

    const created = [];
    const skipped = [];
    const knownTasks = Array.isArray(context?.tasks) ? context.tasks.slice() : [];
    const seenKeys = new Set();
    const describeDate = (value) => {
      if (!value) return null;
      return formatDateLabel(value) || toYMD(value) || null;
    };

    for (const entry of incoming) {
      const candidate = { ...basePayload, ...entry };
      const cleanedTitle = sanitizeString(candidate.title, "");
      if (!cleanedTitle) {
        skipped.push({ reason: "missing_title", original: candidate.title, date: candidate.date || null });
        continue;
      }
      candidate.title = cleanedTitle;
      ensureCandidateDate(candidate, context);

      const titleKey = normalizeTaskTitleKey(candidate.title);
      const dateKey = candidate.date ? toYMD(candidate.date) : null;
      if (titleKey) {
        const dedupeKey = `${titleKey}::${dateKey || "any"}`;
        if (seenKeys.has(dedupeKey)) {
          skipped.push({
            reason: "duplicate_payload",
            title: candidate.title,
            date: candidate.date || null,
          });
          continue;
        }
        seenKeys.add(dedupeKey);
      }

      const existing = await lookupDuplicateTask(uid, { title: candidate.title, date: candidate.date }, knownTasks);
      if (existing) {
        skipped.push({
          reason: "already_exists",
          title: candidate.title,
          date: candidate.date || null,
          existingId: existing.id,
        });
        continue;
      }

      const task = await createTask(uid, candidate, {
        origin: "planner-assistant",
        silent: candidate.silent === true,
        notificationOptions: { reason: "planner-assistant" },
      });
      console.log("[PlannerTask] taskCreated=✅", {
        userId: uid,
        taskId: task.id,
        title: task.title,
        date: task.date,
      });
      if (task?.scheduledReminder?.scheduledTime) {
        console.log("[PlannerTask] reminderScheduled=✅", {
          userId: uid,
          taskId: task.id,
          reminderTime: task.scheduledReminder.scheduledTime,
        });
      }
      created.push(task);
      knownTasks.push(task);
    }

    const duplicateSkips = skipped.filter(
      (item) => item.reason === "already_exists" || item.reason === "duplicate_payload",
    );
    const invalidSkips = skipped.filter((item) => item.reason === "missing_title");

    let skipNote = "";
    if (duplicateSkips.length === 1) {
      const entry = duplicateSkips[0];
      const when = describeDate(entry.date);
      skipNote = when
        ? `Skipped “${entry.title}” because it already exists for ${when}.`
        : `Skipped “${entry.title}” because it already exists.`;
    } else if (duplicateSkips.length > 1) {
      skipNote = `Skipped ${duplicateSkips.length} tasks that were already on your list.`;
    } else if (invalidSkips.length === 1) {
      skipNote = "Skipped a task because it was missing a title.";
    } else if (invalidSkips.length > 1) {
      skipNote = `Skipped ${invalidSkips.length} tasks because they were missing titles.`;
    }

    if (!created.length) {
      if (skipNote) {
        return {
          status: duplicateSkips.length ? "skipped" : "error",
          type: "create_task",
          label: payload.label || "Task creation",
          payload,
          message: skipNote,
        };
      }
      throw new Error("No tasks created from payload");
    }

    if (created.length === 1) {
      const task = created[0];
      const baseMessage = `Created task “${task.title}” for ${task.date}`;
      return {
        status: "completed",
        type: "create_task",
        label: payload.label || task.title,
        taskId: task.id,
        payload: {
          ...payload,
          id: task.id,
          createdTasks: [
            {
              id: task.id,
              title: task.title,
              date: task.date,
              reminderTime: task.reminderTime,
              link: task.link || null,
            },
          ],
        },
        message: skipNote ? `${baseMessage}\n${skipNote}` : baseMessage,
      };
    }

    const summaryLines = created.map((task) => `• ${task.title} (${task.date})`);
    const messageParts = [`Created ${created.length} tasks:\n${summaryLines.join("\n")}`];
    if (skipNote) messageParts.push(skipNote);
    return {
      status: "completed",
      type: "create_task",
      label: `${created.length} tasks`,
      taskIds: created.map((task) => task.id),
      payload: {
        ...payload,
        createdTasks: created.map((task) => ({
          id: task.id,
          title: task.title,
          date: task.date,
          reminderTime: task.reminderTime,
          link: task.link || null,
        })),
      },
      message: messageParts.join("\n\n"),
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

async function createGoalFromAction(uid, payload = {}, context = {}) {
  try {
    const timezoneId = resolveCandidateTimezone(payload, context);
    const textSource =
      payload.description ||
      payload.details ||
      payload.summary ||
      payload.title ||
      context?.runtime?.lastMessage ||
      "";
    const autoCategory = inferGoalCategoryFromText(textSource);
    const goalBody = {
      userId: uid,
      title: payload.title || deriveGoalTitleFromMessage(textSource || "New Goal"),
      description: textSource,
      category: payload.category || autoCategory,
      targetDate:
        payload.targetDate ||
        payload.deadline ||
        extractGoalTargetDateFromMessage(textSource, timezoneId, context) ||
        defaultGoalTargetDate(timezoneId),
      milestones: Array.isArray(payload.milestones) ? payload.milestones : undefined,
      linkedTasks: Array.isArray(payload.linkedTasks) ? payload.linkedTasks : undefined,
      motivationNote: payload.motivationNote || payload.reason || "",
      generateTasksForMilestones: payload.generateTasksForMilestones === true,
      autoPlan: payload.autoPlan !== false,
      useAiMilestones: payload.useAiMilestones !== false,
      source: payload.source || "planner-assistant",
      voiceContext: context?.runtime?.voiceSnippet || null,
    };
    if (!goalBody.description) goalBody.description = goalBody.title;

    const goal = await createGoalViaService(goalBody, { userId: uid });
    let friendlyDate = null;
    if (goal?.targetDate) {
      const parsed = dayjs(goal.targetDate);
      friendlyDate = parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
    }
    const summaryLine = friendlyDate
      ? `Goal “${goal.title}” locked for ${friendlyDate}.`
      : `Goal “${goal.title}” is now active.`;
    return {
      status: "completed",
      type: "create_goal",
      goal,
      payload,
      message: summaryLine,
    };
  } catch (err) {
    console.error("[PlannerAssistant] createGoalFromAction failed", err?.message || err);
    return {
      status: "error",
      type: "create_goal",
      payload,
      message: err?.message || "Failed to create goal",
    };
  }
}

async function scheduleReminderFromAction(uid, payload = {}, context = {}) {
  const text = sanitizeString(payload.text || payload.title || payload.message || "");
  const scheduledTime = payload.scheduledTime || payload.when || payload.scheduled_at || null;
  const timezoneId =
    payload.timezone ||
    payload.tz ||
    context?.runtime?.clientTimezone ||
    context?.profile?.timezone ||
    context?.summary?.timezone ||
    context?.profile?.preferences?.timezone ||
    DEFAULT_TIMEZONE;
  if (!text || !scheduledTime) {
    return {
      status: "error",
      type: "schedule_reminder",
      payload,
      message: "Missing text or scheduledTime for reminder",
    };
  }
  try {
    let linkedTaskId = payload.taskId || null;
    let createdTask = null;
    if (!linkedTaskId && payload.createTask !== false) {
      try {
        const fromContext = findTaskInListByKey(context?.tasks || [], normalizeTaskTitleKey(text));
        if (fromContext?.id) {
          linkedTaskId = fromContext.id;
        } else {
          const scheduled = dayjs(scheduledTime).tz(timezoneId);
          const taskDate = scheduled?.isValid?.() ? scheduled.format("YYYY-MM-DD") : null;
          const reminderTimeToken = scheduled?.isValid?.() ? scheduled.format("HH:mm") : null;
          createdTask = await createTask(uid, {
            title: text,
            date: taskDate,
            reminderTime: reminderTimeToken,
            scheduledTime,
            timezone: timezoneId,
            source: payload.source || "reminder_action",
          }, {
            origin: "reminder_action",
            silent: true,
            skipReminder: true, // avoid double-scheduling; we'll attach below
            timezone: timezoneId,
          });
          linkedTaskId = createdTask?.id || null;
        }
      } catch (taskErr) {
        console.warn("[PlannerAssistant] auto task creation for reminder failed", taskErr?.message || taskErr);
      }
    }

    const channels = Array.isArray(payload.channels) ? payload.channels : undefined;
    const reminder = await handleTextReminder(text, uid, channels, {
      scheduledTime,
      timezone: timezoneId,
      taskId: linkedTaskId,
    });
    const friendlyTime = formatLocalTime(scheduledTime, timezoneId) || scheduledTime;
    const displayTimezone = timezoneId ? ` (${timezoneId})` : "";
    return {
      status: "completed",
      type: "schedule_reminder",
      payload: { ...payload, taskId: linkedTaskId },
      message: `Scheduled reminder “${text}” for ${friendlyTime}${displayTimezone}${linkedTaskId ? " and added it to your tasks." : ""}`,
      reminderId: reminder?.id || null,
      taskId: linkedTaskId,
      createdTaskId: createdTask?.id || null,
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
        results.push(await createTaskFromAction(uid, raw?.payload || raw, context));
      } else if (type === "create_goal") {
        results.push(await createGoalFromAction(uid, raw?.payload || raw, context));
      } else if (type === "schedule_reminder") {
        results.push(await scheduleReminderFromAction(uid, raw?.payload || raw, context));
      } else if (type === "complete_task") {
        results.push(await completeTaskForUser(uid, raw?.payload || raw, context));
      } else if (type === "update_task") {
        results.push(await updateTaskForUser(uid, raw?.payload || raw, context));
      } else if (type === "get_tasks") {
        results.push(await getTasksForUser(uid, raw?.payload || raw, context));
      } else if (type === "get_reminders") {
        results.push(await getRemindersForUser(uid, raw?.payload || raw, context));
      } else if (type === "get_meetings") {
        results.push(await getMeetingsForUser(uid, raw?.payload || raw, context));
      } else if (type === "join_meeting") {
        results.push(await joinNextMeetingForUser(uid));
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
  if (/(set|create|plan|start|build).*(goal|objective|mission)/.test(text) || /goal\s+to/.test(text)) {
    return "create_goal";
  }
  if (/join/.test(text) && /(meeting|call)/.test(text)) return "join_meeting";
  if (/(meeting|calendar|schedule)/.test(text)) return "get_meetings";
  if (/(show|list|fetch|what).*task/.test(text)) return "get_tasks";
  if (/(document|file|report|pdf)/.test(text)) return "get_documents";
  if (/(journal|note|entry)/.test(text)) return "get_journal";
  if (/(complete|finish|done|mark).*(task|them|all)/.test(text)) return "complete_task";
  return null;
}

export async function buildFallbackActionsFromIntent(intent, message = "", context = {}) {
  const lower = String(message || "").toLowerCase();
  const tasks = Array.isArray(context?.tasks) ? context.tasks : [];
  const runtimeTz = context?.runtime?.clientTimezone;
  const timezoneId =
    runtimeTz ||
    context?.profile?.timezone ||
    context?.summary?.timezone ||
    context?.profile?.preferences?.timezone ||
    DEFAULT_TIMEZONE;
  const nowIso = context?.runtime?.clientNow || new Date().toISOString();

  if (intent === "get_tasks") {
    const payload = {};
    const clientNowDate = new Date(nowIso);
    if (/completed|done/.test(lower)) payload.status = "completed";
    if (/all/.test(lower)) payload.status = "all";
    if (/today|tonight/.test(lower)) payload.date = toYMD(clientNowDate);
    if (/tomorrow/.test(lower)) payload.date = toYMD(new Date(clientNowDate.getTime() + 86400000));
    return [{ type: "get_tasks", payload }];
  }

  if (intent === "get_reminders") {
    const payload = {};
    if (/sent|done/.test(lower)) payload.status = "sent";
    if (/upcoming|scheduled|pending/.test(lower)) payload.status = "scheduled";
    return [{ type: "get_reminders", payload }];
  }

  if (intent === "get_meetings") {
    const payload = {};
    if (/tomorrow/.test(lower)) payload.windowHours = 36;
    if (/next\s+week/.test(lower)) payload.windowHours = 24 * 7;
    return [{ type: "get_meetings", payload }];
  }

  if (intent === "join_meeting") {
    return [{ type: "join_meeting", payload: {} }];
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
    let base = dayjs(nowIso).tz(timezoneId);
    if (!base.isValid()) base = dayjs().tz(timezoneId);
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

    const parsedList = extractTaskListFromMessage(message, timezoneId);
    if (parsedList.length) {
      return parsedList.map((item) => ({
        type: "create_task",
        payload: {
          title: item.title,
          date: item.date || due.format("YYYY-MM-DD"),
          reminderTime: item.reminderTime || null,
          source: "planner-assistant",
        },
      }));
    }

    const payload = {
      title,
      details: message?.trim() || "",
      date: due.format("YYYY-MM-DD"),
      source: "planner-assistant",
    };

    return [{ type: "create_task", payload }];
  }

  if (intent === "create_goal") {
    const payload = buildGoalPayloadFromMessage(message, timezoneId, context);
    return [
      {
        type: "create_goal",
        payload: {
          ...payload,
          useAiMilestones: true,
          source: "planner-assistant",
        },
      },
    ];
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
