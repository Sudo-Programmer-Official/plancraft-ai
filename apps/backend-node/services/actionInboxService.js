import crypto from "crypto";
import dayjs from "../utils/dayjs.js";
import utc from "dayjs/plugin/utc.js";
import timezonePlugin from "dayjs/plugin/timezone.js";
import { db } from "./firebaseAdmin.js";
import { notifyActionInboxDigest, notifyActionInboxNudge } from "./notificationService.js";
import { createTask } from "./taskService.js";
import { getUserPrefs } from "./userPrefService.js";
import { detectActionSuggestions } from "./openaiService.js";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const CATEGORY_LIST = ["Work", "Health", "Learning", "Personal", "Finance", "Routine", "Other"];
const CONFIDENCE_ORDER = { high: 3, medium: 2, low: 1 };

function sanitizeString(value, fallback = "") {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function coerceDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    try {
      const next = value.toDate();
      return Number.isNaN(next?.getTime?.()) ? null : next;
    } catch {
      return null;
    }
  }
  if (typeof value?.seconds === "number") {
    const next = new Date(value.seconds * 1000);
    return Number.isNaN(next.getTime()) ? null : next;
  }
  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? null : next;
}

function toIso(value) {
  const date = coerceDate(value);
  return date ? date.toISOString() : null;
}

function normalizeDateKey(value) {
  const token = sanitizeString(value, "");
  if (!token) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return token;

  const date = coerceDate(token);
  if (!date) return null;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeScheduledTime(value, dueDate = null) {
  const token = sanitizeString(value, "");
  if (!token) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(token)) return token;
  if (/^\d{2}:\d{2}$/.test(token) && dueDate) return `${dueDate}T${token}`;
  return null;
}

function normalizeConfidence(value, fallback = "medium") {
  const token = sanitizeString(value, fallback).toLowerCase();
  if (token === "high" || token === "medium" || token === "low") return token;
  return fallback;
}

function normalizeConfidenceScore(value, fallback = 0.65) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

function confidenceBand(value, fallback = "medium") {
  const numeric = normalizeConfidenceScore(value, fallback === "high" ? 0.9 : fallback === "low" ? 0.35 : 0.65);
  if (numeric >= 0.85) return "high";
  if (numeric < 0.5) return "low";
  return "medium";
}

function normalizeTimezone(value, fallback = "UTC") {
  const token = sanitizeString(value, fallback);
  if (!token) return fallback;
  try {
    const probe = dayjs().tz(token);
    return probe.isValid() ? token : fallback;
  } catch {
    return fallback;
  }
}

function normalizeCategory(value, title = "", details = "") {
  const token = sanitizeString(value, "");
  if (CATEGORY_LIST.includes(token)) return token;

  const haystack = `${title} ${details}`.toLowerCase();
  if (/\b(tax|invoice|budget|pay|billing|expense|bank|finance)\b/.test(haystack)) return "Finance";
  if (/\b(work|meeting|email|deck|report|submit|review|follow up|client|proposal)\b/.test(haystack)) return "Work";
  if (/\b(workout|doctor|med|medicine|health|walk|run|gym|sleep)\b/.test(haystack)) return "Health";
  if (/\b(read|study|course|learn|class|lecture|practice)\b/.test(haystack)) return "Learning";
  if (/\b(laundry|clean|groceries|call mom|family|home|personal)\b/.test(haystack)) return "Personal";
  if (/\b(daily|routine|habit|morning|evening|weekly)\b/.test(haystack)) return "Routine";
  return "Other";
}

function normalizeReasonList(value = []) {
  const input = Array.isArray(value) ? value : [value];
  const seen = new Set();
  return input
    .map((entry) => sanitizeString(entry, "").toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    })
    .slice(0, 4);
}

function computeUrgency(dueDate) {
  const dateKey = normalizeDateKey(dueDate);
  if (!dateKey) return "medium";

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const target = new Date(`${dateKey}T00:00:00.000Z`);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diffDays <= 1) return "high";
  if (diffDays <= 7) return "medium";
  return "low";
}

function urgencyScore({ dueDate = null, scheduledTime = null, reasons = [] } = {}) {
  if (scheduledTime) {
    const target = dayjs(scheduledTime);
    if (target.isValid()) {
      const diffHours = target.diff(dayjs(), "hour", true);
      if (diffHours <= 24) return 1;
      if (diffHours <= 72) return 0.9;
      if (diffHours <= 168) return 0.75;
      return 0.55;
    }
  }

  const dateKey = normalizeDateKey(dueDate);
  if (dateKey) {
    const urgency = computeUrgency(dateKey);
    if (urgency === "high") return 1;
    if (urgency === "medium") return 0.78;
    return 0.48;
  }

  const reasonSet = new Set(Array.isArray(reasons) ? reasons : []);
  if (reasonSet.has("deadline") || reasonSet.has("urgency")) return 0.65;
  if (reasonSet.has("time_based") || reasonSet.has("follow_up")) return 0.55;
  return 0.3;
}

function recencyScore(value) {
  const date = coerceDate(value);
  if (!date) return 0.35;
  const diffHours = Math.max(0, (Date.now() - date.getTime()) / 3600000);
  if (diffHours <= 12) return 1;
  if (diffHours <= 72) return 0.75;
  if (diffHours <= 168) return 0.5;
  return 0.25;
}

function confidenceScore(level) {
  if (typeof level === "number") return normalizeConfidenceScore(level);
  if (level === "high") return 0.9;
  if (level === "low") return 0.35;
  return 0.65;
}

function priorityScore({
  confidence = "medium",
  confidenceScore: numericConfidence = null,
  dueDate = null,
  scheduledTime = null,
  reasons = [],
  createdAt = null,
  lastDetectedAt = null,
  ignoreCount = 0,
  resurfaceCount = 0,
} = {}) {
  const confidenceComponent =
    typeof numericConfidence === "number" ? normalizeConfidenceScore(numericConfidence) : confidenceScore(confidence);
  const urgencyComponent = urgencyScore({ dueDate, scheduledTime, reasons });
  const recencyComponent = recencyScore(lastDetectedAt || createdAt);

  let score = ((confidenceComponent * 0.5) + (urgencyComponent * 0.4) + (recencyComponent * 0.1)) * 100;

  if (scheduledTime) score += 4;
  if (dueDate && computeUrgency(dueDate) === "high") score += 6;
  if (ignoreCount > 0 && !dueDate && !scheduledTime && confidenceComponent < 0.7) {
    score -= Math.min(ignoreCount * 8, 16);
  }
  if (resurfaceCount > 0 && (dueDate || scheduledTime)) {
    score += Math.min(resurfaceCount * 3, 9);
  }

  return Math.max(1, Math.min(100, Math.round(score)));
}

function taskPriorityFromSuggestion(score) {
  if (score >= 85) return 1;
  if (score >= 65) return 2;
  return 3;
}

function buildFollowUpPrompt({ missingFields = [], needsDate = false, dueDate = null, scheduledTime = null, details = "" } = {}) {
  const fields = new Set(Array.isArray(missingFields) ? missingFields : []);
  if ((needsDate || !dueDate) && !scheduledTime) fields.add("dueDate");

  if (fields.has("dueDate") && fields.has("time")) {
    return "Timing is still open. Add a date or time so this does not slip.";
  }
  if (fields.has("dueDate")) {
    return "No deadline detected yet. Add a due date so this does not slip.";
  }
  if (fields.has("time") && dueDate && !scheduledTime) {
    return "A date was found, but no time was detected. Add one if this needs a precise slot.";
  }
  if (fields.has("details") || !sanitizeString(details, "")) {
    return "This looks actionable, but a little more detail would make follow-through easier.";
  }
  return "";
}

function behaviorRate(stats = {}) {
  const confirmed = Number(stats?.confirmed) || 0;
  const ignored = Number(stats?.ignored) || 0;
  const total = confirmed + ignored;
  if (!total) return 0;
  return (confirmed - ignored) / total;
}

function ignoreRatio(stats = {}) {
  const confirmed = Number(stats?.confirmed) || 0;
  const ignored = Number(stats?.ignored) || 0;
  const total = confirmed + ignored;
  if (!total) return 0;
  return ignored / total;
}

function confirmRatio(stats = {}) {
  const confirmed = Number(stats?.confirmed) || 0;
  const ignored = Number(stats?.ignored) || 0;
  const total = confirmed + ignored;
  if (!total) return 0;
  return confirmed / total;
}

function buildBehaviorMemory(items = []) {
  const memory = {
    categories: {},
    lowConfidence: { confirmed: 0, ignored: 0 },
    missingDate: { confirmed: 0, ignored: 0 },
    vague: { confirmed: 0, ignored: 0 },
  };

  for (const item of Array.isArray(items) ? items : []) {
    const status = item?.status;
    if (status !== "confirmed" && status !== "ignored") continue;

    const category = sanitizeString(item.category, "Other");
    if (!memory.categories[category]) {
      memory.categories[category] = { confirmed: 0, ignored: 0 };
    }
    memory.categories[category][status] += 1;

    const score = normalizeConfidenceScore(item.confidenceScore, confidenceScore(item.confidence));
    if (score < 0.55) {
      memory.lowConfidence[status] += 1;
    }

    if (!item.dueDate && !item.scheduledTime) {
      memory.missingDate[status] += 1;
    }

    if (item.needsDate || (Array.isArray(item.missingFields) && item.missingFields.length > 0) || !sanitizeString(item.details, "")) {
      memory.vague[status] += 1;
    }
  }

  return memory;
}

function applyBehaviorMemory(suggestion, memory = null) {
  if (!suggestion) return suggestion;

  let adjustedScore = normalizeConfidenceScore(suggestion.confidenceScore, confidenceScore(suggestion.confidence));
  const behaviorSignals = [];
  const category = sanitizeString(suggestion.category, "Other");
  const categoryStats = memory?.categories?.[category] || null;
  const categoryTotal = (Number(categoryStats?.confirmed) || 0) + (Number(categoryStats?.ignored) || 0);

  if (categoryTotal >= 3) {
    const net = behaviorRate(categoryStats);
    if (net >= 0.45) {
      adjustedScore += 0.08;
      behaviorSignals.push("category_confirmed_often");
    } else if (net <= -0.45) {
      adjustedScore -= 0.08;
      behaviorSignals.push("category_ignored_often");
    }
  }

  const lowConfidenceTotal = (memory?.lowConfidence?.confirmed || 0) + (memory?.lowConfidence?.ignored || 0);
  if (adjustedScore < 0.55 && lowConfidenceTotal >= 4) {
    if (ignoreRatio(memory.lowConfidence) >= 0.7) {
      adjustedScore -= 0.08;
      behaviorSignals.push("low_confidence_ignored_often");
    } else if (confirmRatio(memory.lowConfidence) >= 0.65) {
      adjustedScore += 0.04;
      behaviorSignals.push("low_confidence_confirmed_often");
    }
  }

  const missingDateTotal = (memory?.missingDate?.confirmed || 0) + (memory?.missingDate?.ignored || 0);
  if ((suggestion.needsDate || !suggestion.dueDate) && missingDateTotal >= 4) {
    if (ignoreRatio(memory.missingDate) >= 0.75) {
      adjustedScore -= 0.06;
      behaviorSignals.push("missing_date_ignored_often");
    } else if (confirmRatio(memory.missingDate) >= 0.65) {
      adjustedScore += 0.03;
      behaviorSignals.push("missing_date_confirmed_often");
    }
  }

  adjustedScore = normalizeConfidenceScore(adjustedScore);
  const nextReasons = Array.isArray(suggestion.reasons) ? [...suggestion.reasons] : [];
  if (behaviorSignals.length && !nextReasons.includes("behavior_memory")) {
    nextReasons.push("behavior_memory");
  }

  return {
    ...suggestion,
    confidence: confidenceBand(adjustedScore),
    confidenceScore: adjustedScore,
    reasons: nextReasons,
    followUpPrompt: buildFollowUpPrompt(suggestion),
    priorityScore: priorityScore({
      ...suggestion,
      confidenceScore: adjustedScore,
      reasons: nextReasons,
    }),
  };
}

function shouldSurfaceDetectedSuggestion(suggestion, existing = null) {
  if (!suggestion) return false;

  const score = normalizeConfidenceScore(suggestion.confidenceScore, confidenceScore(suggestion.confidence));
  const urgency = urgencyScore(suggestion);
  const priorIgnores = Number(existing?.ignoreCount) || 0;

  if (score < 0.25) return false;
  if (score < 0.4 && urgency < 0.75) return false;
  if (priorIgnores >= 2 && !suggestion.dueDate && !suggestion.scheduledTime && score < 0.7) return false;
  return true;
}

function computeMaxResurfaceCount({ dueDate = null, confidence = "medium", needsDate = false } = {}) {
  if (dueDate) return 3;
  if (needsDate || confidence === "low") return 1;
  return 2;
}

function normalizeActionInboxNudgePrefs(value = {}) {
  const channels = Array.isArray(value?.channels)
    ? Array.from(
        new Set(
          value.channels
            .map((entry) => sanitizeString(entry, "").toLowerCase())
            .filter((entry) => ["email", "pwa", "whatsapp"].includes(entry)),
        ),
      )
    : [];
  const digestChannels = Array.isArray(value?.digestChannels || value?.digest_channels)
    ? Array.from(
        new Set(
          (value?.digestChannels || value?.digest_channels)
            .map((entry) => sanitizeString(entry, "").toLowerCase())
            .filter((entry) => ["email", "pwa", "whatsapp"].includes(entry)),
        ),
      )
    : [];

  const urgencyToken = sanitizeString(value?.urgency, "important").toLowerCase().replace(/-/g, "_");
  return {
    enabled: value?.enabled !== false,
    dailyDigest: value?.dailyDigest !== false && value?.daily_digest !== false,
    urgency: urgencyToken === "urgent_only" ? "urgent_only" : "important",
    maxPerSuggestion: Math.min(Math.max(Math.round(Number(value?.maxPerSuggestion) || 2), 1), 3),
    channels: channels.length ? channels : ["pwa", "whatsapp", "email"],
    digestChannels: digestChannels.length ? digestChannels : ["email"],
  };
}

function allowedActionInboxNudgeReasons(prefs = {}) {
  if (prefs?.urgency === "urgent_only") {
    return ["deadline_today", "scheduled_2h"];
  }
  return ["deadline_2d", "deadline_today", "scheduled_2h"];
}

function shouldSendActionInboxNudge(
  suggestion = {},
  nudgePrefs = {},
  { trigger = "manual", now = new Date() } = {},
) {
  const resolvedPrefs = normalizeActionInboxNudgePrefs(nudgePrefs);
  if (!resolvedPrefs.enabled) return false;
  if (trigger !== "scheduled_sweep") return false;
  const reason = sanitizeString(suggestion.lastSurfacedReason || suggestion.nextReviewReason, "");
  const score = normalizeConfidenceScore(suggestion.confidenceScore, confidenceScore(suggestion.confidence));
  const nudgeCount = Number.isFinite(suggestion.nudgeCount) ? suggestion.nudgeCount : 0;
  const lastNudgedAt = coerceDate(suggestion.lastNudgedAt);

  if (!allowedActionInboxNudgeReasons(resolvedPrefs).includes(reason)) return false;
  if (score < 0.75) return false;
  if (!suggestion.dueDate && !suggestion.scheduledTime) return false;
  if (nudgeCount >= resolvedPrefs.maxPerSuggestion) return false;
  if (lastNudgedAt && dayjs(now).diff(dayjs(lastNudgedAt), "hour", true) < 18) return false;
  return true;
}

function nextLocalWindowIso(timezone, { daysFromNow = 1, hour = 9, anchor = null } = {}) {
  const tz = normalizeTimezone(timezone);
  const base = anchor ? dayjs(anchor).tz(tz) : dayjs().tz(tz);
  if (!base.isValid()) return null;
  const target = base.add(daysFromNow, "day").hour(hour).minute(0).second(0).millisecond(0);
  return target.utc().toISOString();
}

function computeNextReviewPlan(suggestion = {}, { now = new Date() } = {}) {
  const timezone = normalizeTimezone(suggestion.timezone || suggestion?.metadata?.timezone || "UTC");
  const current = dayjs(now).tz(timezone);
  const dueDate = normalizeDateKey(suggestion.dueDate);
  const scheduledTime = sanitizeString(suggestion.scheduledTime, "");
  const ignoreCount = Number.isFinite(suggestion.ignoreCount) ? suggestion.ignoreCount : 0;
  const resurfaceCount = Number.isFinite(suggestion.resurfaceCount) ? suggestion.resurfaceCount : 0;
  const maxResurfaceCount = Number.isFinite(suggestion.maxResurfaceCount)
    ? suggestion.maxResurfaceCount
    : computeMaxResurfaceCount(suggestion);

  if (resurfaceCount >= maxResurfaceCount) {
    return { nextReviewAt: null, reason: "resurface_limit_reached" };
  }

  if (ignoreCount >= 2 && !dueDate && !scheduledTime) {
    return { nextReviewAt: null, reason: "ignored_repeatedly" };
  }

  if (scheduledTime) {
    const target = dayjs(scheduledTime).tz(timezone);
    if (target.isValid()) {
      const candidates = [
        { iso: target.subtract(1, "day").utc().toISOString(), reason: "scheduled_1d" },
        { iso: target.subtract(2, "hour").utc().toISOString(), reason: "scheduled_2h" },
      ];
      const nextCandidate = candidates.find((candidate) => dayjs(candidate.iso).isAfter(dayjs(now)));
      if (nextCandidate) return nextCandidate;
    }
  }

  if (dueDate) {
    const target = dayjs.tz(`${dueDate} 09:00`, "YYYY-MM-DD HH:mm", timezone);
    const candidates = [
      { iso: target.subtract(7, "day").utc().toISOString(), reason: "deadline_7d" },
      { iso: target.subtract(2, "day").utc().toISOString(), reason: "deadline_2d" },
      { iso: target.utc().toISOString(), reason: "deadline_today" },
    ];

    const nextCandidate = candidates.find((candidate) => dayjs(candidate.iso).isAfter(dayjs(now)));
    if (nextCandidate) return nextCandidate;
  }

  if (suggestion.needsDate || suggestion.confidence === "low") {
    if (resurfaceCount >= 1) return { nextReviewAt: null, reason: "clarification_stop" };
    return {
      nextReviewAt: nextLocalWindowIso(timezone, { daysFromNow: 1, hour: 9, anchor: current }),
      reason: "clarify_once",
    };
  }

  if (resurfaceCount >= 1) {
    return { nextReviewAt: null, reason: "follow_up_stop" };
  }

  return {
    nextReviewAt: nextLocalWindowIso(timezone, { daysFromNow: 1, hour: 14, anchor: current }),
    reason: "follow_up_once",
  };
}

function sourceHashForText(text) {
  return crypto.createHash("sha1").update(String(text || "").trim().toLowerCase()).digest("hex");
}

function sourceIdentityKey({ sourceHash, rawPhrase }) {
  return [sanitizeString(sourceHash, ""), sanitizeString(rawPhrase, "").toLowerCase()].join("|");
}

function fingerprintForSuggestion({ sourceHash, title, rawPhrase }) {
  return crypto
    .createHash("sha1")
    .update([sourceHash, sanitizeString(title, "").toLowerCase(), sanitizeString(rawPhrase, "").toLowerCase()].join("|"))
    .digest("hex");
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function looksGenericActionTitle(value) {
  const title = sanitizeString(value, "");
  if (!title) return false;
  if (/\b(at|in|for|with|about|to|from|before|after|during|on)\b/i.test(title)) return false;
  const words = title.split(/\s+/).filter(Boolean);
  return words.length <= 3;
}

function cleanDerivedContext(value) {
  const text = sanitizeString(value, "")
    .replace(/\b(today|tomorrow|tonight|this morning|this afternoon|this evening|next week|next month)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[,.\s-]+|[,.\s-]+$/g, "")
    .trim();
  if (!text) return "";
  return text.split(/\s+/).slice(0, 6).join(" ");
}

function deriveTitleContext(actionTitle, sourceText = "") {
  const title = sanitizeString(actionTitle, "");
  const source = sanitizeString(sourceText, "");
  if (!title || !source) return "";

  const escapedTitle = escapeRegex(title.toLowerCase());
  const lowered = source.toLowerCase();
  const patterns = [
    { regex: new RegExp(`${escapedTitle}\\s+(at|in|for|with|about|to)\\s+([^,.!?;]+)`, "i"), format: (match) => `${match[1].toLowerCase()} ${cleanDerivedContext(match[2])}` },
    { regex: new RegExp(`go\\s+to\\s+([^,.!?;]+?)\\s+to\\s+${escapedTitle}`, "i"), format: (match) => `at ${cleanDerivedContext(match[1])}` },
    { regex: new RegExp(`head\\s+to\\s+([^,.!?;]+?)\\s+to\\s+${escapedTitle}`, "i"), format: (match) => `at ${cleanDerivedContext(match[1])}` },
    { regex: new RegExp(`visit\\s+([^,.!?;]+?)\\s+to\\s+${escapedTitle}`, "i"), format: (match) => `at ${cleanDerivedContext(match[1])}` },
  ];

  for (const pattern of patterns) {
    const match = lowered.match(pattern.regex);
    if (!match) continue;
    const formatted = pattern.format(match).trim();
    if (formatted && !title.toLowerCase().includes(formatted.toLowerCase())) {
      return formatted;
    }
  }

  return "";
}

function enrichActionTitle(title, { rawPhrase = "", details = "" } = {}) {
  const base = sanitizeString(title, "").replace(/\s+/g, " ").trim();
  if (!base || !looksGenericActionTitle(base)) return base;

  const candidates = [rawPhrase, details];
  for (const candidate of candidates) {
    const context = deriveTitleContext(base, candidate);
    if (!context) continue;
    const next = `${base} ${context}`.replace(/\s+/g, " ").trim();
    if (next.length <= 160) return next;
  }

  return base;
}

function actionInboxCollection(userId, workspaceId) {
  return db
    .collection("users")
    .doc(String(userId))
    .collection("workspaces")
    .doc(String(workspaceId))
    .collection("actionInbox");
}

function actionSuggestionDoc(userId, workspaceId, suggestionId) {
  return actionInboxCollection(userId, workspaceId).doc(String(suggestionId));
}

function actionInboxMetaDoc(userId, workspaceId, metaId = "digest") {
  return db
    .collection("users")
    .doc(String(userId))
    .collection("workspaces")
    .doc(String(workspaceId))
    .collection("actionInboxMeta")
    .doc(String(metaId));
}

function serializeSuggestion(id, data = {}) {
  const score =
    typeof data.confidenceScore === "number"
      ? normalizeConfidenceScore(data.confidenceScore)
      : typeof data.confidence === "number"
        ? normalizeConfidenceScore(data.confidence)
        : confidenceScore(data.confidence);
  const calculatedPriority = priorityScore({
    confidence: data.confidenceLabel || data.confidence || score,
    confidenceScore: score,
    dueDate: data.dueDate || null,
    scheduledTime: data.scheduledTime || null,
    reasons: Array.isArray(data.reasons) ? data.reasons : [],
    createdAt: data.createdAt || null,
    lastDetectedAt: data.lastDetectedAt || null,
    ignoreCount: Number.isFinite(data.ignoreCount) ? data.ignoreCount : 0,
    resurfaceCount: Number.isFinite(data.resurfaceCount) ? data.resurfaceCount : 0,
  });
  return {
    id,
    title: data.title || "",
    displayTitle: data.displayTitle || data.title || "",
    details: data.details || "",
    rawPhrase: data.rawPhrase || "",
    status: data.status || "pending",
    confidence: confidenceBand(data.confidenceLabel || data.confidence || score),
    confidenceScore: score,
    category: data.category || "Other",
    dueDate: data.dueDate || null,
    scheduledTime: data.scheduledTime || null,
    timeHint: data.timeHint || null,
    reasons: Array.isArray(data.reasons) ? data.reasons : [],
    reason: data.reason || data.rationale || "",
    rationale: data.rationale || data.reason || "",
    urgency: data.urgency || computeUrgency(data.dueDate),
    missingFields: Array.isArray(data.missingFields) ? data.missingFields : [],
    needsDate:
      data.needsDate === true ||
      (Array.isArray(data.missingFields) && (data.missingFields.includes("dueDate") || data.missingFields.includes("time"))),
    followUpPrompt:
      sanitizeString(data.followUpPrompt, "") ||
      buildFollowUpPrompt({
        missingFields: Array.isArray(data.missingFields) ? data.missingFields : [],
        needsDate:
          data.needsDate === true ||
          (Array.isArray(data.missingFields) && (data.missingFields.includes("dueDate") || data.missingFields.includes("time"))),
        dueDate: data.dueDate || null,
        scheduledTime: data.scheduledTime || null,
        details: data.details || "",
      }),
    priorityScore: calculatedPriority,
    timezone: normalizeTimezone(data.timezone || "UTC"),
    sourceType: data.sourceType || "note",
    sourceLabel: data.sourceLabel || "note",
    sourceRefId: data.sourceRefId || null,
    userId: data.userId ? String(data.userId) : null,
    workspaceId: data.workspaceId ? String(data.workspaceId) : null,
    sourceExcerpt: data.sourceExcerpt || "",
    sourceHash: data.sourceHash || null,
    fingerprint: data.fingerprint || null,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    confirmedAt: toIso(data.confirmedAt),
    ignoredAt: toIso(data.ignoredAt),
    nextReviewAt: toIso(data.nextReviewAt),
    nextReviewReason: data.nextReviewReason || null,
    firstDetectedAt: toIso(data.firstDetectedAt),
    lastDetectedAt: toIso(data.lastDetectedAt),
    lastShownAt: toIso(data.lastShownAt),
    lastSurfacedAt: toIso(data.lastSurfacedAt || data.lastShownAt),
    lastSurfacedReason: data.lastSurfacedReason || null,
    lastTriggeredAt: toIso(data.lastTriggeredAt),
    lastTrigger: data.lastTrigger || null,
    lastNudgedAt: toIso(data.lastNudgedAt),
    lastNudgeReason: data.lastNudgeReason || null,
    lastNudgeTrigger: data.lastNudgeTrigger || null,
    lastNudgedChannels: Array.isArray(data.lastNudgedChannels) ? data.lastNudgedChannels : [],
    ignoreCount: Number.isFinite(data.ignoreCount) ? data.ignoreCount : 0,
    resurfaceCount: Number.isFinite(data.resurfaceCount) ? data.resurfaceCount : 0,
    nudgeCount: Number.isFinite(data.nudgeCount) ? data.nudgeCount : 0,
    maxResurfaceCount: Number.isFinite(data.maxResurfaceCount)
      ? data.maxResurfaceCount
      : computeMaxResurfaceCount(data),
    confirmedTaskId: data.confirmedTaskId || null,
  };
}

function sortSuggestions(list = []) {
  return [...list].sort((a, b) => {
    const scoreDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    const confidenceDiff = (b.confidenceScore || 0) - (a.confidenceScore || 0);
    if (confidenceDiff !== 0) return confidenceDiff;
    const bandDiff = (CONFIDENCE_ORDER[b.confidence] || 0) - (CONFIDENCE_ORDER[a.confidence] || 0);
    if (bandDiff !== 0) return bandDiff;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

function normalizeCandidate(candidate = {}, { sourceType, sourceLabel, sourceRefId, sourceExcerpt, sourceHash, timezone }) {
  const details = sanitizeString(candidate.details, "").slice(0, 500);
  const rawPhraseSeed = sanitizeString(candidate.rawPhrase, candidate.title || candidate.displayTitle || "").slice(0, 240);
  const enrichedBaseTitle = enrichActionTitle(candidate.title || candidate.displayTitle, {
    rawPhrase: rawPhraseSeed,
    details,
  }).slice(0, 160);
  if (!enrichedBaseTitle) return null;

  const title = enrichedBaseTitle;
  const displayTitle = enrichActionTitle(candidate.displayTitle || title, {
    rawPhrase: rawPhraseSeed,
    details,
  }).slice(0, 160);
  const rawPhrase = rawPhraseSeed || title;
  const dueDate = normalizeDateKey(candidate.dueDate || candidate.date || null);
  const scheduledTime = normalizeScheduledTime(candidate.scheduledTime, dueDate);
  const confidenceScoreValue =
    typeof candidate.confidence === "number"
      ? normalizeConfidenceScore(candidate.confidence, dueDate || scheduledTime ? 0.9 : 0.65)
      : confidenceScore(normalizeConfidence(candidate.confidence, dueDate || scheduledTime ? "high" : "medium"));
  const confidence = confidenceBand(confidenceScoreValue);
  const reasons = normalizeReasonList(candidate.reasons || []);
  const missingFields = Array.isArray(candidate.missingFields)
    ? candidate.missingFields.map((entry) => sanitizeString(entry, "")).filter(Boolean)
    : [];
  const needsDate =
    candidate.needsDate === true ||
    missingFields.includes("dueDate") ||
    missingFields.includes("time") ||
    (!dueDate && !scheduledTime && confidence !== "high");
  const normalized = {
    title,
    displayTitle,
    details,
    rawPhrase,
    confidence,
    confidenceScore: confidenceScoreValue,
    category: normalizeCategory(candidate.category, title, details),
    dueDate,
    scheduledTime,
    timeHint: sanitizeString(candidate.timeHint, "") || null,
    reasons,
    reason: sanitizeString(candidate.reason || candidate.rationale || candidate.why, "").slice(0, 240),
    rationale: sanitizeString(candidate.rationale || candidate.why, "").slice(0, 240),
    urgency: sanitizeString(candidate.urgency, "") || computeUrgency(dueDate),
    missingFields,
    needsDate,
    followUpPrompt: buildFollowUpPrompt({ missingFields, needsDate, dueDate, scheduledTime, details }),
    priorityScore: priorityScore({
      confidenceScore: confidenceScoreValue,
      dueDate,
      scheduledTime,
      reasons,
      createdAt: new Date(),
      lastDetectedAt: new Date(),
    }),
    timezone: normalizeTimezone(timezone || "UTC"),
    sourceType,
    sourceLabel,
    sourceRefId,
    sourceExcerpt,
    sourceHash,
  };
  normalized.fingerprint = fingerprintForSuggestion({
    sourceHash,
    title: normalized.displayTitle,
    rawPhrase: normalized.rawPhrase,
  });
  return normalized;
}

async function fetchRecentSuggestions(userId, workspaceId, limit = 80) {
  const snap = await actionInboxCollection(userId, workspaceId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((docSnap) => serializeSuggestion(docSnap.id, docSnap.data() || {}));
}

function topCategory(items = []) {
  const counts = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = sanitizeString(item?.category, "Other");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  if (!ranked.length) return { label: null, count: 0 };
  return { label: ranked[0][0], count: ranked[0][1] };
}

function averageConfidence(items = []) {
  const scores = (Array.isArray(items) ? items : [])
    .map((item) => normalizeConfidenceScore(item?.confidenceScore, confidenceScore(item?.confidence)))
    .filter((score) => Number.isFinite(score));
  if (!scores.length) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function suggestionTimingState(item = {}, { now = new Date() } = {}) {
  const timezone = normalizeTimezone(item?.timezone || "UTC");
  const current = dayjs(now).tz(timezone);

  if (item?.scheduledTime) {
    const scheduled = dayjs(item.scheduledTime).tz(timezone);
    if (scheduled.isValid()) {
      if (scheduled.isBefore(current)) return "overdue";
      if (scheduled.isSame(current, "day")) return "today";
      if (scheduled.diff(current, "day") <= 7) return "soon";
      return "later";
    }
  }

  if (item?.dueDate) {
    const due = dayjs.tz(`${item.dueDate} 09:00`, "YYYY-MM-DD HH:mm", timezone);
    if (due.isValid()) {
      const diffDays = due.startOf("day").diff(current.startOf("day"), "day");
      if (diffDays < 0) return "overdue";
      if (diffDays === 0) return "today";
      if (diffDays <= 7) return "soon";
    }
  }

  return "later";
}

function buildDailyIntentSummary({
  pendingCount = 0,
  importantCount = 0,
  overdueCount = 0,
  dueTodayCount = 0,
  dueSoonCount = 0,
} = {}) {
  if (!pendingCount) {
    return "Nothing urgent is waiting right now.";
  }

  if (overdueCount > 0) {
    return overdueCount === 1
      ? "One pending item is already behind schedule."
      : `${overdueCount} pending items are already behind schedule.`;
  }

  if (dueTodayCount > 0) {
    return dueTodayCount === 1
      ? "You have one important thing that needs attention today."
      : `You have ${dueTodayCount} important things that need attention today.`;
  }

  if (dueSoonCount > 0) {
    return dueSoonCount === 1
      ? "One important item is coming up soon."
      : `${dueSoonCount} important items are coming up soon.`;
  }

  if (importantCount <= 1) {
    return "You have one clear next step waiting.";
  }

  return `You have ${importantCount} important things waiting.`;
}

function buildDailyIntentSecondarySummary({ focus = null, supportingCount = 0, pendingCount = 0 } = {}) {
  if (!focus) return "Capture a note and the engine will shape your next step.";
  if (supportingCount > 0) {
    return `You also have ${supportingCount} other important thing${supportingCount === 1 ? "" : "s"} waiting.`;
  }
  if (pendingCount > 1) {
    const remaining = pendingCount - 1;
    return `You also have ${remaining} other suggestion${remaining === 1 ? "" : "s"} in the inbox.`;
  }
  return "Pick one to start.";
}

function buildDailyIntentFromPending(pendingInput = [], { limit = 3, now = new Date() } = {}) {
  const pending = sortSuggestions((Array.isArray(pendingInput) ? pendingInput : []).filter((item) => item.status === "pending"));
  const important = pending.slice(0, Math.min(Math.max(limit, 1), 5));
  const focus = important[0] || null;

  const counts = pending.reduce(
    (acc, item) => {
      const state = suggestionTimingState(item, { now });
      if (state === "overdue") acc.overdueCount += 1;
      else if (state === "today") acc.dueTodayCount += 1;
      else if (state === "soon") acc.dueSoonCount += 1;
      return acc;
    },
    { overdueCount: 0, dueTodayCount: 0, dueSoonCount: 0 },
  );

  return {
    generatedAt: new Date(now).toISOString(),
    timezone: normalizeTimezone(focus?.timezone || pending[0]?.timezone || "UTC"),
    pendingCount: pending.length,
    importantCount: important.length,
    overdueCount: counts.overdueCount,
    dueTodayCount: counts.dueTodayCount,
    dueSoonCount: counts.dueSoonCount,
    focus,
    important,
    supporting: important.slice(1),
    summary: buildDailyIntentSummary({
      pendingCount: pending.length,
      importantCount: important.length,
      overdueCount: counts.overdueCount,
      dueTodayCount: counts.dueTodayCount,
      dueSoonCount: counts.dueSoonCount,
    }),
    secondarySummary: buildDailyIntentSecondarySummary({
      focus,
      supportingCount: Math.max(0, important.length - 1),
      pendingCount: pending.length,
    }),
    prompt: focus ? "Pick one to start." : "Capture a note and the engine will guide your next step.",
  };
}

function ratio(numerator, denominator) {
  if (!denominator) return 0;
  return numerator / denominator;
}

function buildInsightSummary({
  confirmedTop,
  ignoredTop,
  lowConfidenceIgnoredRate,
  lowConfidenceDecisions,
  missingTimingIgnoredRate,
  missingTimingDecisions,
  urgentPendingCount,
  totalNudges,
  confirmationRate,
  decisionsCount,
} = {}) {
  const lines = [];
  if (confirmedTop?.label && confirmedTop.count >= 2) {
    lines.push(`You usually confirm ${confirmedTop.label.toLowerCase()} suggestions.`);
  }
  if (ignoredTop?.label && ignoredTop.count >= 2) {
    lines.push(`You ignore ${ignoredTop.label.toLowerCase()} suggestions more often.`);
  }
  if (lowConfidenceDecisions >= 4 && lowConfidenceIgnoredRate >= 0.7) {
    lines.push("Low-confidence suggestions are being ignored often, so the engine is suppressing more of them.");
  }
  if (missingTimingDecisions >= 4 && missingTimingIgnoredRate >= 0.65) {
    lines.push("Suggestions without clear timing are being down-ranked until they carry a date or time.");
  }
  if (urgentPendingCount > 0) {
    lines.push(`${urgentPendingCount} urgent suggestion${urgentPendingCount === 1 ? "" : "s"} still need a decision.`);
  }
  if (totalNudges > 0) {
    lines.push(`${totalNudges} external nudge${totalNudges === 1 ? "" : "s"} went out only for time-sensitive suggestions.`);
  }
  if (!lines.length && decisionsCount >= 3 && confirmationRate >= 0.6) {
    lines.push("The engine is finding suggestions you usually keep, which is a good sign for inbox quality.");
  }
  return lines.join(" ") || "Keep confirming or ignoring suggestions and the engine will adapt to your follow-through patterns.";
}

export async function getActionInboxInsights(userId, workspaceId, { days = 30, limit = 240 } = {}) {
  const items = await fetchRecentSuggestions(userId, workspaceId, Math.min(Math.max(limit, 40), 240));
  const cutoff = dayjs().subtract(Math.max(1, Number(days) || 30), "day");
  const withinWindow = items.filter((item) => {
    if (!item?.createdAt) return true;
    return dayjs(item.createdAt).isAfter(cutoff);
  });

  const pending = withinWindow.filter((item) => item.status === "pending");
  const confirmed = withinWindow.filter((item) => item.status === "confirmed");
  const ignored = withinWindow.filter((item) => item.status === "ignored");
  const decisions = withinWindow.filter((item) => item.status === "confirmed" || item.status === "ignored");
  const lowConfidenceDecisions = decisions.filter(
    (item) => normalizeConfidenceScore(item.confidenceScore, confidenceScore(item.confidence)) < 0.55,
  );
  const missingTimingDecisions = decisions.filter(
    (item) => item.needsDate || !item.dueDate || (Array.isArray(item.missingFields) && item.missingFields.length > 0),
  );
  const resurfaced = withinWindow.filter((item) => (item.resurfaceCount || 0) > 0);
  const totalResurfaces = withinWindow.reduce((sum, item) => sum + (Number(item.resurfaceCount) || 0), 0);
  const nudged = withinWindow.filter((item) => (item.nudgeCount || 0) > 0);
  const totalNudges = withinWindow.reduce((sum, item) => sum + (Number(item.nudgeCount) || 0), 0);
  const urgentPendingCount = pending.filter((item) => item.urgency === "high").length;
  const confirmedTop = topCategory(confirmed);
  const ignoredTop = topCategory(ignored);
  const confirmationRate = ratio(confirmed.length, decisions.length);
  const lowConfidenceIgnoredRate = ratio(
    lowConfidenceDecisions.filter((item) => item.status === "ignored").length,
    lowConfidenceDecisions.length,
  );
  const missingTimingIgnoredRate = ratio(
    missingTimingDecisions.filter((item) => item.status === "ignored").length,
    missingTimingDecisions.length,
  );

  return {
    timeframeDays: Math.max(1, Number(days) || 30),
    totalSuggestions: withinWindow.length,
    pendingCount: pending.length,
    urgentPendingCount,
    decisionsCount: decisions.length,
    confirmedCount: confirmed.length,
    ignoredCount: ignored.length,
    confirmationRate,
    averageConfidence: averageConfidence(withinWindow),
    confirmedAverageConfidence: averageConfidence(confirmed),
    resurfacedSuggestionCount: resurfaced.length,
    totalResurfaces,
    nudgedSuggestionCount: nudged.length,
    totalNudges,
    topConfirmedCategory: confirmedTop.label,
    topIgnoredCategory: ignoredTop.label,
    behaviorSummary: buildInsightSummary({
      confirmedTop,
      ignoredTop,
      lowConfidenceIgnoredRate,
      lowConfidenceDecisions: lowConfidenceDecisions.length,
      missingTimingIgnoredRate,
      missingTimingDecisions: missingTimingDecisions.length,
      urgentPendingCount,
      totalNudges,
      confirmationRate,
      decisionsCount: decisions.length,
    }),
  };
}

export async function listActionSuggestions(userId, workspaceId, { status = "pending", limit = 24 } = {}) {
  const items = await fetchRecentSuggestions(userId, workspaceId, Math.max(limit * 3, 40));
  const filtered = status ? items.filter((item) => item.status === status) : items;
  return sortSuggestions(filtered).slice(0, limit);
}

export async function getActionInboxDailyIntent(userId, workspaceId, { limit = 3, sourceLimit = 120 } = {}) {
  const items = await fetchRecentSuggestions(userId, workspaceId, Math.max(sourceLimit, 60));
  return buildDailyIntentFromPending(items, { limit });
}

function shouldResurfaceSuggestion(item, now = new Date()) {
  if (!item || item.status !== "ignored") return false;
  if (!item.nextReviewAt) return false;
  if (Number.isFinite(item.maxResurfaceCount) && (item.resurfaceCount || 0) >= item.maxResurfaceCount) {
    return false;
  }
  const nextReviewAt = dayjs(item.nextReviewAt);
  const current = dayjs(now);
  if (!nextReviewAt.isValid() || !current.isValid()) return false;
  return !nextReviewAt.isAfter(current);
}

async function reopenSuggestionDoc(docRef, suggestion, { trigger = "manual", now = new Date() } = {}) {
  const resurfaceCount = (suggestion.resurfaceCount || 0) + 1;
  const patch = {
    status: "pending",
    updatedAt: now,
    ignoredAt: null,
    nextReviewAt: null,
    nextReviewReason: null,
    lastShownAt: now,
    lastSurfacedAt: now,
    lastSurfacedReason: suggestion.nextReviewReason || null,
    lastTriggeredAt: now,
    lastTrigger: trigger,
    resurfaceCount,
  };
  await docRef.set(patch, { merge: true });
  return {
    ...suggestion,
    ...patch,
  };
}

async function maybeSendActionInboxNudge(
  userId,
  docRef,
  suggestion,
  { trigger = "manual", now = new Date(), nudgePrefs = null } = {},
) {
  const resolvedPrefs = normalizeActionInboxNudgePrefs(nudgePrefs || {});
  if (!userId || !docRef || !shouldSendActionInboxNudge(suggestion, resolvedPrefs, { trigger, now })) {
    return { nudged: false, channels: [] };
  }

  try {
    const result = await notifyActionInboxNudge(userId, suggestion, {
      reason: suggestion.lastSurfacedReason || suggestion.nextReviewReason || null,
      workspaceId: suggestion.workspaceId || null,
      channels: resolvedPrefs.channels,
      limitTo: resolvedPrefs.channels,
    });
    const channels = Array.isArray(result?.channels) ? result.channels : [];
    if (!channels.length) return { nudged: false, channels: [] };

    await docRef.set(
      {
        lastNudgedAt: now,
        lastNudgeReason: suggestion.lastSurfacedReason || suggestion.nextReviewReason || null,
        lastNudgeTrigger: trigger,
        lastNudgedChannels: channels,
        nudgeCount: (suggestion.nudgeCount || 0) + 1,
        updatedAt: now,
      },
      { merge: true },
    );

    return { nudged: true, channels };
  } catch (err) {
    console.warn("[ActionInbox] nudge failed", err?.message || err);
    return { nudged: false, channels: [] };
  }
}

async function maybeSendActionInboxDigest(
  userId,
  workspaceId,
  pendingInput = [],
  { trigger = "scheduled_digest", now = new Date(), digestPrefs = null, force = false } = {},
) {
  const resolvedPrefs = normalizeActionInboxNudgePrefs(digestPrefs || {});
  const pending = sortSuggestions((Array.isArray(pendingInput) ? pendingInput : []).filter((item) => item.status === "pending"));

  if (!userId || !workspaceId) return { sent: false, channels: [], reason: "missing_scope" };
  if (!resolvedPrefs.enabled || !resolvedPrefs.dailyDigest) return { sent: false, channels: [], reason: "disabled" };
  if (!pending.length) return { sent: false, channels: [], reason: "no_pending" };

  const intent = buildDailyIntentFromPending(pending, { limit: 3, now });
  const timezone = normalizeTimezone(intent.timezone || pending[0]?.timezone || "UTC");
  const localNow = dayjs(now).tz(timezone);
  if (!force && trigger === "scheduled_digest" && localNow.hour() < 9) {
    return { sent: false, channels: [], reason: "before_digest_window" };
  }

  const metaRef = actionInboxMetaDoc(userId, workspaceId, "digest");
  let meta = {};
  try {
    const snap = await metaRef.get();
    meta = snap.exists ? snap.data() || {} : {};
  } catch (err) {
    console.warn("[ActionInbox] digest meta lookup failed", err?.message || err);
  }

  const localDateKey = localNow.format("YYYY-MM-DD");
  if (!force && sanitizeString(meta?.lastDigestLocalDate, "") === localDateKey) {
    return { sent: false, channels: [], reason: "already_sent_today" };
  }

  try {
    const result = await notifyActionInboxDigest(userId, pending.slice(0, 5), {
      workspaceId,
      intent,
      channels: resolvedPrefs.digestChannels,
      limitTo: resolvedPrefs.digestChannels,
    });
    const channels = Array.isArray(result?.channels) ? result.channels : [];
    if (!channels.length) return { sent: false, channels: [], reason: "no_channels" };

    await metaRef.set(
      {
        lastDigestAt: now,
        lastDigestLocalDate: localDateKey,
        lastDigestTrigger: trigger,
        lastDigestChannels: channels,
        lastDigestTimezone: timezone,
        lastDigestPendingCount: pending.length,
        updatedAt: now,
      },
      { merge: true },
    );

    return {
      sent: true,
      channels,
      pendingCount: pending.length,
      focusTitle: intent.focus?.displayTitle || intent.focus?.title || pending[0]?.displayTitle || pending[0]?.title || "",
    };
  } catch (err) {
    console.warn("[ActionInbox] digest failed", err?.message || err);
    return { sent: false, channels: [], reason: "send_failed" };
  }
}

export async function runActionInboxSweep(userId, workspaceId, { trigger = "manual", limit = 24 } = {}) {
  const now = new Date();
  const items = await fetchRecentSuggestions(userId, workspaceId, 120);
  const candidates = sortSuggestions(items.filter((item) => shouldResurfaceSuggestion(item, now))).slice(0, limit);
  const userPrefs =
    trigger === "scheduled_sweep" && userId
      ? await getUserPrefs(userId).catch((err) => {
          console.warn("[ActionInbox] failed to load user prefs", err?.message || err);
          return null;
        })
      : null;
  const nudgePrefs = userPrefs?.actionInboxNudges || null;
  let nudged = 0;

  for (const item of candidates) {
    const ref = actionSuggestionDoc(userId, workspaceId, item.id);
    const reopened = await reopenSuggestionDoc(ref, item, { trigger, now });
    const nudgeResult = await maybeSendActionInboxNudge(
      userId,
      ref,
      { ...item, ...reopened, workspaceId },
      { trigger, now, nudgePrefs },
    );
    if (nudgeResult.nudged) nudged += 1;
  }

  const suggestions = await listActionSuggestions(userId, workspaceId, { status: "pending", limit });
  return {
    reopened: candidates.length,
    nudged,
    suggestions,
  };
}

export async function triggerActionInboxDigest(
  userId,
  workspaceId,
  { trigger = "manual_test", force = false, limit = 120 } = {},
) {
  const now = new Date();
  const items = await fetchRecentSuggestions(userId, workspaceId, Math.max(limit, 60));
  const userPrefs = userId
    ? await getUserPrefs(userId).catch((err) => {
        console.warn("[ActionInbox] failed to load digest prefs", err?.message || err);
        return null;
      })
    : null;

  return maybeSendActionInboxDigest(
    userId,
    workspaceId,
    items.filter((item) => item.status === "pending"),
    {
      trigger,
      now,
      digestPrefs: userPrefs?.actionInboxNudges || null,
      force,
    },
  );
}

export async function runGlobalActionInboxSweep({ trigger = "scheduled_sweep" } = {}) {
  const now = new Date();
  const nudgePrefCache = new Map();
  let snap;
  try {
    snap = await db.collectionGroup("actionInbox").where("status", "==", "ignored").get();
  } catch (err) {
    console.warn("[ActionInbox] filtered sweep query failed, falling back to full collectionGroup", err?.message || err);
    snap = await db.collectionGroup("actionInbox").get();
  }

  const stats = {
    scanned: 0,
    reopened: 0,
    nudged: 0,
  };

  for (const docSnap of snap.docs) {
    const suggestion = serializeSuggestion(docSnap.id, docSnap.data() || {});
    if (!shouldResurfaceSuggestion(suggestion, now)) continue;
    stats.scanned += 1;
    const reopened = await reopenSuggestionDoc(docSnap.ref, suggestion, { trigger, now });
    let nudgePrefs = null;
    if (suggestion.userId) {
      if (nudgePrefCache.has(suggestion.userId)) {
        nudgePrefs = nudgePrefCache.get(suggestion.userId);
      } else {
        const userPrefs = await getUserPrefs(suggestion.userId).catch((err) => {
          console.warn("[ActionInbox] failed to load global nudge prefs", err?.message || err);
          return null;
        });
        nudgePrefs = userPrefs?.actionInboxNudges || null;
        nudgePrefCache.set(suggestion.userId, nudgePrefs);
      }
    }
    const nudgeResult = await maybeSendActionInboxNudge(
      suggestion.userId,
      docSnap.ref,
      { ...suggestion, ...reopened },
      { trigger, now, nudgePrefs },
    );
    if (nudgeResult.nudged) stats.nudged += 1;
    stats.reopened += 1;
  }

  return stats;
}

export async function runGlobalActionInboxDigest({ trigger = "scheduled_digest" } = {}) {
  const now = new Date();
  let snap;
  try {
    snap = await db.collectionGroup("actionInbox").where("status", "==", "pending").get();
  } catch (err) {
    console.warn("[ActionInbox] pending digest query failed, falling back to full collectionGroup", err?.message || err);
    snap = await db.collectionGroup("actionInbox").get();
  }

  const grouped = new Map();
  for (const docSnap of snap.docs) {
    const suggestion = serializeSuggestion(docSnap.id, docSnap.data() || {});
    if (suggestion.status !== "pending" || !suggestion.userId || !suggestion.workspaceId) continue;
    const key = JSON.stringify([suggestion.userId, suggestion.workspaceId]);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(suggestion);
  }

  const prefCache = new Map();
  const stats = {
    workspaces: grouped.size,
    sent: 0,
    deliveredChannels: {},
  };

  for (const [key, items] of grouped.entries()) {
    const [userId, workspaceId] = JSON.parse(key);
    let digestPrefs = null;
    if (prefCache.has(userId)) {
      digestPrefs = prefCache.get(userId);
    } else {
      const userPrefs = await getUserPrefs(userId).catch((err) => {
        console.warn("[ActionInbox] failed to load global digest prefs", err?.message || err);
        return null;
      });
      digestPrefs = userPrefs?.actionInboxNudges || null;
      prefCache.set(userId, digestPrefs);
    }

    const result = await maybeSendActionInboxDigest(userId, workspaceId, items, {
      trigger,
      now,
      digestPrefs,
    });
    if (!result.sent) continue;
    stats.sent += 1;
    (result.channels || []).forEach((channel) => {
      stats.deliveredChannels[channel] = (stats.deliveredChannels[channel] || 0) + 1;
    });
  }

  return stats;
}

export async function detectAndStoreActionSuggestions(
  userId,
  workspaceId,
  text,
  { timezone = "UTC", nowISO = null, maxItems = 6, sourceType = "note", sourceLabel = "note", sourceRefId = null } = {},
) {
  const rawText = sanitizeString(text, "");
  if (!rawText) return [];

  const resolvedTimezone = normalizeTimezone(timezone);
  const detectedAt = new Date();
  const sourceExcerpt = rawText.slice(0, 280);
  const sourceHash = sourceHashForText(rawText);
  const result = await detectActionSuggestions(rawText, { timezone: resolvedTimezone, nowISO, maxItems });
  const candidates = Array.isArray(result?.suggestions) ? result.suggestions : [];

  const recent = await fetchRecentSuggestions(userId, workspaceId, 100);
  const behaviorMemory = buildBehaviorMemory(recent);
  const byFingerprint = new Map(recent.filter((item) => item.status !== "confirmed").map((item) => [item.fingerprint, item]));
  const bySourceIdentity = new Map(
    recent
      .filter((item) => item.status !== "confirmed")
      .map((item) => [sourceIdentityKey(item), item]),
  );
  const next = [];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeCandidate(candidate, {
      sourceType: sanitizeString(sourceType, "note"),
      sourceLabel: sanitizeString(sourceLabel, "note"),
      sourceRefId: sanitizeString(sourceRefId, "") || null,
      sourceExcerpt,
      sourceHash,
      timezone: resolvedTimezone,
    });
    if (!normalizedCandidate) continue;

    const normalized = applyBehaviorMemory(normalizedCandidate, behaviorMemory);
    const existing = byFingerprint.get(normalized.fingerprint) || bySourceIdentity.get(sourceIdentityKey(normalized));
    const shouldSurface = shouldSurfaceDetectedSuggestion(normalized, existing) || existing?.status === "pending";

    if (!shouldSurface) {
      if (existing) {
        const ref = actionSuggestionDoc(userId, workspaceId, existing.id);
        await ref.set(
          {
            updatedAt: detectedAt,
            lastDetectedAt: detectedAt,
            sourceExcerpt,
            timezone: resolvedTimezone,
            title: normalized.title,
            displayTitle: normalized.displayTitle,
            rawPhrase: normalized.rawPhrase,
            category: normalized.category,
            sourceHash: normalized.sourceHash,
            fingerprint: normalized.fingerprint,
            dueDate: normalized.dueDate,
            scheduledTime: normalized.scheduledTime,
            timeHint: normalized.timeHint,
            details: normalized.details,
            reason: normalized.reason,
            rationale: normalized.rationale,
            reasons: normalized.reasons,
            missingFields: normalized.missingFields,
            followUpPrompt: normalized.followUpPrompt,
            confidenceScore: normalized.confidenceScore,
            confidenceLabel: normalized.confidence,
            priorityScore: normalized.priorityScore,
            urgency: normalized.urgency,
            needsDate: normalized.needsDate,
          },
          { merge: true },
        );
      }
      continue;
    }

    if (existing) {
      const ref = actionSuggestionDoc(userId, workspaceId, existing.id);
      const patch = {
        status: "pending",
        updatedAt: detectedAt,
        ignoredAt: null,
        nextReviewAt: null,
        nextReviewReason: null,
        lastDetectedAt: detectedAt,
        lastShownAt: detectedAt,
        lastSurfacedAt: detectedAt,
        lastTriggeredAt: detectedAt,
        lastTrigger: "input",
        sourceExcerpt,
        timezone: resolvedTimezone,
        title: normalized.title,
        displayTitle: normalized.displayTitle,
        rawPhrase: normalized.rawPhrase,
        category: normalized.category,
        sourceHash: normalized.sourceHash,
        fingerprint: normalized.fingerprint,
        dueDate: normalized.dueDate,
        scheduledTime: normalized.scheduledTime,
        timeHint: normalized.timeHint,
        details: normalized.details,
        reason: normalized.reason,
        rationale: normalized.rationale,
        reasons: normalized.reasons,
        missingFields: normalized.missingFields,
        followUpPrompt: normalized.followUpPrompt,
        confidenceScore: normalized.confidenceScore,
        confidenceLabel: normalized.confidence,
        priorityScore: normalized.priorityScore,
        urgency: normalized.urgency,
        needsDate: normalized.needsDate,
      };
      await ref.set(patch, { merge: true });
      const merged = { ...existing, ...patch };
      byFingerprint.set(merged.fingerprint, merged);
      bySourceIdentity.set(sourceIdentityKey(merged), merged);
      next.push(merged);
      continue;
    }

    const maxResurfaceCount = computeMaxResurfaceCount(normalized);
    const payload = {
      ...normalized,
      userId: String(userId),
      workspaceId: String(workspaceId),
      status: "pending",
      firstDetectedAt: detectedAt,
      lastDetectedAt: detectedAt,
      lastShownAt: detectedAt,
      lastSurfacedAt: detectedAt,
      lastTriggeredAt: detectedAt,
      lastTrigger: "input",
      ignoreCount: 0,
      resurfaceCount: 0,
      maxResurfaceCount,
      followUpPrompt: normalized.followUpPrompt,
      createdAt: detectedAt,
      updatedAt: detectedAt,
    };
    const ref = await actionInboxCollection(userId, workspaceId).add(payload);
    const saved = serializeSuggestion(ref.id, payload);
    byFingerprint.set(saved.fingerprint, saved);
    bySourceIdentity.set(sourceIdentityKey(saved), saved);
    next.push(saved);
  }

  return sortSuggestions(next);
}

export async function ignoreActionSuggestion(userId, workspaceId, suggestionId) {
  const ref = actionSuggestionDoc(userId, workspaceId, suggestionId);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Suggestion not found");
    error.statusCode = 404;
    throw error;
  }

  const suggestion = serializeSuggestion(snap.id, snap.data() || {});
  const now = new Date();
  const nextIgnoreCount = (suggestion.ignoreCount || 0) + 1;
  const reviewPlan = computeNextReviewPlan({ ...suggestion, ignoreCount: nextIgnoreCount }, { now });

  await ref.set(
    {
      status: "ignored",
      ignoredAt: now,
      updatedAt: now,
      nextReviewAt: reviewPlan.nextReviewAt ? new Date(reviewPlan.nextReviewAt) : null,
      nextReviewReason: reviewPlan.reason || null,
      lastTriggeredAt: now,
      lastTrigger: "user_ignore",
      ignoreCount: nextIgnoreCount,
    },
    { merge: true },
  );

  const nextSnap = await ref.get();
  return serializeSuggestion(nextSnap.id, nextSnap.data() || {});
}

export async function confirmActionSuggestion(
  userId,
  workspaceId,
  suggestionId,
  { title, details, date, category, scheduledTime, timeHint, timezone } = {},
) {
  const ref = actionSuggestionDoc(userId, workspaceId, suggestionId);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Suggestion not found");
    error.statusCode = 404;
    throw error;
  }

  const raw = snap.data() || {};
  const suggestion = serializeSuggestion(snap.id, raw);
  if (suggestion.status === "confirmed") {
    const error = new Error("Suggestion already confirmed");
    error.statusCode = 409;
    throw error;
  }

  const resolvedTitle = sanitizeString(title, suggestion.displayTitle || suggestion.title).slice(0, 160);
  const resolvedDetails = sanitizeString(details, suggestion.details).slice(0, 500);
  const resolvedDate = normalizeDateKey(date || suggestion.dueDate || null);
  const resolvedScheduledTime = normalizeScheduledTime(scheduledTime || suggestion.scheduledTime, resolvedDate);
  const resolvedTimeHint = sanitizeString(timeHint, suggestion.timeHint || "") || null;
  const resolvedCategory = normalizeCategory(category || suggestion.category, resolvedTitle, resolvedDetails);
  const resolvedTimezone = sanitizeString(timezone, raw.timezone || "UTC") || "UTC";

  const task = await createTask(
    userId,
    {
      title: resolvedTitle,
      details: resolvedDetails,
      category: resolvedCategory,
      date: resolvedDate || undefined,
      scheduledTime: resolvedScheduledTime || undefined,
      timeHint: resolvedTimeHint,
      timezone: resolvedTimezone,
      priority: taskPriorityFromSuggestion(suggestion.priorityScore),
      source: "action-inbox",
      metadata: {
        origin: "action-inbox",
        actionSuggestionId: suggestion.id,
        sourceType: suggestion.sourceType,
        sourceRefId: suggestion.sourceRefId,
        sourceExcerpt: suggestion.sourceExcerpt,
        rawPhrase: suggestion.rawPhrase,
        confidence: suggestion.confidence,
      },
      timeConfidence: suggestion.confidenceScore,
    },
    {
      workspaceId,
      origin: "action-inbox",
      timezone: resolvedTimezone,
      silent: true,
    },
  );

  await ref.set(
    {
      status: "confirmed",
      confirmedAt: new Date(),
      confirmedTaskId: task.id,
      updatedAt: new Date(),
      nextReviewAt: null,
      nextReviewReason: null,
      dueDate: resolvedDate || null,
      scheduledTime: resolvedScheduledTime || null,
      timeHint: resolvedTimeHint,
      title: resolvedTitle,
      displayTitle: resolvedTitle,
      details: resolvedDetails,
      category: resolvedCategory,
      timezone: resolvedTimezone,
      needsDate: false,
      missingFields: [],
      followUpPrompt: null,
    },
    { merge: true },
  );

  const nextSnap = await ref.get();
  return {
    task,
    suggestion: serializeSuggestion(nextSnap.id, nextSnap.data() || {}),
  };
}
