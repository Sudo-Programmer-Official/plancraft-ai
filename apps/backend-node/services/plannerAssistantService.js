import { db } from "./firebaseAdmin.js";
import { handleTextReminder } from "./textHandler.js";
import { createTask } from "./taskService.js";

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
        scheduledTime: data.scheduledTime ? new Date(data.scheduledTime).toISOString() : null,
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
          scheduledTime: data.scheduledTime ? new Date(data.scheduledTime).toISOString() : null,
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
      return { text: rawText.trim(), actions: [] };
    }
  }
  let actions = [];
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed?.actions)) actions = parsed.actions;
  } catch (err) {
    console.warn("[PlannerAssistant] Failed to parse actions JSON", err?.message || err);
  }
  const cleaned = rawText.replace(match[0], "").trim();
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

export async function executePlannerActions(uid, actions = []) {
  if (!Array.isArray(actions) || !actions.length) return [];
  const results = [];
  for (const raw of actions.slice(0, 5)) {
    try {
      const type = String(raw?.type || raw?.name || "").toLowerCase();
      if (type === "create_task") {
        results.push(await createTaskFromAction(uid, raw?.payload || raw));
      } else if (type === "schedule_reminder") {
        results.push(await scheduleReminderFromAction(uid, raw?.payload || raw));
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
  return null;
}
