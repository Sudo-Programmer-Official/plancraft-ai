/**
 * Reminder Service (Template-based)
 * PlanCraftAI — End-to-End Reminder Orchestration
 */

import OpenAI from "openai";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { db } from "./firebaseAdmin.js";
import { send as sendWhatsApp } from "./integrations/whatsappProvider.js";
import { notifyReminderDue } from "./notificationService.js";
import { formatLocalTime } from "../utils/timezone.js";
import { extractTime } from "../utils/timeParser.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const REMINDER_CHANNEL_ALLOW_LIST = ['pwa', 'whatsapp', 'email', 'sms', 'voice_call'];
const VOICE_CALL_MIN_LEAD_MS = 60 * 1000;
const ENV_DEFAULT_CHANNELS = Array.isArray(process.env.DEFAULT_REMINDER_CHANNELS?.split?.(','))
  ? process.env.DEFAULT_REMINDER_CHANNELS.split(',').map((c) => String(c || '').trim().toLowerCase()).filter((c) => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
  : null;
const DEFAULT_CHANNELS = (ENV_DEFAULT_CHANNELS && ENV_DEFAULT_CHANNELS.length)
  ? ENV_DEFAULT_CHANNELS
  : ['pwa', 'whatsapp'];
const MAX_DELAY_MS = 24 * 60 * 60 * 1000;

function coerceDateValue(input) {
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

function deriveReminderPrefsFromUser(data = {}) {
  try {
    if (!data || typeof data !== 'object') {
      return { enabled: true, channels: DEFAULT_CHANNELS.slice(0, 2) };
    }
    const root = data?.notifications || {};
    const nested = data?.preferences?.notifications || {};
    const reminders = data?.preferences?.reminders || {};

    const channelCandidates =
      Array.isArray(reminders?.channels) && reminders.channels.length
        ? reminders.channels
        : Array.isArray(nested?.channels) && nested.channels.length
          ? nested.channels
          : Array.isArray(root?.channels) && root.channels.length
            ? root.channels
            : [
                (nested.email ?? root.email) && 'email',
                ((nested.push ?? root.push) || (nested.pwa ?? root.pwa)) && 'pwa',
                (nested.whatsapp ?? root.whatsapp) && 'whatsapp',
                (nested.sms ?? root.sms) && 'sms',
                (nested.voice_call ?? root.voice_call) && 'voice_call',
              ].filter(Boolean);

    const channels = Array.from(
      new Set(
        channelCandidates
          .map((c) => String(c || '').toLowerCase())
          .filter((c) => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
      )
    );

    const enabled =
      reminders?.enabled !== undefined
        ? !!reminders.enabled
        : channels.length > 0 ||
          !!root?.whatsapp ||
          !!root?.push ||
          !!root?.pwa ||
          !!root?.email ||
          !!root?.sms ||
          !!root?.voice_call ||
          !!nested?.whatsapp ||
          !!nested?.push ||
          !!nested?.pwa ||
          !!nested?.email ||
          !!nested?.sms ||
          !!nested?.voice_call;

    const fallback = channels.length ? channels : DEFAULT_CHANNELS.slice(0, 2);
    return { enabled, channels: fallback };
  } catch {
    return { enabled: true, channels: DEFAULT_CHANNELS.slice(0, 2) };
  }
}

function sanitizeReminderChannels(channels = [], scheduledDate, source = '') {
  const now = Date.now();
  const scheduledMs = scheduledDate instanceof Date ? scheduledDate.getTime() : NaN;
  const fallback = DEFAULT_CHANNELS.slice(0, 2);
  const normalized = Array.from(
    new Set(
      (channels || [])
        .map((c) => String(c || '').toLowerCase())
        .filter((c) => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
    )
  );

  const filtered = normalized.filter((c) => {
    if (c !== 'voice_call') return true;
    if (!Number.isFinite(scheduledMs)) return false;
    return scheduledMs - now > VOICE_CALL_MIN_LEAD_MS;
  });

  return filtered.length ? filtered : fallback;
}

function normalizeReminderChannel(channel) {
  if (!channel) return null;
  const normalized = String(channel).trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'voice_call' || normalized === 'voice-call') return 'voice';
  if (normalized === 'push' || normalized === 'webpush' || normalized === 'web-push') return 'pwa';
  if (normalized === 'text' || normalized === 'sms_text') return 'sms';
  return normalized;
}

// Normalize any ISO-like input to a single UTC ISO string.
function ensureUtcIso(isoLike, tzOpt) {
  try {
    if (!isoLike) return null;
    const s = String(isoLike);
    const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(s);
    if (hasZone) return dayjs(s).utc().toISOString();
    const tz = tzOpt || "UTC";
    return dayjs.tz(s, tz, true).utc().toISOString();
  } catch {
    try { return new Date(isoLike).toISOString(); } catch { return null; }
  }
}

// Interpret any ISO (even Z) as a local wall‑clock in tz, then convert to UTC ISO.
function isoAsLocalWallToUtc(isoLike, tzOpt) {
  try {
    const s = String(isoLike || "");
    const tz = tzOpt || "UTC";
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      const date = m[1];
      const hh = m[2];
      const mm = m[3];
      const ss = m[4] || "00";
      return dayjs.tz(`${date} ${hh}:${mm}:${ss}`, tz, true).utc().toISOString();
    }
    return dayjs.tz(s, tz, true).utc().toISOString();
  } catch {
    try { return new Date(isoLike).toISOString(); } catch { return null; }
  }
}

// Choose a single token for template variable {{1}}.
// Never combine title + name (e.g., "King Abhishek").
// Prefer name when available, else a friendly title, else "there".
function getSalutationToken(opts = {}) {
  try {
    const name = String(opts?.displayName || opts?.name || '').trim()
    if (name) return name
    const gender = String(opts?.gender || '').toLowerCase()
    if (gender === 'male') return 'King'
    if (gender === 'female') return 'Queen'
  } catch {}
  return 'there'
}

// ---------------------------------------------
// 1️⃣ CREATE REMINDER (Parse + Store + Queue)
// ---------------------------------------------
export async function createReminderFromText(
  userText,
  userId,
  channels = ["whatsapp"],
  options = {}
) {
  if (!userId) throw new Error("Missing userId");

  const text = String(userText || "").trim();
  if (!text) throw new Error("Empty reminder text");

  let parsed = null;
  let when = null;
  let parsedByAi = false;
  const timezoneOverride = options?.timezone || "UTC";
  const nowOverride =
    options?.now && !Number.isNaN(new Date(options.now).getTime())
      ? new Date(options.now)
      : null;
  const nowMs = nowOverride?.getTime() ?? Date.now();

  // Prefer concrete scheduledTime if provided (assumed already UTC or with zone)
  if (options?.scheduledTime) {
    try {
      when = new Date(options.scheduledTime);
      if (!(when instanceof Date) || isNaN(when.getTime())) throw new Error("Invalid scheduledTime");
      parsed = { task: text, time: when.toISOString() };
    } catch (e) {
      console.warn("[ReminderService:parse] Invalid scheduledTime, falling back to GPT:", e?.message);
    }
  }

  // Quick natural-time parse before GPT (usually returns local, no zone)
  if (!parsed) {
    try {
      const localTime = extractTime(text, nowOverride || undefined);
      if (localTime) parsed = { task: text, time: localTime };
    } catch {}
  }

  // GPT-assisted parsing if not provided
  if (!parsed) {
    try {
      const gpt = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Extract a reminder from text. Return JSON: { task: string, time: ISO8601 string }. Time should reflect the user's spoken request." },
          { role: "user", content: `Reminder request: "${text}"` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });
      const content = gpt?.choices?.[0]?.message?.content || "{}";
      parsed = JSON.parse(content);
      parsedByAi = true;
    } catch (e) {
      console.warn("[ReminderService:ai] GPT parse failed; fallback:", e?.message);
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    parsed = {};
  }

  // Fallback heuristic (+1h if GPT parse fails)
  if (!parsed || !parsed.task || !parsed.time) {
    parsed = { task: text, time: new Date(nowMs + 60 * 60 * 1000).toISOString() };
  }

  // Normalize to UTC for storage. If time came from AI, treat it as user's local wall‑clock.
  if (!when) {
    const tz = timezoneOverride;
    const whenUtcIso = parsedByAi
      ? isoAsLocalWallToUtc(parsed.time, tz)
      : ensureUtcIso(parsed.time, tz) || new Date(parsed.time).toISOString();
    when = new Date(whenUtcIso);
  }
  if (!(when instanceof Date) || isNaN(when.getTime())) {
    throw new Error("Parsed time invalid");
  }

  const tzForUser = timezoneOverride || null;

  // Resolve channels: provided list, else user preferences, else sane default
  let derivedPrefs = null
  try {
    const doc = await db.collection('users').doc(String(userId)).get()
    const data = doc.exists ? (doc.data() || {}) : {}
    derivedPrefs = deriveReminderPrefsFromUser(data)
  } catch {
    derivedPrefs = null
  }

  const requestedChannels = Array.isArray(channels) ? channels.slice() : []
  let candidateChannels = requestedChannels.slice()
  if (!candidateChannels.length && derivedPrefs?.enabled) {
    candidateChannels = derivedPrefs.channels.slice()
  } else if (candidateChannels.length && derivedPrefs?.enabled) {
    candidateChannels = Array.from(new Set([...candidateChannels, ...derivedPrefs.channels]))
  }
  if (!candidateChannels.length) {
    candidateChannels = DEFAULT_CHANNELS.slice()
  }

  const reminderChannels = sanitizeReminderChannels(candidateChannels, when, options?.source)
  const reminder = {
    task: String(parsed.task || text),
    scheduledTime: when,
    userId: String(userId),
    channels: reminderChannels,
    createdAt: new Date(),
    status: "scheduled",
    sentAt: null,
    taskId: options?.taskId || null,
    timezone: tzForUser,
    source: options?.source || 'reminder',
  };
  if (options?.context && typeof options.context === 'object' && Object.keys(options.context).length) {
    reminder.context = options.context;
  }

  const logSource = options?.source || 'manual'
  console.log(`[ReminderService:${logSource}] Persisting reminder`, {
    userId: reminder.userId,
    taskId: reminder.taskId,
    when: reminder.scheduledTime?.toISOString?.(),
    channels: reminder.channels,
  });
  const ref = await db.collection("reminders").add(reminder);
  console.log(`[ReminderService:${logSource}] Stored docId =`, ref.id);
  await queueReminder({ id: ref.id, ...reminder });

  // Confirmation via WhatsApp (template + fallback)
  try {
    if (reminder.channels.includes('whatsapp')) {
      const who = getSalutationToken(options);
      await sendWhatsApp(userId, {
        template: "reminder_notification_2",
        // Template expects exactly 3 body params: {{1}} name, {{2}} task, {{3}} local time
        bodyVars: [who, reminder.task, formatLocalTime(when, reminder.timezone || undefined)],
        language: { code: "en_US" },
      });
      console.log("[ReminderService:delivery] WhatsApp confirmation sent via template");
    }
  } catch (e) {
    const msg = e?.message || "";
    const isTemplateMissing = msg.includes("132001") || msg.includes("Template name does not exist") || msg.includes("404");
    if (isTemplateMissing && reminder.channels.includes('whatsapp')) {
      console.warn("[ReminderService:delivery] WhatsApp template missing — falling back to text mode");
      try {
        await sendWhatsApp(userId, `✅ Reminder set: "${reminder.task}" at ${formatLocalTime(when, reminder.timezone || undefined)}`);
        console.log("[ReminderService:delivery] WhatsApp confirmation sent via text fallback");
      } catch (fallbackErr) {
        console.error("[ReminderService:delivery] WhatsApp fallback failed:", fallbackErr?.message);
      }
    } else if (reminder.channels.includes('whatsapp')) {
      console.error("[ReminderService:delivery] WhatsApp confirmation failed:", msg);
    }
  }

  return { id: ref.id, ...reminder };
}

// ---------------------------------------------
// 2️⃣ SEND REMINDER (Triggered by Scheduler)
// ---------------------------------------------
export async function sendReminder(reminder) {
  const channels = Array.isArray(reminder?.channels) ? reminder.channels : [];
  const userId = String(reminder?.userId || "");
  const task = String(reminder?.task || "");
  const scheduledDate =
    coerceDateValue(
      reminder?.scheduledTime ||
        reminder?.remindAt ||
        reminder?.remind_at ||
        reminder?.time ||
        null,
    ) || null;
  const when = scheduledDate ? formatLocalTime(scheduledDate, reminder?.timezone || undefined) : "soon";
  const source = reminder?.source || 'manual';

  console.log(`[ReminderService:${source}] Executing reminder`, { id: reminder?.id, userId, task, when, channels, ts: new Date().toISOString() });

  const normalizedChannels = Array.isArray(channels)
    ? channels.map((c) => normalizeReminderChannel(c)).filter(Boolean)
    : [];
  const limitTo = normalizedChannels.length ? normalizedChannels : undefined;
  const includeVoice = normalizedChannels.includes('voice');
  const context = reminder?.context && typeof reminder.context === 'object' ? reminder.context : {};
  const locationLine = context.location ? `Where: ${context.location}` : null;
  const meetingLink = context.meetingLink || context.joinUrl || context.link || null;
  const eventLink = meetingLink ? null : (context.eventLink || context.calendarLink || null);
  const linkLine = meetingLink ? `Join: ${meetingLink}` : eventLink ? `Open: ${eventLink}` : null;
  const extras = [locationLine, linkLine].filter(Boolean).join(" • ");
  const fallbackText = `⏰ Reminder: ${task} (${when})${extras ? `. ${extras}` : ""}`;
  const who = getSalutationToken(reminder);

  const reminderPayload = {
    id: reminder?.id || reminder?._id || null,
    taskId: reminder?.taskId || null,
    title: task,
    scheduledTime: scheduledDate ? scheduledDate.toISOString() : null,
    reminderTime: reminder?.reminderTime || null,
    timezone: reminder?.timezone || null,
    context,
    link: meetingLink || eventLink || null,
  };

  try {
    await notifyReminderDue(userId, [reminderPayload], {
      limitTo,
      includeVoice,
      whatsappTemplate: normalizedChannels.includes('whatsapp')
        ? {
            template: "reminder_notification_2",
            bodyVars: [who, task, when],
            language: { code: "en_US" },
          }
        : null,
      whatsappFallback: fallbackText,
      voiceMessage: includeVoice ? `Here is your reminder: ${task}. Scheduled for ${when}.` : null,
      smsMessage: fallbackText,
      subject: `PlanCraftAI Reminder • ${task}`,
      message: fallbackText,
      pwa: {
        title: 'Reminder due',
        body: fallbackText,
        data: {
          type: 'reminder-due',
          reminderId: reminder?.id || reminder?._id || null,
          taskId: reminder?.taskId || null,
          link: meetingLink || eventLink || null,
        },
      },
    });
  } catch (err) {
    console.error("[ReminderService:delivery] notifyReminderDue failed", err?.message || err);
  } finally {
    await db.collection("reminders").doc(String(reminder.id || reminder._id || "")).set({ sentAt: new Date(), status: "sent" }, { merge: true });
  }
}

// ---------------------------------------------
// 3️⃣ QUEUE REMINDER (Timeout Scheduler)
// ---------------------------------------------
export function queueReminder(rem) {
  try {
    const id = String(rem?.id || rem?._id || "");
    const whenRaw = rem?.scheduledTime || rem?.time;

    const toDate = (input) => {
      if (!input) return null;
      if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
      if (typeof input.toDate === 'function') {
        try {
          const converted = input.toDate();
          if (converted instanceof Date && !isNaN(converted.getTime())) return converted;
        } catch {}
      }
      if (typeof input.seconds === 'number') {
        const d = new Date(input.seconds * 1000);
        if (!isNaN(d.getTime())) return d;
      }
      if (typeof input._seconds === 'number') {
        const d = new Date(input._seconds * 1000);
        if (!isNaN(d.getTime())) return d;
      }
      try {
        const parsed = new Date(input);
        if (!isNaN(parsed.getTime())) return parsed;
      } catch {}
      return null;
    };

    const ts = toDate(whenRaw);
    if (!ts) {
      console.warn('[ReminderService:scheduler] Unable to coerce scheduledTime', { id, whenRaw });
      return;
    }

    const delay = ts.getTime() - Date.now();
    if (!Number.isFinite(delay)) return;

    console.log(`[ReminderService:scheduler] Queued reminder id=${id} taskId=${rem?.taskId || "n/a"} at=${ts.toISOString()}`);

    const safeDelay = Math.min(Math.max(delay, 0), MAX_DELAY_MS, 0x7fffffff);
    if (delay > MAX_DELAY_MS) {
      console.warn(`[ReminderService:scheduler] Reminder ${id} scheduled beyond 24h (${(delay / 3600000).toFixed(1)}h). Will re-queue closer to send time.`);
    }

    const fire = async () => {
      try {
        const snap = await db.collection("reminders").doc(id).get();
        if (!snap.exists) {
          console.warn("[ReminderService:scheduler] Reminder doc missing at send time", { id });
          return;
        }
        const data = snap.data() || {};
        if (data?.sentAt || (data?.status && String(data.status).toLowerCase() === "sent")) {
          console.log(`[ReminderService:scheduler] Reminder ${id} already sent; skipping dispatch`);
          return;
        }

        const scheduled =
          coerceDateValue(data?.scheduledTime || data?.time || whenRaw) || ts;
        if (!scheduled) {
          console.warn("[ReminderService:scheduler] Unable to resolve scheduled date when firing", { id });
          return;
        }

        const remaining = scheduled.getTime() - Date.now();
        if (remaining > 1000) {
          console.log(`[ReminderService:scheduler] Re-queuing reminder ${id}; ${Math.ceil(remaining / 60000)}m remaining`);
          return queueReminder({ id, ...data });
        }
        await sendReminder({ id, ...data });
      } catch (e) { console.error("sendReminder error:", e?.message); }
    };

    if (delay <= 0) { console.log("[ReminderService:scheduler] Firing overdue reminder immediately", { id, at: ts.toISOString() }); return fire(); }
    setTimeout(fire, safeDelay);
  } catch (e) {
    console.error("queueReminder error:", e);
  }
}

export async function processReminderBatches(options = {}) {
  const now = new Date();
  const lookbackMinutes = Number.isFinite(options.lookbackMinutes) ? options.lookbackMinutes : 5;
  // The batch worker is a catch-up path. Exact on-time delivery should come from queueReminder().
  // Keep the default horizon at zero so the worker does not fire reminders early.
  const horizonMinutes = Number.isFinite(options.horizonMinutes) ? options.horizonMinutes : 0;
  const limit = Number.isFinite(options.limit) ? options.limit : 20;

  const start = new Date(now.getTime() - lookbackMinutes * 60000);
  const end = new Date(now.getTime() + horizonMinutes * 60000);

  let snap;
  try {
    snap = await db
      .collection("reminders")
      .where("sentAt", "==", null)
      .where("scheduledTime", ">=", start)
      .where("scheduledTime", "<=", end)
      .orderBy("scheduledTime", "asc")
      .limit(limit)
      .get();
  } catch (err) {
    console.warn("[ReminderService:worker] Primary batch query failed; falling back", err?.message || err);
    snap = await db
      .collection("reminders")
      .where("scheduledTime", ">=", start)
      .where("scheduledTime", "<=", end)
      .orderBy("scheduledTime", "asc")
      .limit(limit)
      .get();
  }

  const pending = [];
  snap.forEach((doc) => {
    const data = doc.data() || {};
    if (data?.sentAt) return;
    if (data?.status && String(data.status).toLowerCase() === "sent") return;
    pending.push({ id: doc.id, ...data });
  });

  if (!pending.length) return { processed: 0 };

  for (const reminder of pending) {
    try {
      const scheduled = reminder?.scheduledTime
        ? coerceDateValue(reminder.scheduledTime)
        : null;
      console.log(`[Worker] Sending reminder batch for ${reminder?.userId || "unknown"}`, {
        id: reminder.id,
        scheduled: scheduled?.toISOString?.() || reminder?.scheduledTime || null,
      });
      if (scheduled && scheduled.getTime() > now.getTime()) {
        queueReminder(reminder);
      } else {
        await sendReminder(reminder);
      }
    } catch (err) {
      console.error("[ReminderService:worker] Failed to process reminder", reminder?.id, err?.message || err);
    }
  }

  return { processed: pending.length };
}
