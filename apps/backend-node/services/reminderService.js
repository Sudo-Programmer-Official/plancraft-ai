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
import { sendEmail } from "./integrations/emailProvider.js";
import { sendPWA } from "./integrations/pwaProvider.js";
import { sendSMSForUser, makeCallForUser } from "./twilioService.js";
import { formatLocalTime } from "../utils/timezone.js";
import { extractTime } from "../utils/timeParser.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  // Prefer concrete scheduledTime if provided (assumed already UTC or with zone)
  if (options?.scheduledTime) {
    try {
      when = new Date(options.scheduledTime);
      if (!(when instanceof Date) || isNaN(when.getTime())) throw new Error("Invalid scheduledTime");
      parsed = { task: text, time: when.toISOString() };
    } catch (e) {
      console.warn("[Reminder] Invalid scheduledTime, falling back to GPT:", e?.message);
    }
  }

  // Quick natural-time parse before GPT (usually returns local, no zone)
  if (!parsed) {
    try {
      const localTime = extractTime(text);
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
      console.warn("[Reminder] GPT parse failed; fallback:", e?.message);
    }
  }

  // Fallback heuristic (+1h if GPT parse fails)
  if (!parsed || !parsed.task || !parsed.time) {
    parsed = { task: text, time: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
  }

  // Normalize to UTC for storage. If time came from AI, treat it as user's local wall‑clock.
  if (!when) {
    const tz = options?.timezone || "UTC";
    const whenUtcIso = parsedByAi
      ? isoAsLocalWallToUtc(parsed.time, tz)
      : ensureUtcIso(parsed.time, tz) || new Date(parsed.time).toISOString();
    when = new Date(whenUtcIso);
  }
  if (!(when instanceof Date) || isNaN(when.getTime())) {
    throw new Error("Parsed time invalid");
  }

  const tzForUser = options?.timezone || null;

  // Resolve channels: provided list, else user preferences, else sane default
  let chosenChannels = Array.isArray(channels) && channels.length ? channels.slice() : null
  if (!chosenChannels || !chosenChannels.length) {
    try {
      const doc = await db.collection('users').doc(String(userId)).get()
      const data = doc.exists ? (doc.data() || {}) : {}
      const root = data?.notifications || {}
      const nested = data?.preferences?.notifications || {}
      const prefChannels = Array.isArray(nested.channels)
        ? nested.channels
        : Array.isArray(root.channels)
          ? root.channels
          : null
      const prefDerived = [
        (nested.email ?? root.email) && 'email',
        ((nested.push ?? root.push) || (nested.pwa ?? root.pwa)) && 'pwa',
        (nested.whatsapp ?? root.whatsapp) && 'whatsapp',
        (nested.sms ?? root.sms) && 'sms',
        (nested.voice_call ?? root.voice_call) && 'voice_call',
      ].filter(Boolean)
      const merged = new Set([...(prefChannels || prefDerived)])
      chosenChannels = Array.from(merged)
    } catch {
      chosenChannels = null
    }
  }
  const defaultChannels = ["whatsapp", "pwa", "email"]
  const reminder = {
    task: String(parsed.task || text),
    scheduledTime: when,
    userId: String(userId),
    channels: Array.isArray(chosenChannels) && chosenChannels.length ? chosenChannels : defaultChannels,
    createdAt: new Date(),
    status: "scheduled",
    sentAt: null,
    taskId: options?.taskId || null,
    timezone: tzForUser,
  };

  console.log("[Reminder] Persisting reminder", {
    userId: reminder.userId,
    taskId: reminder.taskId,
    when: reminder.scheduledTime?.toISOString?.(),
    channels: reminder.channels,
  });
  const ref = await db.collection("reminders").add(reminder);
  console.log("[Reminder] Stored docId =", ref.id);
  // If caller requested skipQueue (e.g., batch creation), do not queue here.
  if (!options?.skipQueue) {
    await queueReminder({ id: ref.id, ...reminder });
  } else {
    console.log('[Reminder] skipQueue=true; deferring queue for batch scheduling')
  }
  // By default we DO NOT send immediate confirmations when creating a reminder
  // (this avoids calling external channels at task-create time). Callers may
  // explicitly request a confirmation by passing { sendConfirmation: true }
  // in the options.
  if (options?.sendConfirmation) {
    try {
      const who = getSalutationToken(options);
      await sendWhatsApp(userId, {
        template: "reminder_notification_2",
        // Template expects exactly 3 body params: {{1}} name, {{2}} task, {{3}} local time
        bodyVars: [who, reminder.task, formatLocalTime(when, reminder.timezone || undefined)],
        language: { code: "en_US" },
      });
      console.log("[Reminder] WhatsApp confirmation sent via template");
    } catch (e) {
      const msg = e?.message || "";
      const isTemplateMissing = msg.includes("132001") || msg.includes("Template name does not exist") || msg.includes("404");
      if (isTemplateMissing) {
        console.warn("[Reminder] WhatsApp template missing — falling back to text mode");
        try {
          await sendWhatsApp(userId, `✅ Reminder set: "${reminder.task}" at ${formatLocalTime(when, reminder.timezone || undefined)}`);
          console.log("[Reminder] WhatsApp confirmation sent via text fallback");
        } catch (fallbackErr) {
          console.error("[Reminder] WhatsApp fallback failed:", fallbackErr?.message);
        }
      } else {
        console.error("[Reminder] WhatsApp confirmation failed:", msg);
      }
    }
  } else {
    console.log('[Reminder] Skipping immediate confirmation (options.sendConfirmation not set)');
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
  const when = reminder?.scheduledTime ? formatLocalTime(reminder.scheduledTime, reminder?.timezone || undefined) : "soon";

  console.log("[Scheduler] Executing reminder", { id: reminder?.id, userId, task, when, channels, ts: new Date().toISOString() });
  try { console.log('[Reminder] Channels:', channels) } catch {}

  try {
    if (channels.includes("whatsapp")) {
      try {
        // Send via approved Meta template matching parameter count
        const who = getSalutationToken(reminder);
        const r = await sendWhatsApp(userId, {
          template: "reminder_notification_2",
          bodyVars: [who, task, when],
          language: { code: "en_US" },
        });
        console.log("[Delivery] WhatsApp ok (template)", { userId, id: reminder?.id, result: r });
      } catch (e) {
        const msg = e?.message || "";
        const isTemplateMissing = msg.includes("132001") || msg.includes("Template name does not exist") || msg.includes("404");
        if (isTemplateMissing) {
          console.warn("[WhatsApp] Template missing, falling back to text mode:", msg);
          try {
            const r2 = await sendWhatsApp(userId, `⏰ Reminder: ${task} (${when})`);
            console.log("[Delivery] WhatsApp ok (fallback)", { userId, id: reminder?.id, result: r2 });
          } catch (fallbackErr) {
            console.error("[Delivery] WhatsApp fallback failed:", fallbackErr?.message);
          }
        } else {
          console.error("[Delivery] WhatsApp send failed (other error):", msg);
        }
      }
    }

    if (channels.includes("email")) {
      try {
        const r = await sendEmail(userId, task);
        console.log("[Delivery] Email ok", { userId, id: reminder?.id, result: r });
      } catch (e) {
        console.error("[Delivery] Email send failed:", e?.message);
      }
    }

    if (channels.includes("pwa")) {
      try {
        const r = await sendPWA(userId, task);
        console.log("[Delivery] PWA ok", { userId, id: reminder?.id, result: r });
      } catch (e) {
        console.error("[Delivery] PWA send failed:", e?.message);
      }
    }

    if (channels.includes("sms")) {
      try {
        const sid = await sendSMSForUser(userId, `⏰ Reminder: ${task} (${when})`);
        console.log("[Delivery] SMS ok", { userId, id: reminder?.id, sid });
      } catch (e) {
        console.error("[Delivery] SMS send failed:", e?.message || e);
      }
    }

    if (channels.includes("voice_call")) {
      try {
        const sid = await makeCallForUser(userId, `Reminder: ${task}. Scheduled for ${when}.`);
        console.log("[Delivery] Voice call ok", { userId, id: reminder?.id, sid });
      } catch (e) {
        console.error("[Delivery] Voice call failed:", e?.message || e);
      }
    }
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
    const when = rem?.scheduledTime || rem?.time;
    const ts = when instanceof Date ? when : new Date(when);
    const delay = ts.getTime() - Date.now();
    if (!Number.isFinite(delay)) return;

    console.log(`[Scheduler] Queued reminder id=${id} taskId=${rem?.taskId || "n/a"} at=${ts.toISOString()}`);

    const fire = async () => {
      try { await sendReminder({ ...rem, id }); } catch (e) { console.error("sendReminder error:", e?.message); }
    };

    // Avoid firing multiple reminders exactly simultaneously which can cause
    // collisions with external providers (rate limits, provider throttling).
    // Add a small randomized jitter (configurable via REMINDER_JITTER_MS) so
    // reminders scheduled at the same wall-clock time are staggered.
    const MAX_JITTER_MS = Number(process.env.REMINDER_JITTER_MS || 2000) || 2000
    const jitter = Math.floor(Math.random() * (MAX_JITTER_MS + 1)) // 0..MAX_JITTER_MS

    if (delay <= 0) {
      console.log("[Scheduler] Firing overdue reminder immediately", { id, at: ts.toISOString() });
      // apply small jitter even for overdue reminders to reduce burst
      return setTimeout(fire, jitter)
    }

    const finalDelay = Math.min(delay + jitter, 0x7fffffff)
    setTimeout(fire, finalDelay);
  } catch (e) {
    console.error("queueReminder error:", e);
  }
}
