import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { ensureFreshAccessToken, getUserGoogleIntegration, saveUserGoogleIntegration } from "./googleOAuth.js";
import { upsertIntegrationAccount, markIntegrationAccountSync } from "./integrationAccountService.js";
import {
  upsertExternalEvent,
  listEventsForWindow,
  linkEventToTask,
} from "./externalEventsService.js";
import { getCalendarAdapter } from "./calendarAdapters/index.js";
import { createTask, scheduleTaskReminder } from "./taskService.js";
import { sendCalendarDigestNotification } from "./notificationService.js";
import { db } from "./firebaseAdmin.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_WINDOW_DAYS = Number(process.env.CALENDAR_SYNC_WINDOW_DAYS || 30);
const DEFAULT_REMINDER_MINUTES = Number(process.env.CALENDAR_MEETING_REMINDER_MINUTES || 10);

function clampMinutes(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.min(Math.max(Math.round(num), 1), 24 * 60);
}

function log(...args) {
  try {
    console.log("[CalendarSync]", ...args);
  } catch {}
}

function buildDetailsFromEvent(event) {
  const parts = [];
  if (event.description) parts.push(event.description.trim());
  if (event.location) parts.push(`Location: ${event.location}`);
  if (event.joinUrl) parts.push(`Join link: ${event.joinUrl}`);
  if (Array.isArray(event.attendees) && event.attendees.length) {
    const attendees = event.attendees
      .map((attendee) => attendee.email)
      .filter(Boolean);
    if (attendees.length) {
      const list =
        attendees.length > 5
          ? `${attendees.slice(0, 5).join(", ")}…`
          : attendees.join(", ");
      parts.push(`Attendees: ${list}`);
    }
  }
  return parts.join("\n\n").trim();
}

function computeTimingFromEvent(event, meetingSettings = {}) {
  const tz = event.timezone || "UTC";
  let start = null;
  try {
    start = event.startTime ? dayjs(event.startTime).tz(tz) : null;
  } catch {
    start = null;
  }
  const date = start ? start.format("YYYY-MM-DD") : dayjs().tz(tz).format("YYYY-MM-DD");
  const time = event.allDay || !start ? null : start.format("HH:mm");
  const startIso = start ? start.toDate().toISOString() : event.startTime || null;
  const offsetMinutes = Number.isFinite(event.reminderOffsetMinutes)
    ? event.reminderOffsetMinutes
    : meetingSettings?.defaultReminderMinutes ?? DEFAULT_REMINDER_MINUTES;
  const reminderIso =
    start && !event.allDay
      ? start.subtract(offsetMinutes, "minute").toDate().toISOString()
      : null;
  return {
    date,
    time,
    startIso,
    reminderIso,
    timezone: tz,
  };
}

async function fetchTaskById(taskId) {
  if (!taskId) return null;
  const snap = await db.collection("tasks").doc(taskId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() || {}) };
}

async function cancelTaskFromEvent(task, event) {
  if (!task) return;
  const metadata = {
    ...(task.metadata || {}),
    externalEvent: {
      ...(task.metadata?.externalEvent || {}),
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    },
  };
  await db
    .collection("tasks")
    .doc(task.id)
    .set(
      {
        completed: true,
        metadata,
        updatedAt: new Date(),
      },
      { merge: true },
    );
}

async function ensureReminderForEvent(userId, task, timing, provider, force = false) {
  if (!timing?.reminderIso || !task) return;
  try {
    await scheduleTaskReminder(
      userId,
      task,
      { scheduledTime: timing.reminderIso },
      {
        source: provider,
        timezone: timing.timezone,
        force: force === true,
      },
    );
  } catch (err) {
    console.warn("[CalendarSync] scheduleTaskReminder failed", err?.message || err);
  }
}

function buildTaskMetadata(event, timing, provider) {
  return {
    origin: provider,
    externalEvent: {
      provider,
      externalId: event.externalId,
      calendarId: event.calendarId,
      status: event.status,
      startTime: timing.startIso,
      endTime: event.endTime || null,
      timezone: timing.timezone,
      allDay: !!event.allDay,
      joinUrl: event.joinUrl || null,
    },
  };
}

async function createTaskFromEvent(userId, event, provider, meetingSettings = {}) {
  const timing = computeTimingFromEvent(event, meetingSettings);
  const payload = {
    title: event.title || "Meeting",
    details: buildDetailsFromEvent(event),
    category: "Meetings",
    date: timing.date,
    reminderTime: timing.time,
    link: event.joinUrl || event.raw?.htmlLink || "",
    metadata: buildTaskMetadata(event, timing, provider),
    source: provider,
  };

  const task = await createTask(userId, payload, {
    origin: provider,
    silent: true,
    skipReminder: true,
    timezone: timing.timezone,
  });
  await ensureReminderForEvent(userId, task, timing, provider, true);
  return { task, timing };
}

async function updateTaskFromEvent(userId, task, event, provider, meetingSettings = {}) {
  const timing = computeTimingFromEvent(event, meetingSettings);
  const updates = {};
  if (task.title !== (event.title || "Meeting")) updates.title = event.title || "Meeting";
  const newDetails = buildDetailsFromEvent(event);
  if ((task.details || "") !== newDetails) updates.details = newDetails;
  const newDate = timing.date;
  if (task.date !== newDate) updates.date = newDate;
  if ((task.reminderTime || null) !== timing.time) {
    if (timing.time) {
      updates.reminderTime = timing.time;
    } else if (task.reminderTime) {
      updates.reminderTime = null;
    }
  }
  const newLink = event.joinUrl || event.raw?.htmlLink || "";
  if ((task.link || "") !== newLink) {
    if (newLink) updates.link = newLink;
    else updates.link = null;
  }
  updates.metadata = buildTaskMetadata(event, timing, provider);
  updates.updatedAt = new Date();
  await db.collection("tasks").doc(task.id).set(updates, { merge: true });
  const mergedTask = { ...task, ...updates };
  await ensureReminderForEvent(userId, mergedTask, timing, provider, true);
  return mergedTask;
}

async function syncEventsToTasksFromStore(
  userId,
  { provider = "google_calendar", windowDays = DEFAULT_WINDOW_DAYS, meetingSettings = {} } = {},
) {
  const stats = { created: 0, updated: 0, cancelled: 0 };
  const windowStart = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000).toISOString();
  const events = await listEventsForWindow(userId, provider, { windowStart, windowEnd });
  if (!events.length) return stats;
  const createdForDigest = [];
  const autoCreateTasks = meetingSettings.autoCreate !== false;

  for (const event of events) {
    try {
      if (event.status === "cancelled") {
        if (event.taskId) {
          const task = await fetchTaskById(event.taskId);
          if (task) {
            await cancelTaskFromEvent(task, event);
            stats.cancelled += 1;
          }
        }
        continue;
      }

      let task = event.taskId ? await fetchTaskById(event.taskId) : null;
      if (!task) {
        if (!autoCreateTasks) continue;
        const { task: newTask, timing } = await createTaskFromEvent(
          userId,
          event,
          provider,
          meetingSettings,
        );
        await linkEventToTask(userId, provider, event.externalId, newTask.id);
        stats.created += 1;
        createdForDigest.push({
          title: newTask.title,
          date: newTask.date,
          reminderTime: newTask.reminderTime || timing.time || null,
          link: newTask.link || event.joinUrl || null,
        });
        continue;
      }

      await updateTaskFromEvent(userId, task, event, provider, meetingSettings);
      stats.updated += 1;
    } catch (err) {
      log(`task-sync user=${userId} event=${event.externalId} failed:`, err?.message || err);
    }
  }

  if (createdForDigest.length) {
    await sendCalendarDigestNotification(userId, createdForDigest);
  }
  return stats;
}

export async function syncGoogleAccount(userId, options = {}) {
  const stats = {
    calendars: 0,
    eventsFetched: 0,
    eventsUpserted: 0,
    resetCount: 0,
  };
  const windowDays = options.windowDays || DEFAULT_WINDOW_DAYS;
  const adapter = getCalendarAdapter("google_calendar");
  if (!adapter) throw new Error("No calendar adapter configured for Google Calendar");

  const { tokens, integration } = await ensureFreshAccessToken(userId);
  const userSnap = await db.collection("users").doc(String(userId)).get();
  const userData = userSnap.exists ? userSnap.data() || {} : {};
  const meetingPref = userData?.preferences?.meetings || {};
  const meetingSettings = {
    autoCreate: meetingPref.autoCreateCalendarTasks !== false,
    defaultReminderMinutes:
      clampMinutes(
        meetingPref.defaultReminderMinutes ??
          meetingPref.defaultMeetingReminderMinutes ??
          DEFAULT_REMINDER_MINUTES,
      ) ?? DEFAULT_REMINDER_MINUTES,
  };

  await upsertIntegrationAccount({
    userId,
    provider: "google_calendar",
    accountId: "primary",
    accessToken: tokens?.access_token || null,
    refreshToken: tokens?.refresh_token || null,
    tokenExpiry: tokens?.expiry_date || null,
    metadata: {
      calendars: integration?.calendars || [],
      sync: integration?.sync || {},
    },
  });

  const calendars = Array.isArray(integration?.calendars)
    ? integration.calendars.filter((c) => !!c.selected)
    : [];
  if (!calendars.length) {
    log(`user=${userId} has no selected calendars`);
    return stats;
  }

  const perCalSync = { ...(integration?.sync?.perCal || {}) };

  for (const calendar of calendars) {
    try {
      const syncToken = options.forceFull ? null : perCalSync?.[calendar.id]?.syncToken || null;
      const result = await adapter.fetchEvents(tokens.access_token, calendar, {
        windowDays,
        syncToken,
      });
      stats.calendars += 1;
      stats.eventsFetched += result.events.length;
      if (result.reset) {
        stats.resetCount += 1;
        perCalSync[calendar.id] = { syncToken: null, lastFullSync: null };
        continue;
      }
      for (const ev of result.events) {
        const normalized = adapter.normalizeEvent(ev, calendar);
        await upsertExternalEvent(userId, "google_calendar", normalized);
        stats.eventsUpserted += 1;
      }
      perCalSync[calendar.id] = {
        ...(perCalSync[calendar.id] || {}),
        syncToken: result.nextSyncToken || null,
        lastFullSync: perCalSync[calendar.id]?.lastFullSync || (syncToken ? perCalSync[calendar.id]?.lastFullSync : new Date().toISOString()),
      };
      await markIntegrationAccountSync(userId, "google_calendar", calendar.id, {
        syncToken: result.nextSyncToken || null,
        status: "ok",
        lastSyncAt: new Date().toISOString(),
      });
    } catch (err) {
      log(`user=${userId} calendar=${calendar.id} failed:`, err?.message || err);
      perCalSync[calendar.id] = {
        ...(perCalSync[calendar.id] || {}),
        error: err?.message || "sync_failed",
      };
      await markIntegrationAccountSync(userId, "google_calendar", calendar.id, {
        syncToken: perCalSync[calendar.id]?.syncToken || null,
        status: "error",
      });
    }
  }

  await saveUserGoogleIntegration(userId, {
    ...(integration || {}),
    sync: {
      ...(integration?.sync || {}),
      perCal: perCalSync,
      lastRun: dayjs().toISOString(),
      status: "ok",
    },
  });

  const taskStats = await syncEventsToTasksFromStore(userId, {
    provider: "google_calendar",
    windowDays,
    meetingSettings,
  });
  return { ...stats, ...taskStats };
}

export async function syncMultipleGoogleAccounts(userIds = []) {
  const summary = [];
  for (const userId of userIds) {
    try {
      const stats = await syncGoogleAccount(userId);
      summary.push({ userId, ...stats });
    } catch (err) {
      summary.push({ userId, error: err?.message || String(err) });
    }
  }
  return summary;
}
