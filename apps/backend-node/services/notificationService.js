import dayjs from "../utils/dayjs.js";
import { db } from "./firebaseAdmin.js";
import { providers } from "./integrations/index.js";
import { send as sendWhatsApp } from "./integrations/whatsappProvider.js";
import { sendPWA } from "./integrations/pwaProvider.js";
import { sendEmail } from "./integrations/emailProvider.js";
import { makeCallForUser, sendSMSForUser } from "./twilioService.js";
import { sendPushNotification } from "./notifyService.js";
import { getUserPrefs } from "./userPrefService.js";
import { getEffectiveAccess } from "./planService.js";
import { getWorkspace } from "./workspaceService.js";
import { canUseFeature, FEATURE_KEYS } from "./entitlements.js";
import { buildReminderBrandCopy } from "./notificationTemplates.js";
import {
  enqueueNotificationJob,
  postingServiceAvailable,
} from "./postingServiceClient.js";
import { offlineMessagesEnabled } from "../config/flags.js";
import { normalizeNotificationSound } from "../utils/notificationSound.js";

export async function sendNotification(
  userId,
  message,
  channel = "all",
  options = {},
) {
  const snap = await db.collection("users").doc(String(userId)).get();
  const data = snap.exists ? snap.data() : {};
  const prefs = data?.preferences?.notifications || {};

  const supported = ["whatsapp", "slack"];
  let channels = [];
  if (channel === "all") {
    channels = supported.filter(
      (c) => !!prefs[c] || (c === "slack" && !!process.env.SLACK_WEBHOOK_URL),
    );
  } else if (Array.isArray(channel)) {
    channels = channel.filter((c) => supported.includes(c));
  } else if (typeof channel === "string") {
    if (supported.includes(channel)) channels = [channel];
  }

  const results = {};
  for (const c of channels) {
    const provider = providers[c];
    if (!provider?.send) continue;
    try {
      results[c] = await provider.send(userId, message, options[c] || options);
    } catch (e) {
      results[c] = { error: String(e?.message || e) };
    }
  }
  return results;
}

const CHANNEL_ENV_FLAGS = {
  // Channels default to enabled; set ENABLE_* env vars to "false" to disable at runtime.
  whatsapp: resolveChannelFlag("ENABLE_WHATSAPP"),
  email: resolveChannelFlag("ENABLE_EMAIL"),
  pwa: resolveChannelFlag("ENABLE_PWA"),
  voice: resolveChannelFlag("ENABLE_VOICE"),
  sms: resolveChannelFlag("ENABLE_SMS"),
};

const ALL_CHANNELS = ["whatsapp", "email", "pwa", "voice", "sms"];
const ENABLE_POSTING_SERVICE_NOTIFICATIONS = resolveChannelFlag(
  "ENABLE_POSTING_SERVICE_NOTIFICATIONS",
  false,
);
const FREE_VOICE_REMINDERS_PER_DAY = (() => {
  const value = Number(process.env.FREE_VOICE_REMINDERS_PER_DAY || 2);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 2;
})();

function isChannelEnabled(flagValue) {
  if (flagValue === undefined || flagValue === null) return false;
  const normalized = String(flagValue).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function resolveChannelFlag(envKey, defaultValue = true) {
  const raw = process.env[envKey];
  if (raw === undefined || raw === null || raw === "") return defaultValue;
  return isChannelEnabled(raw);
}

async function hasWorkspaceVoiceEntitlement(workspaceId) {
  if (!workspaceId) return false;
  try {
    const workspace = await getWorkspace(workspaceId);
    return canUseFeature(
      { workspace, userRole: "viewer" },
      FEATURE_KEYS.voiceReminders,
    );
  } catch (err) {
    console.warn(
      "[Notification] workspace voice entitlement lookup failed",
      err?.message || err,
    );
    return false;
  }
}

async function getFreeVoiceUsageToday(
  userId,
  dateKey = dayjs().format("YYYY-MM-DD"),
) {
  if (!userId) return 0;
  try {
    const snap = await db
      .collection("usage")
      .doc(`${String(userId)}_${dateKey}`)
      .get();
    if (!snap.exists) return 0;
    return Number(snap.data()?.voiceReminderCall || 0);
  } catch (err) {
    console.warn(
      "[Notification] free voice usage lookup failed",
      err?.message || err,
    );
    return 0;
  }
}

async function incrementFreeVoiceUsage(
  userId,
  dateKey = dayjs().format("YYYY-MM-DD"),
) {
  if (!userId) return;
  const ref = db.collection("usage").doc(`${String(userId)}_${dateKey}`);
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const current = snap.exists
      ? Number(snap.data()?.voiceReminderCall || 0)
      : 0;
    txn.set(
      ref,
      {
        voiceReminderCall: current + 1,
        updatedAt: new Date(),
      },
      { merge: true },
    );
  });
}

async function resolveVoiceDeliveryPolicy(userId, meta = {}) {
  const workspaceId = meta?.workspaceId || null;
  if (await hasWorkspaceVoiceEntitlement(workspaceId)) {
    return {
      allowed: true,
      isUnlimited: true,
      source: "workspace",
      limit: null,
      used: null,
      remaining: null,
      dateKey: dayjs().format("YYYY-MM-DD"),
    };
  }

  const access = await getEffectiveAccess(userId);
  if (access?.entitlements?.voiceReminders === true) {
    return {
      allowed: true,
      isUnlimited: true,
      source: "plan",
      limit: null,
      used: null,
      remaining: null,
      access,
      dateKey: access?.date || dayjs().format("YYYY-MM-DD"),
    };
  }

  const dateKey = access?.date || dayjs().format("YYYY-MM-DD");
  const limit = FREE_VOICE_REMINDERS_PER_DAY;
  const used = await getFreeVoiceUsageToday(userId, dateKey);

  return {
    allowed: limit > 0 && used < limit,
    isUnlimited: false,
    source: "free_allowance",
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    access,
    dateKey,
  };
}

function normalizeChannelName(channel) {
  if (!channel) return null;
  const normalized = String(channel).trim().toLowerCase();
  if (!normalized) return null;
  if (
    normalized === "voice_call" ||
    normalized === "voice-call" ||
    normalized === "call" ||
    normalized === "phone"
  ) {
    return "voice";
  }
  if (
    normalized === "push" ||
    normalized === "webpush" ||
    normalized === "web-push"
  ) {
    return "pwa";
  }
  if (normalized === "text" || normalized === "sms_text") {
    return "sms";
  }
  return normalized;
}

function toNormalizedSet(values) {
  if (!Array.isArray(values)) return null;
  const set = new Set();
  values.forEach((value) => {
    const normalized = normalizeChannelName(value);
    if (normalized) set.add(normalized);
  });
  return set.size ? set : null;
}

function channelPermitted(channel, ctx) {
  if (!channel) return false;
  if (channel !== "pwa" && !CHANNEL_ENV_FLAGS[channel]) return false;
  if (ctx.allowedSet && !ctx.allowedSet.has(channel)) return false;
  if (ctx.limitSet && !ctx.limitSet.has(channel)) return false;
  if (channel === "voice" && !ctx.includeVoice) return false;

  if (channel === "whatsapp") return ctx.prefs.enable_whatsapp;
  if (channel === "email") return ctx.prefs.enable_email;
  if (channel === "pwa") return ctx.prefs.enable_pwa;
  if (channel === "voice") return ctx.prefs.enable_voice;
  if (channel === "sms") return ctx.prefs.enable_sms;

  return false;
}

async function resolveUserChannels(userId, overrides, options = {}) {
  const includeVoice = options.includeVoice !== false;
  const allowedSet = toNormalizedSet(options.allowed);
  const limitSet = toNormalizedSet(options.limitTo);
  const returnContext = options.returnContext === true;
  const disableFallback = options.disableFallback === true;
  const requested = Array.isArray(overrides)
    ? overrides.map(normalizeChannelName).filter(Boolean)
    : [];
  const prefs = await getUserPrefs(userId);
  const ctx = { includeVoice, allowedSet, limitSet, prefs };

  let channels = (requested.length ? requested : ALL_CHANNELS)
    .map(normalizeChannelName)
    .filter(Boolean)
    .filter((channel) => channelPermitted(channel, ctx));

  if (!channels.length) {
    const fallbackSource = limitSet ? Array.from(limitSet) : ALL_CHANNELS;
    channels = fallbackSource
      .map(normalizeChannelName)
      .filter(Boolean)
      .filter((channel) =>
        channelPermitted(channel, { ...ctx, limitSet: null }),
      );
  }

  if (!channels.length) {
    channels = disableFallback ? [] : ["pwa"];
  }

  const unique = Array.from(new Set(channels));
  if (returnContext) {
    return {
      channels: unique,
      prefs,
      requested,
    };
  }
  return unique;
}

function ensureArray(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items.filter(Boolean);
  return [items].filter(Boolean);
}

async function loadUserContacts(userId) {
  try {
    const snap = await db.collection("users").doc(String(userId)).get();
    const data = snap.exists ? snap.data() : {};
    const notifications = data?.preferences?.notifications || {};
    const integrations = data?.integrations || {};
    const whatsapp =
      integrations?.whatsapp?.phone ||
      notifications?.whatsapp_phone ||
      data?.phone ||
      null;
    const sms =
      notifications?.phone_sms ||
      integrations?.sms?.phone ||
      integrations?.whatsapp?.phone ||
      data?.phone ||
      null;
    const voice =
      notifications?.phone_voice ||
      integrations?.sms?.phone ||
      integrations?.whatsapp?.phone ||
      data?.phone ||
      null;
    const email =
      integrations?.email ||
      data?.email ||
      data?.profile?.email ||
      data?.preferences?.email ||
      notifications?.email ||
      null;
    return { whatsapp, sms, voice, email };
  } catch (err) {
    console.warn("[Notification] loadUserContacts failed", err?.message || err);
    return {};
  }
}

async function loadNativePushTarget(userId) {
  try {
    const snap = await db.collection("users").doc(String(userId)).get();
    const data = snap.exists ? snap.data() : {};
    const token = String(data?.pushToken || "").trim();
    if (!token) return null;
    return {
      token,
      platform: data?.pushTokenPlatform || null,
      permissionState: data?.pushPermissionState || null,
    };
  } catch (err) {
    console.warn(
      "[Notification] loadNativePushTarget failed",
      err?.message || err,
    );
    return null;
  }
}

function pickRecipientForChannel(channel, contacts = {}) {
  if (channel === "whatsapp")
    return contacts.whatsapp || contacts.sms || contacts.voice || null;
  if (channel === "sms")
    return contacts.sms || contacts.whatsapp || contacts.voice || null;
  if (channel === "voice")
    return contacts.voice || contacts.sms || contacts.whatsapp || null;
  if (channel === "email") return contacts.email || null;
  return null;
}

function describeItem(item) {
  const title = item?.title || item?.text || item?.message || "Untitled task";
  const parts = [];
  if (item?.date) {
    const formatted = dayjs(item.date).isValid()
      ? dayjs(item.date).format("MMM D")
      : null;
    if (formatted) parts.push(formatted);
  }
  const timeToken =
    item?.reminderTime || item?.time || item?.scheduledTime || item?.when;
  if (timeToken) parts.push(timeToken);
  return parts.length ? `${title} (${parts.join(" · ")})` : title;
}

function buildGroupedMessage(title, items, options = {}) {
  const header = title || "PlanCraftAI Update";
  const list = ensureArray(items);
  if (!list.length) {
    const base = options.fallback || "Stay on track with PlanCraftAI ✨";
    return `${header}\n\n${base}`;
  }
  const lines = list.map((item, idx) => `${idx + 1}. ${describeItem(item)}`);
  const closing = options.closing ?? "Stay on track with PlanCraftAI ✨";
  return `${header}\n\n${lines.join("\n")}\n\n${closing}`;
}

function buildVoiceSummary(intro, items) {
  const leadIn = intro || "Here is your reminder summary";
  const titles = ensureArray(items)
    .map((item) => item?.title || item?.text || item?.message)
    .filter(Boolean);

  if (!titles.length)
    return `${leadIn}. No specific reminder details available.`;

  if (titles.length === 1) {
    const only = titles[0];
    return `${leadIn}. The reminder says: ${only}. Repeating: ${only}.`;
  }

  const last = titles.pop();
  const middle = titles.slice(1);
  const first = titles[0];
  const middleJoined = middle.length
    ? ` Then: ${middle.join(". Then: ")}.`
    : "";
  return `${leadIn}. First: ${first}.${middleJoined} Finally: ${last}.`;
}

function formatActionInboxTiming(suggestion = {}) {
  const timezone = suggestion?.timezone || "UTC";
  if (suggestion?.scheduledTime) {
    const local = dayjs(suggestion.scheduledTime).tz(timezone);
    if (local.isValid()) return local.format("MMM D [at] h:mm A");
  }
  if (suggestion?.dueDate) {
    const local = dayjs.tz(
      `${suggestion.dueDate} 09:00`,
      "YYYY-MM-DD HH:mm",
      timezone,
    );
    if (local.isValid()) return local.format("MMM D");
  }
  return null;
}

function describeActionInboxNudgeReason(reason) {
  const normalized = String(reason || "")
    .trim()
    .toLowerCase();
  if (normalized === "deadline_today") return "This deadline is today.";
  if (normalized === "deadline_2d") return "This deadline is close.";
  if (normalized === "scheduled_2h")
    return "This scheduled item is coming up soon.";
  if (normalized === "scheduled_1d") return "This scheduled item is tomorrow.";
  if (normalized === "deadline_7d") return "This deadline is approaching.";
  return "This suggestion deserves another look.";
}

export async function notifyActionInboxNudge(
  userId,
  suggestionInput = {},
  options = {},
) {
  const suggestion = suggestionInput || {};
  const titleText =
    suggestion.displayTitle || suggestion.title || "Suggested action";
  const timing = formatActionInboxTiming(suggestion);
  const reason =
    options.reason ||
    suggestion.lastSurfacedReason ||
    suggestion.nextReviewReason ||
    null;
  const reasonText = describeActionInboxNudgeReason(reason);
  const title =
    options.title ||
    (reason === "deadline_today"
      ? "Action due today"
      : "Action needs attention");
  const message =
    options.message ||
    [
      `You said you would ${titleText}.`,
      reasonText,
      timing ? `Timing: ${timing}.` : null,
      suggestion.followUpPrompt ||
        "Open PlanCraftAI to confirm it, ignore it, or add the missing details.",
    ]
      .filter(Boolean)
      .join(" ");

  const channelResolution = await resolveUserChannels(
    userId,
    options.channels,
    {
      includeVoice: false,
      allowed: ["whatsapp", "email", "pwa"],
      limitTo: options.limitTo,
      disableFallback: true,
      returnContext: true,
    },
  );
  const channels = channelResolution.channels;
  const contacts = await loadUserContacts(userId);
  const payload = {
    message,
    subject: options.subject || "PlanCraftAI action follow-up",
    whatsappPrimary: options.whatsappTemplate || message,
    whatsappFallback: options.whatsappFallback || message,
    emailMessage: options.emailMessage || message,
    emailHtml: options.emailHtml || null,
    pwa: options.pwa || {
      title,
      body:
        suggestion.followUpPrompt ||
        `${reasonText}${timing ? ` ${timing}.` : ""}`,
      data: {
        type: "action-inbox-nudge",
        suggestionId: suggestion.id || null,
        workspaceId: suggestion.workspaceId || options.workspaceId || null,
        url: "/inbox",
      },
    },
  };

  const deliveries = [];
  for (const channel of channels) {
    try {
      deliveries.push(
        await sendViaChannel(channel, userId, payload, contacts, {
          type: "action_inbox_nudge",
          workspaceId: suggestion.workspaceId || options.workspaceId || null,
          suggestionId: suggestion.id || null,
        }),
      );
      console.log(
        `[Notify] Action inbox nudge sent to ${userId} via ${channel}`,
      );
    } catch (err) {
      console.warn(
        `[Notification] ${channel} failed for action inbox nudge`,
        err?.message || err,
      );
    }
  }

  return { channels, deliveries, message, title };
}

function describeActionInboxDigestOpening(intent = {}, suggestions = []) {
  const pendingCount = Number(intent?.pendingCount || suggestions.length || 0);
  if (!pendingCount) return "Your inbox is clear right now.";
  if (Number(intent?.overdueCount || 0) > 0) {
    return `${intent.overdueCount} inbox item${intent.overdueCount === 1 ? " is" : "s are"} already behind schedule.`;
  }
  if (Number(intent?.dueTodayCount || 0) > 0) {
    return `${intent.dueTodayCount} inbox item${intent.dueTodayCount === 1 ? " needs" : "s need"} attention today.`;
  }
  if (Number(intent?.dueSoonCount || 0) > 0) {
    return `${intent.dueSoonCount} inbox item${intent.dueSoonCount === 1 ? " is" : "s are"} coming up soon.`;
  }
  return pendingCount === 1
    ? "You still have one suggested action waiting in your inbox."
    : `You still have ${pendingCount} suggested actions waiting in your inbox.`;
}

function describeActionInboxDigestItem(suggestion = {}) {
  const title =
    suggestion?.displayTitle || suggestion?.title || "Suggested action";
  const timing = formatActionInboxTiming(suggestion);
  return timing ? `${title} (${timing})` : title;
}

export async function notifyActionInboxDigest(
  userId,
  suggestionsInput = [],
  options = {},
) {
  const suggestions = ensureArray(suggestionsInput).filter(Boolean);
  const intent = options.intent || {};
  const focusTitle =
    intent?.focus?.displayTitle ||
    intent?.focus?.title ||
    suggestions[0]?.displayTitle ||
    suggestions[0]?.title ||
    "Suggested action";
  const title = options.title || "Your Action Inbox Digest";
  const intro = describeActionInboxDigestOpening(intent, suggestions);
  const items = suggestions.slice(0, 3).map((suggestion) => ({
    title: describeActionInboxDigestItem(suggestion),
  }));
  const message =
    options.message ||
    `${intro}\n\nFocus: ${focusTitle}\n${items.map((item, idx) => `${idx + 1}. ${item.title}`).join("\n")}\n\nOpen your inbox to confirm, ignore, or fill in the missing details.`;

  const channelResolution = await resolveUserChannels(
    userId,
    options.channels,
    {
      includeVoice: false,
      allowed: ["whatsapp", "email", "pwa"],
      limitTo: options.limitTo,
      disableFallback: true,
      returnContext: true,
    },
  );
  const channels = channelResolution.channels;
  const contacts = await loadUserContacts(userId);

  const payload = {
    message,
    subject: options.subject || "PlanCraftAI inbox digest",
    whatsappPrimary: options.whatsappTemplate || message,
    whatsappFallback: options.whatsappFallback || message,
    emailMessage: options.emailMessage || message,
    emailHtml:
      options.emailHtml ||
      buildEmailShell(
        "PlanCraftAI inbox digest",
        [
          `<p style="margin:0 0 14px;">${escapeHtml(intro)}</p>`,
          `<p style="margin:0 0 14px;"><strong>Focus:</strong> ${escapeHtml(focusTitle)}</p>`,
          `<ul style="margin:0 0 14px;padding-left:20px;">${items.map((item) => `<li>${escapeHtml(item.title)}</li>`).join("")}</ul>`,
          `<p style="margin:0;">Open your inbox to confirm, ignore, or fill in the missing details.</p>`,
        ].join(""),
      ),
    pwa: options.pwa || {
      title,
      body:
        intro ||
        `${suggestions.length || intent?.pendingCount || 0} items are still waiting in your inbox.`,
      data: {
        type: "action-inbox-digest",
        workspaceId: options.workspaceId || suggestions[0]?.workspaceId || null,
        url: "/inbox",
      },
    },
  };

  const deliveries = [];
  for (const channel of channels) {
    try {
      deliveries.push(
        await sendViaChannel(channel, userId, payload, contacts, {
          type: "action_inbox_digest",
          workspaceId:
            options.workspaceId || suggestions[0]?.workspaceId || null,
        }),
      );
      console.log(
        `[Notify] Action inbox digest sent to ${userId} via ${channel}`,
      );
    } catch (err) {
      console.warn(
        `[Notification] ${channel} failed for action inbox digest`,
        err?.message || err,
      );
    }
  }

  return { channels, deliveries, message, title, focusTitle };
}

async function sendWhatsAppWithFallback(userId, primary, fallback) {
  if (!primary) return sendWhatsApp(userId, fallback);
  try {
    return await sendWhatsApp(userId, primary);
  } catch (err) {
    if (!fallback) throw err;
    console.warn(
      "[Notification] WhatsApp template send failed, attempting fallback",
      err?.message || err,
    );
    return await sendWhatsApp(userId, fallback);
  }
}

function maskRecipient(value) {
  if (!value) return null;
  const s = String(value);
  if (s.length <= 4) return "***";
  return `${s.slice(0, 2)}…${s.slice(-2)}`;
}

function looksLikeHtml(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  return /<\/?[a-z][\s\S]*>/i.test(text);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value) {
  return String(value || "").replace(
    /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g,
    (match) => {
      if (match === "&nbsp;") return " ";
      if (match === "&amp;") return "&";
      if (match === "&lt;") return "<";
      if (match === "&gt;") return ">";
      if (match === "&quot;") return '"';
      if (match === "&#39;") return "'";
      return match;
    },
  );
}

function htmlToText(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n\n")
      .replace(/<\s*li[^>]*>/gi, "- ")
      .replace(/<\/li\s*>/gi, "\n")
      .replace(/<\/(ul|ol)\s*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeVoiceText(value) {
  if (!value) return "";
  return String(value)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
    .replace(/[\u{2600}-\u{27BF}]/gu, " ")
    .replace(/[*_`~#|<>[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildEmailShell(label, bodyHtml) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(label)}</title>
      </head>
      <body style="margin:0;padding:24px;background:#f7f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#24163d;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #eadfff;border-radius:20px;padding:24px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#7b61c9;margin:0 0 14px;">${escapeHtml(label)}</div>
          <div style="font-size:15px;line-height:1.7;color:#24163d;">${bodyHtml}</div>
          <hr style="border:none;border-top:1px solid #efe8ff;margin:18px 0" />
          <p style="color:#7d6b9e;font-size:12px;margin:0;">Sent automatically by PlanCraftAI.</p>
        </div>
      </body>
    </html>`;
}

function resolveEmailContent(payload = {}) {
  if (payload.emailHtml) {
    const html = String(payload.emailHtml);
    return {
      html,
      text: String(payload.message || payload.emailMessage || htmlToText(html)),
    };
  }

  const body = payload.emailMessage ?? payload.message ?? "";
  if (looksLikeHtml(body)) {
    const html = String(body);
    return {
      html,
      text: String(payload.message || htmlToText(html)),
    };
  }

  return {
    html: null,
    text: String(body || ""),
  };
}

function hasPayloadForChannel(channel, payload = {}) {
  if (channel === "sms") return !!payload.smsMessage;
  if (channel === "voice") return !!payload.voiceMessage;
  if (channel === "email")
    return !!payload.emailHtml || !!payload.emailMessage || !!payload.message;
  if (channel === "whatsapp")
    return !!(
      payload.whatsappPrimary ||
      payload.whatsappFallback ||
      payload.message
    );
  if (channel === "pwa") return !!payload.pwa || !!payload.message;
  return false;
}

function shouldUsePostingService(meta = {}) {
  if (!ENABLE_POSTING_SERVICE_NOTIFICATIONS) return false;
  if (meta?.forceDirect === true) return false;
  return postingServiceAvailable();
}

async function sendViaChannel(
  channel,
  userId,
  payload,
  contacts = {},
  meta = {},
) {
  // PWA never needs posting-service; send directly so users always see at least one channel.
  if (channel === "pwa") {
    const sound = normalizeNotificationSound(
      payload?.pwa?.data?.sound ||
        payload?.pwa?.sound ||
        meta?.sound ||
        "default",
    );
    const pwaResult = await sendPWA(
      userId,
      payload.pwa || {
        title: "PlanCraftAI",
        body: payload.message,
        data: payload.pwaData || {},
      },
    );

    const nativeTarget = await loadNativePushTarget(userId);
    if (!nativeTarget?.token) {
      return pwaResult;
    }

    try {
      const nativeResult = await sendPushNotification(
        nativeTarget.token,
        payload.pwa?.title || "PlanCraftAI",
        payload.pwa?.body || payload.message || "You have a new reminder.",
        {
          ...(payload.pwa?.data || {}),
          type: payload.pwa?.data?.type || meta.type || "reminder-due",
          source: "native-fallback",
          platform: nativeTarget.platform || "",
          permissionState: nativeTarget.permissionState || "",
        },
        {
          sound,
        },
      );

      return {
        pwa: pwaResult,
        nativePush: nativeResult,
        success: true,
      };
    } catch (error) {
      console.warn(
        "[Notification] native fallback push failed",
        error?.message || error,
      );
      return {
        pwa: pwaResult,
        nativePushError: error?.message || String(error),
        success: true,
      };
    }
  }

  // Cost guard: disable SMS sends when offline messaging is turned off.
  if (channel === "sms" && !offlineMessagesEnabled()) {
    console.warn(
      "[CostGuard] Offline messaging disabled — skipping SMS delivery",
      {
        userId,
        type: meta.type || null,
      },
    );
    return { skipped: true, reason: "offline_messages_disabled" };
  }

  // Prefer routing through posting-service if available and we have a recipient.
  const normalizedChannel = channel === "voice" ? "voice_call" : channel;
  const postingEnabled = shouldUsePostingService(meta);
  const to = pickRecipientForChannel(channel, contacts);
  const emailContent =
    channel === "email" ? resolveEmailContent(payload) : null;

  if (!hasPayloadForChannel(channel, payload)) {
    console.log("[Notification] skipping channel due to empty payload", {
      channel,
    });
    return null;
  }

  const voicePolicy =
    channel === "voice" ? await resolveVoiceDeliveryPolicy(userId, meta) : null;
  const voiceBody =
    channel === "voice"
      ? sanitizeVoiceText(payload.voiceMessage || payload.message || "")
      : null;
  if (channel === "voice" && !voicePolicy?.allowed) {
    console.info("[Notification] voice delivery skipped by allowance", {
      userId,
      workspaceId: meta.workspaceId || payload.workspaceId || null,
      source: voicePolicy?.source || "unknown",
      used: voicePolicy?.used ?? null,
      limit: voicePolicy?.limit ?? null,
      plan: voicePolicy?.access?.effectivePlan || "free",
    });
    return {
      skipped: true,
      reason: "voice_allowance_reached",
      used: voicePolicy?.used ?? null,
      limit: voicePolicy?.limit ?? null,
    };
  }

  if (postingEnabled && to) {
    try {
      const whatsappTemplate =
        channel === "whatsapp" &&
        payload.whatsappPrimary &&
        typeof payload.whatsappPrimary === "object"
          ? payload.whatsappPrimary
          : null;
      const whatsappBody =
        channel === "whatsapp"
          ? payload.whatsappFallback || payload.message
          : null;
      console.log("[Notification] enqueue posting-service", {
        channel: normalizedChannel,
        to: maskRecipient(to),
        workspaceId: meta.workspaceId || payload.workspaceId || null,
        userId,
        type: meta.type || null,
      });
      const res = await enqueueNotificationJob(
        normalizedChannel,
        {
          to,
          body:
            channel === "whatsapp"
              ? whatsappBody
              : channel === "email"
                ? emailContent?.text || payload.message
                : channel === "sms"
                  ? payload.smsMessage || payload.message
                  : voiceBody,
          html: channel === "email" ? emailContent?.html || null : null,
          template: whatsappTemplate,
          subject: payload.subject || "PlanCraftAI Update",
          audioUrl: payload.voiceOptions?.audioUrl || null,
        },
        { userId, ...meta },
      );
      console.log("[Notification] posting-service enqueued", {
        channel: normalizedChannel,
        to: maskRecipient(to),
        jobId: res?.job?.id || res?.job?.jobId || null,
        workspaceId: meta.workspaceId || payload.workspaceId || null,
      });
      if (
        channel === "voice" &&
        voicePolicy &&
        !voicePolicy.isUnlimited &&
        (res?.job || res?.success)
      ) {
        await incrementFreeVoiceUsage(userId, voicePolicy.dateKey);
      }
      if (res) return res;
    } catch (err) {
      console.warn(
        "[Notification] posting-service send failed; falling back",
        err?.message || err,
      );
    }
  }

  if (channel === "whatsapp") {
    return sendWhatsAppWithFallback(
      userId,
      payload.whatsappPrimary,
      payload.whatsappFallback || payload.message,
    );
  }
  if (channel === "email") {
    return sendEmail(
      userId,
      {
        text: emailContent?.text || payload.message,
        html: emailContent?.html || null,
        subject: payload.subject,
      },
      payload.subject,
    );
  }
  if (channel === "voice") {
    if (!voiceBody) return null;
    const sid = await makeCallForUser(
      userId,
      voiceBody,
      payload.voiceOptions || {},
    );
    if (voicePolicy && !voicePolicy.isUnlimited && sid) {
      await incrementFreeVoiceUsage(userId, voicePolicy.dateKey);
    }
    return sid;
  }
  if (channel === "sms") {
    if (!payload.smsMessage) return null;
    return sendSMSForUser(userId, payload.smsMessage);
  }
  return null;
}

export async function notifyTaskCreated(userId, tasksInput = [], options = {}) {
  const tasks = ensureArray(tasksInput);
  const title = options.title || "🆕 New Tasks Created";
  const message =
    options.message ||
    buildGroupedMessage(title, tasks, {
      fallback: "A new task is ready for you.",
    });
  const subject = options.subject || "PlanCraftAI Update";
  const contacts = await loadUserContacts(userId);

  const channelResolution = await resolveUserChannels(
    userId,
    options.channels,
    {
      includeVoice: false,
      allowed: ["whatsapp", "email", "pwa"],
      limitTo: options.limitTo,
      returnContext: true,
    },
  );
  const channels = channelResolution.channels;

  const defaultPwaBody =
    tasks.length === 1
      ? `“${tasks[0]?.title || "New task"}” is on your list.`
      : `${tasks.length} tasks were just added to your list.`;

  const payload = {
    message,
    subject,
    whatsappPrimary: options.whatsapp,
    whatsappFallback: message,
    emailMessage: options.emailMessage || message,
    pwa: options.pwa || {
      title: tasks.length === 1 ? "Task created" : "Tasks created",
      body: defaultPwaBody,
      data: {
        type: "task-created",
        taskIds: tasks.map((task) => task?.id).filter(Boolean),
      },
    },
  };

  const deliveries = [];
  try {
    const titles = tasks.map((t) => t?.title).filter(Boolean);
    const headline = titles.length
      ? `${titles[0]}${titles.length > 1 ? ` (+${titles.length - 1})` : ""}`
      : "Task";
    console.log(
      `[Notify] Created: ${headline} | Channels=${JSON.stringify(channels)} | Prefs=${JSON.stringify(channelResolution.prefs)}`,
    );
  } catch {}
  for (const channel of channels) {
    try {
      deliveries.push(
        await sendViaChannel(channel, userId, payload, contacts, {
          workspaceId: tasks[0]?.workspaceId || null,
          type: "task_created",
        }),
      );
      console.log(
        `[Notify] Task creation alert sent to ${userId} via ${channel}`,
      );
    } catch (err) {
      console.warn(
        `[Notification] ${channel} failed for task creation`,
        err?.message || err,
      );
    }
  }

  if (!deliveries.length) {
    console.log(
      "[Notification] No delivery channels enabled for task creation alert",
    );
  }

  return deliveries;
}

export async function sendCalendarDigestNotification(
  userId,
  createdTasks = [],
) {
  const tasks = ensureArray(createdTasks).filter(Boolean);
  if (!tasks.length) return null;

  const title =
    tasks.length === 1
      ? "📅 Added a meeting from your calendar"
      : `📅 Added ${tasks.length} meetings from your calendar`;

  const message = buildGroupedMessage(title, tasks, {
    fallback: "Your meetings are ready in PlanCraftAI.",
    closing: "Tap to review and join.",
  });

  const channelResolution = await resolveUserChannels(userId, null, {
    includeVoice: false,
    allowed: ["whatsapp", "email", "pwa"],
    returnContext: true,
  });
  const channels = channelResolution.channels;
  const contacts = await loadUserContacts(userId);

  const payload = {
    message,
    subject: "Calendar sync update",
    whatsappPrimary: message,
    whatsappFallback: message,
    emailMessage: message,
    pwa: {
      title: "Calendar Sync",
      body:
        tasks.length === 1
          ? `${tasks[0].title || "Meeting"} is on your list.`
          : `${tasks.length} meetings were added to your plan.`,
      data: { type: "calendar_sync" },
    },
  };

  const deliveries = [];
  for (const channel of channels) {
    try {
      deliveries.push(
        await sendViaChannel(channel, userId, payload, contacts, {
          type: "calendar_digest",
        }),
      );
      console.log(`[Notify] Calendar digest sent via ${channel}`);
    } catch (err) {
      console.warn(
        "[Notification] calendar digest failed",
        err?.message || err,
      );
    }
  }
  return deliveries;
}

export async function notifyReminderDue(userId, itemsInput = [], options = {}) {
  const reminders = ensureArray(itemsInput);
  const includeVoice = options.includeVoice !== false;

  const brandToneEnabled = options.brandTone !== false;
  let brandCopy = null;
  if (brandToneEnabled) {
    try {
      const identity = await loadNotificationIdentity(userId);
      const callerCta =
        options.ctaUrl ||
        options.deepLink ||
        (options.pwa &&
          options.pwa.data &&
          (options.pwa.data.url ||
            options.pwa.data.cta ||
            options.pwa.data.link)) ||
        reminders[0]?.link ||
        reminders[0]?.context?.meetingLink ||
        reminders[0]?.context?.joinUrl ||
        reminders[0]?.context?.eventLink ||
        null;
      brandCopy = buildReminderBrandCopy({
        name: identity.firstName || identity.displayName,
        reminders,
        timezone: identity.timezone || reminders[0]?.timezone,
        ctaUrl: callerCta,
      });
    } catch (err) {
      console.warn("[Notification] brand copy fallback", err?.message || err);
      brandCopy = null;
    }
  }

  const title = options.title || brandCopy?.headline || "⏰ Task Reminder";
  const message =
    options.message ||
    buildGroupedMessage(title, reminders, {
      fallback: "You have something coming up soon.",
    });

  const voiceMessage =
    includeVoice &&
    (options.voiceMessage ||
      brandCopy?.voiceMessage ||
      buildVoiceSummary("Here is a quick summary of your reminder", reminders));
  const cleanedVoiceMessage = voiceMessage
    ? sanitizeVoiceText(voiceMessage)
    : null;

  const subject =
    options.subject || brandCopy?.subject || "PlanCraftAI Reminder";
  const smsMessageBaseline = brandCopy?.sms || message.replace(/\*/g, "");
  const smsMessage = options.smsMessage || smsMessageBaseline;

  const limitTo = options.limitTo;
  const channelResolution = await resolveUserChannels(
    userId,
    options.channels,
    {
      includeVoice,
      allowed: options.allowed || ALL_CHANNELS,
      limitTo,
      returnContext: true,
    },
  );
  const channels = channelResolution.channels;
  const notificationSound = normalizeNotificationSound(
    options?.sound ||
      channelResolution?.prefs?.notifications?.sound ||
      channelResolution?.prefs?.notifications?.notificationSound ||
      channelResolution?.prefs?.reminders?.sound ||
      "default",
  );
  const contacts = await loadUserContacts(userId);
  const workspaceId =
    options.workspaceId ||
    reminders.find((r) => r?.workspaceId)?.workspaceId ||
    reminders.find((r) => r?.context?.workspaceId)?.context?.workspaceId ||
    null;

  const payload = {
    message,
    subject,
    whatsappPrimary: options.whatsappTemplate || options.whatsapp,
    whatsappFallback:
      options.whatsappFallback || brandCopy?.whatsapp || message,
    emailMessage:
      options.emailMessage ||
      brandCopy?.emailText ||
      brandCopy?.email ||
      message,
    emailHtml: options.emailHtml || brandCopy?.emailHtml || null,
    pwa: {
      title: options.pwa?.title || "Reminder due",
      body: options.pwa?.body || message,
      ...(options.pwa || {}),
      sound: notificationSound,
      data: {
        type: "reminder-due",
        reminderIds: reminders.map((reminder) => reminder?.id).filter(Boolean),
        taskIds: reminders.map((reminder) => reminder?.taskId).filter(Boolean),
        ...(options.pwa?.data || {}),
        sound: notificationSound,
      },
    },
    voiceMessage: cleanedVoiceMessage,
    voiceOptions: options.voiceOptions || {},
    smsMessage: options.sms === false ? null : smsMessage,
  };

  const deliveries = [];
  try {
    const titles = reminders.map((t) => t?.title).filter(Boolean);
    const headline = titles.length
      ? `${titles[0]}${titles.length > 1 ? ` (+${titles.length - 1})` : ""}`
      : "Reminder";
    console.log(
      `[Notify] Reminder due: ${headline} | Channels=${JSON.stringify(channels)} | Prefs=${JSON.stringify(channelResolution.prefs)}`,
    );
  } catch {}
  for (const channel of channels) {
    try {
      const result = await sendViaChannel(channel, userId, payload, contacts, {
        type: "reminder_due",
        workspaceId,
      });
      deliveries.push(result);
      const action =
        result?.job || result?.success
          ? "enqueued"
          : result?.status === "sent"
            ? "sent"
            : result?.skipped
              ? "skipped"
              : "processed";
      console.log(
        `[Notify] Reminder alert ${action} for ${userId} via ${channel}`,
      );
    } catch (err) {
      console.warn(
        `[Notification] ${channel} failed for reminder`,
        err?.message || err,
      );
    }
  }

  if (!deliveries.length) {
    console.log(
      "[Notification] No delivery channels enabled for reminder alert",
    );
  }

  return deliveries;
}

export async function sendTaskNotification(userId, task, options = {}) {
  const tasks = ensureArray(task);
  return notifyTaskCreated(userId, tasks, options);
}

export async function sendReminderNotification(userId, reminder, options = {}) {
  const items = ensureArray(reminder);
  return notifyReminderDue(userId, items, options);
}

async function loadNotificationIdentity(userId) {
  if (!userId) return {};
  try {
    const snap = await db.collection("users").doc(String(userId)).get();
    if (!snap.exists) return {};
    const data = snap.data() || {};
    const displayName =
      data.displayName ||
      data.name ||
      data.fullName ||
      (data.profile && (data.profile.displayName || data.profile.name)) ||
      null;
    const timezone =
      data.timezone ||
      data.tz ||
      (data.preferences && data.preferences.timezone) ||
      (data.settings && data.settings.timezone) ||
      (data.profile && data.profile.timezone) ||
      null;
    const firstName = displayName ? String(displayName).split(" ")[0] : null;
    return { displayName, firstName, timezone };
  } catch (err) {
    console.warn("[Notification] identity lookup failed", err?.message || err);
    return {};
  }
}
