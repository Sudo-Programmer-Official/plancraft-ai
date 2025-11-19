import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { ensureFreshAccessToken, getUserGoogleIntegration, saveUserGoogleIntegration } from "./googleOAuth.js";
import { ensureFreshOutlookToken, saveUserOutlookIntegration, getUserOutlookIntegration } from "./outlookOAuth.js";
import { upsertIntegrationAccount, markIntegrationAccountSync } from "./integrationAccountService.js";
import {
  upsertExternalEvent,
  listEventsForWindow,
  linkEventToTask,
} from "./externalEventsService.js";
import { detectJoinProvider } from "../utils/joinLink.js";
import { getCalendarAdapter } from "./calendarAdapters/index.js";
import { createTask, scheduleTaskReminder } from "./taskService.js";
import { sendCalendarDigestNotification } from "./notificationService.js";
import { queueReminder } from "./reminderService.js";
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

async function resolveMeetingSettings(userId) {
  const userSnap = await db.collection("users").doc(String(userId)).get();
  const userData = userSnap.exists ? userSnap.data() || {} : {};
  const meetingPref = userData?.preferences?.meetings || {};
  const reminderMinutes =
    clampMinutes(
      meetingPref.defaultReminderMinutes ??
        meetingPref.defaultMeetingReminderMinutes ??
        DEFAULT_REMINDER_MINUTES,
    ) ?? DEFAULT_REMINDER_MINUTES;
  return {
    autoCreate: meetingPref.autoCreateCalendarTasks !== false,
    defaultReminderMinutes: reminderMinutes,
    userTimezone:
      userData?.timezone ||
      userData?.tz ||
      userData?.profile?.timezone ||
      userData?.preferences?.timezone ||
      userData?.settings?.timezone ||
      "UTC",
  };
}

function buildTaskTitle(event) {
  const summary = (event.title || event.raw?.summary || "").trim();
  const safeSummary = summary || "Untitled event";
  const prefix = event.joinUrl ? "Meeting" : "Event";
  return `${prefix}: ${safeSummary}`.trim();
}

function buildDetailsFromEvent(event, timing) {
  const parts = [];
  if (event.description) parts.push(event.description.trim());

  const meta = [];
  if (timing?.localLabel) meta.push(`When: ${timing.localLabel}`);
  if (event.location) meta.push(`Where: ${event.location}`);
  if (event.joinUrl) meta.push(`Join: ${event.joinUrl}`);
  if (event.eventUrl) meta.push(`Calendar: ${event.eventUrl}`);
  if (meta.length) parts.push(meta.join("\n"));

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
  const tz = event.timezone || meetingSettings.userTimezone || "UTC";
  const offsetMinutes = Number.isFinite(event.reminderOffsetMinutes)
    ? event.reminderOffsetMinutes
    : meetingSettings?.defaultReminderMinutes ?? DEFAULT_REMINDER_MINUTES;

  let startLocal = null;
  if (event.startTime) {
    try {
      startLocal = dayjs(event.startTime).tz(tz);
      if (!startLocal.isValid()) startLocal = null;
    } catch {
      startLocal = null;
    }
  }

  const allDay = !!event.allDay;
  const fallback = dayjs().tz(tz);
  const date = startLocal ? startLocal.format("YYYY-MM-DD") : fallback.format("YYYY-MM-DD");
  const time = allDay || !startLocal ? null : startLocal.format("HH:mm");
  const localLabel = startLocal
    ? allDay
      ? `${startLocal.format("ddd, MMM D")} • All day`
      : startLocal.format("ddd, MMM D • h:mm A")
    : null;
  const startIso = startLocal ? startLocal.utc().toISOString() : event.startTime || null;
  const reminderIso =
    startLocal && !allDay
      ? startLocal.subtract(offsetMinutes, "minute").utc().toISOString()
      : null;

  return {
    date,
    time,
    startIso,
    reminderIso,
    timezone: tz,
    localLabel,
    allDay,
    offsetMinutes,
  };
}

async function fetchTaskById(taskId) {
  if (!taskId) return null;
  const snap = await db.collection("tasks").doc(taskId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() || {}) };
}

async function cancelRemindersForTask(taskId, provider) {
  if (!taskId) return;
  try {
    const snap = await db
      .collection("reminders")
      .where("taskId", "==", taskId)
      .where("source", "==", provider)
      .get();
    if (snap.empty) return;
    const batch = db.batch();
    const now = new Date();
    snap.docs.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          status: "cancelled",
          updatedAt: now,
          cancelledAt: now,
        },
        { merge: true },
      );
    });
    await batch.commit();
  } catch (err) {
    console.warn("[CalendarSync] cancelRemindersForTask failed", err?.message || err);
  }
}

async function cancelTaskFromEvent(task, event, provider) {
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
  await cancelRemindersForTask(task.id, provider);
}

async function ensureReminderForEvent(userId, task, timing, provider, context = {}, force = false) {
  if (!timing?.reminderIso || !task) return null;
  try {
    const existingSnap = await db
      .collection("reminders")
      .where("taskId", "==", task.id)
      .where("source", "==", provider)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      const docData = doc.data() || {};
      const scheduledTime = new Date(timing.reminderIso);
      const updates = {
        task: task.title || docData.task || "Meeting",
        scheduledTime,
        timezone: timing.timezone,
        status: "scheduled",
        sentAt: null,
        updatedAt: new Date(),
      };
      const hasContext = context && Object.keys(context).length;
      if (hasContext) updates.context = context;
      await doc.ref.set(updates, { merge: true });
      queueReminder({ id: doc.id, ...docData, ...updates });
      return { id: doc.id, ...docData, ...updates };
    }

    return await scheduleTaskReminder(
      userId,
      task,
      { scheduledTime: timing.reminderIso },
      {
        source: provider,
        timezone: timing.timezone,
        force: force === true,
        context,
      },
    );
  } catch (err) {
    console.warn("[CalendarSync] scheduleTaskReminder failed", err?.message || err);
    return null;
  }
}

function buildTaskMetadata(event, timing, provider) {
  const joinUrl = typeof event.joinUrl === "string" ? event.joinUrl : event.joinUrl?.url || null;
  const eventUrl = typeof event.eventUrl === "string" ? event.eventUrl : event.eventUrl?.url || event.raw?.htmlLink || null;
  const joinProvider =
    event.joinProvider ||
    event.join?.provider ||
    detectJoinProvider(joinUrl) ||
    detectJoinProvider(eventUrl) ||
    null;
  return {
    origin: provider,
    joinProvider,
    externalEvent: {
      provider,
      externalId: event.externalId,
      providerEventId: event.providerEventId || event.externalId,
      occurrenceKey: event.occurrenceKey || null,
      calendarId: event.calendarId,
      status: event.status,
      startTime: timing.startIso,
      endTime: event.endTime || null,
      timezone: timing.timezone,
      allDay: !!event.allDay,
      joinUrl,
      joinProvider,
      eventUrl,
      location: event.location || null,
      localLabel: timing.localLabel || null,
      lastHash: event.lastHash || event.contentHash || null,
    },
  };
}

async function createTaskFromEvent(userId, event, provider, meetingSettings = {}) {
  const timing = computeTimingFromEvent(event, meetingSettings);
  const joinUrl =
    (typeof event.joinUrl === "string" ? event.joinUrl : event.joinUrl?.url) || null;
  const eventLink =
    (typeof event.eventUrl === "string" ? event.eventUrl : event.eventUrl?.url) ||
    event.raw?.htmlLink ||
    null;
  const joinProvider =
    event.joinProvider ||
    event.join?.provider ||
    detectJoinProvider(joinUrl) ||
    detectJoinProvider(eventLink) ||
    null;
  const payload = {
    title: buildTaskTitle(event),
    details: buildDetailsFromEvent(event, timing),
    category: "Meetings",
    date: timing.date,
    reminderTime: timing.time,
    link: joinUrl || eventLink || "",
    join: joinUrl ? { url: joinUrl, provider: joinProvider } : null,
    metadata: buildTaskMetadata(event, timing, provider),
    source: provider,
  };

  const task = await createTask(userId, payload, {
    origin: provider,
    silent: true,
    skipReminder: true,
    timezone: timing.timezone,
  });
  const reminderContext = {
    meetingLink: joinUrl,
    meetingProvider: joinProvider,
    eventLink,
    location: event.location || null,
    localTime: timing.localLabel || null,
  };
  await ensureReminderForEvent(userId, task, timing, provider, reminderContext, true);
  return { task, timing };
}

async function updateTaskFromEvent(userId, task, event, provider, meetingSettings = {}) {
  const timing = computeTimingFromEvent(event, meetingSettings);
  const joinUrl =
    (typeof event.joinUrl === "string" ? event.joinUrl : event.joinUrl?.url) || null;
  const eventLink =
    (typeof event.eventUrl === "string" ? event.eventUrl : event.eventUrl?.url) ||
    event.raw?.htmlLink ||
    null;
  const joinProvider =
    event.joinProvider ||
    event.join?.provider ||
    detectJoinProvider(joinUrl) ||
    detectJoinProvider(eventLink) ||
    null;
  const updates = {};
  const desiredTitle = buildTaskTitle(event);
  if ((task.title || "").trim() !== desiredTitle) updates.title = desiredTitle;
  const newDetails = buildDetailsFromEvent(event, timing);
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
  const newLink = joinUrl || eventLink || "";
  if ((task.link || "") !== newLink) {
    if (newLink) updates.link = newLink;
    else updates.link = null;
  }
  const existingJoinUrl = task.join?.url || null;
  const existingJoinProvider = task.join?.provider || null;
  if (existingJoinUrl !== joinUrl || existingJoinProvider !== joinProvider) {
    updates.join = joinUrl ? { url: joinUrl, provider: joinProvider } : null;
  }
  updates.metadata = buildTaskMetadata(event, timing, provider);
  updates.updatedAt = new Date();
  await db.collection("tasks").doc(task.id).set(updates, { merge: true });
  const mergedTask = { ...task, ...updates };
  const reminderContext = {
    meetingLink: joinUrl,
    meetingProvider: joinProvider,
    eventLink,
    location: event.location || null,
    localTime: timing.localLabel || null,
  };
  await ensureReminderForEvent(userId, mergedTask, timing, provider, reminderContext, true);
  return mergedTask;
}

async function syncEventsToTasksFromStore(
  userId,
  { provider = "google_calendar", windowDays = DEFAULT_WINDOW_DAYS, meetingSettings = {} } = {},
) {
  const stats = { created: 0, updated: 0, cancelled: 0, deleted: 0, skipped: 0 };
  const windowStart = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000).toISOString();
  const events = await listEventsForWindow(userId, provider, { windowStart, windowEnd });
  if (!events.length) return stats;
  const createdForDigest = [];
  const autoCreateTasks = meetingSettings.autoCreate !== false;

  for (const event of events) {
    try {
      if (event.allDay) {
        stats.skipped += 1;
        continue;
      }

      if (event.status === "cancelled" || event.status === "deleted") {
        if (event.taskId) {
          const task = await fetchTaskById(event.taskId);
          if (task) {
            await cancelTaskFromEvent(task, event, provider);
            if (event.status === "deleted") stats.deleted += 1;
            else stats.cancelled += 1;
          }
        } else if (event.status === "deleted") {
          stats.deleted += 1;
        } else {
          stats.cancelled += 1;
        }
        continue;
      }

      let task = event.taskId ? await fetchTaskById(event.taskId) : null;
      if (!task) {
        if (!autoCreateTasks) {
          stats.skipped += 1;
          continue;
        }
        const { task: newTask, timing } = await createTaskFromEvent(
          userId,
          event,
          provider,
          meetingSettings,
        );
        await linkEventToTask(
          userId,
          provider,
          event.externalId,
          event.occurrenceKey || null,
          newTask.id,
          event.lastHash || event.contentHash || null,
          event.accountId || "default",
        );
        stats.created += 1;
        createdForDigest.push({
          title: newTask.title,
          date: newTask.date,
          reminderTime: newTask.reminderTime || timing.time || null,
          link: newTask.link || event.joinUrl || null,
          localLabel: timing.localLabel || null,
        });
        continue;
      }

      const requiresUpdate =
        !event.taskHash || (event.lastHash && event.taskHash !== event.lastHash);
      if (!requiresUpdate) {
        stats.skipped += 1;
        continue;
      }

      const updatedTask = await updateTaskFromEvent(userId, task, event, provider, meetingSettings);
      await linkEventToTask(
        userId,
        provider,
        event.externalId,
        event.occurrenceKey || null,
        updatedTask.id,
        event.lastHash || event.contentHash || null,
        event.accountId || "default",
      );
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
  const accountKey = integration?.accountEmail || integration?.email || "primary";
  const meetingSettings = await resolveMeetingSettings(userId);

  await upsertIntegrationAccount({
    userId,
    provider: "google_calendar",
    accountId: accountKey,
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
      const result = await adapter.fetchEvents(
        tokens.access_token,
        { ...calendar, accountId: accountKey },
        {
          windowDays,
          syncToken,
        },
      );
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
      await markIntegrationAccountSync(userId, "google_calendar", `${accountKey}:${calendar.id}`, {
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
      await markIntegrationAccountSync(userId, "google_calendar", `${accountKey}:${calendar.id}`, {
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

export async function syncOutlookAccount(userId, options = {}) {
  const stats = {
    eventsFetched: 0,
    eventsUpserted: 0,
  };
  const adapter = getCalendarAdapter("outlook_calendar");
  if (!adapter) throw new Error("No calendar adapter configured for Outlook");
  const windowDays = options.windowDays || DEFAULT_WINDOW_DAYS;
  const { tokens, integration } = await ensureFreshOutlookToken(userId);
  const meetingSettings = await resolveMeetingSettings(userId);
  const accountId = integration?.accountEmail || "default";

  await upsertIntegrationAccount({
    userId,
    provider: "outlook_calendar",
    accountId,
    accountEmail: integration?.accountEmail || null,
    accessToken: tokens?.access_token || null,
    refreshToken: tokens?.refresh_token || null,
    tokenExpiry: tokens?.expiry_date || null,
    metadata: {
      profile: integration?.profile || null,
    },
  });

  const calendar = {
    id: "primary",
    accountId,
    accountEmail: integration?.accountEmail || null,
    timeZone: meetingSettings.userTimezone || "UTC",
  };

  const result = await adapter.fetchEvents(tokens.access_token, calendar, { windowDays });
  stats.eventsFetched = result.events.length;
  for (const ev of result.events) {
    const normalized = adapter.normalizeEvent(ev, calendar);
    normalized.accountId = calendar.accountId;
    await upsertExternalEvent(userId, "outlook_calendar", normalized);
    stats.eventsUpserted += 1;
  }

  await markIntegrationAccountSync(userId, "outlook_calendar", `${accountId}:${calendar.id}`, {
    syncToken: null,
    lastSyncAt: new Date().toISOString(),
    status: "ok",
  });

  await saveUserOutlookIntegration(userId, {
    ...(integration || {}),
    connected: true,
    status: "ok",
    lastRun: dayjs().toISOString(),
    token: integration?.token,
  });

  const taskStats = await syncEventsToTasksFromStore(userId, {
    provider: "outlook_calendar",
    windowDays,
    meetingSettings,
  });

  return { ...stats, ...taskStats };
}
