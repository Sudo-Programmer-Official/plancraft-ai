import admin from "firebase-admin";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { db, uploadBufferToStorage } from "./firebaseAdmin.js";
import { deriveMoodFromSentiment, CATEGORY_EMOJI, CATEGORY_LIST } from "./journalAIService.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const JOURNAL_COLLECTION = "journalEntries";
const MAX_LOOKBACK_DOCS = 60;

function safeTimezone(value) {
  if (typeof value !== "string") return "UTC";
  const trimmed = value.trim();
  if (!trimmed) return "UTC";
  return trimmed;
}

function normalizeCategory(value) {
  if (!value && value !== 0) return "Reflection";
  const token = String(value).trim().toLowerCase();
  const match = CATEGORY_LIST.find((cat) => cat.toLowerCase() === token);
  return match || "Reflection";
}

function dateKey(date, tz = "UTC") {
  try {
    return dayjs(date).tz(tz).format("YYYY-MM-DD");
  } catch {
    return dayjs(date).format("YYYY-MM-DD");
  }
}

function determineExt(mime = "", original = "") {
  if (mime.includes("mp4") || mime.includes("aac") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("ogg") || mime.includes("oga")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("webm")) return "webm";
  if (original && /\.[a-z0-9]+$/i.test(original)) return original.split(".").pop();
  return "webm";
}

export async function storeJournalAudio(uid, file) {
  if (!file || !file.buffer || !uid) return null;
  const ext = determineExt(file.mimetype || "", file.originalname || "");
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const destPath = `journal/${uid}/${stamp}-${rand}.${ext}`;
  try {
    const url = await uploadBufferToStorage(file.buffer, destPath, file.mimetype || "audio/webm");
    return url;
  } catch (err) {
    console.warn("[journalService] Failed to upload audio clip", err?.message || err);
    return null;
  }
}

export async function saveJournalEntry(
  uid,
  payload = {},
  { timezone = "UTC" } = {},
) {
  if (!uid) throw new Error("User ID required");
  const tz = safeTimezone(payload.timezone || timezone);
  const now = new Date();
  const text = String(payload.text || "").trim();
  const rawText = String(payload.rawText || payload.text || "").trim();
  const category = normalizeCategory(payload.category);
  const sentiment = payload.sentiment || "balanced";
  const mood =
    payload.mood && payload.mood.label
      ? payload.mood
      : deriveMoodFromSentiment(sentiment);

  const entryDate =
    (typeof payload.date === "string" && payload.date) || dateKey(now, tz);

  const doc = {
    userId: uid,
    text,
    rawText,
    category,
    categoryEmoji:
      payload.categoryEmoji ||
      CATEGORY_EMOJI[category] ||
      CATEGORY_EMOJI.Reflection,
    sentiment,
    mood,
    tone: payload.tone || null,
    keywords: Array.isArray(payload.keywords) ? payload.keywords.slice(0, 8) : [],
    summary: payload.summary || "",
    takeaway: payload.takeaway || "",
    action: payload.action || "",
    audioUrl: payload.audioUrl || null,
    audioDurationMs: payload.audioDurationMs || null,
    wordCount: payload.wordCount || (text ? text.split(/\s+/).filter(Boolean).length : 0),
    date: entryDate,
    timezone: tz,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: now.getTime(),
    source: payload.source || "voice-journal",
  };

  const ref = await db.collection(JOURNAL_COLLECTION).add(doc);

  return {
    id: ref.id,
    ...doc,
    createdAt: now.toISOString(),
  };
}

function hydrateEntry(doc) {
  if (!doc?.exists) return null;
  const data = doc.data() || {};
  const createdAt =
    data.createdAt && typeof data.createdAt.toDate === "function"
      ? data.createdAt.toDate()
      : data.createdAtMs
        ? new Date(data.createdAtMs)
        : new Date();
  return {
    id: doc.id,
    ...data,
    createdAt: createdAt.toISOString(),
  };
}

function computeStreak(entries, tz = "UTC") {
  if (!entries.length) return 0;
  const byDate = new Set(entries.map((entry) => entry.date));
  let streak = 0;
  let cursor = dayjs().tz(tz).startOf("day");
  while (byDate.has(cursor.format("YYYY-MM-DD"))) {
    streak += 1;
    cursor = cursor.subtract(1, "day");
  }
  return streak;
}

function pickTopCategory(entries) {
  const counts = new Map();
  entries.forEach((entry) => {
    const key = normalizeCategory(entry.category).toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const [slug, count] = sorted[0];
  const canonical =
    CATEGORY_EMOJI[
      Object.keys(CATEGORY_EMOJI).find((key) => key.toLowerCase() === slug) || "Reflection"
    ];
  const label =
    CATEGORY_LIST.find((cat) => cat.toLowerCase() === slug) ||
    slug.replace(/^\w/, (c) => c.toUpperCase());
  return { label, count, emoji: canonical || "🪞" };
}

export async function getJournalInsights(
  uid,
  { lookbackDays = 7, timezone = "UTC" } = {},
) {
  if (!uid) throw new Error("User ID required");
  const tz = safeTimezone(timezone);
  const snap = await db
    .collection(JOURNAL_COLLECTION)
    .where("userId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(MAX_LOOKBACK_DOCS)
    .get();

  const entries = [];
  snap.forEach((doc) => {
    const hydrated = hydrateEntry(doc);
    if (hydrated) entries.push(hydrated);
  });

  if (!entries.length) {
    return {
      stats: { streakDays: 0, entriesThisWeek: 0, todayJournaled: false, topCategory: null },
      suggestion: {
        title: "Start your first reflection",
        text: "Take 60 seconds to voice how the day feels. We’ll handle the rest.",
        cta: "Begin voice journal",
      },
      lastEntry: null,
      keywords: [],
    };
  }

  const todayKey = dateKey(new Date(), tz);
  const lookbackStart = dayjs().tz(tz).subtract(lookbackDays - 1, "day").format("YYYY-MM-DD");
  const entriesThisWeek = entries.filter((entry) => entry.date >= lookbackStart).length;
  const todayJournaled = entries.some((entry) => entry.date === todayKey);
  const streakDays = computeStreak(entries, tz);
  const topCategory = pickTopCategory(entries);
  const lastEntry = entries[0];
  const keywordPool = [];
  entries.slice(0, 5).forEach((entry) => {
    if (Array.isArray(entry.keywords)) keywordPool.push(...entry.keywords);
  });
  const keywords = [...new Set(keywordPool)].slice(0, 5);

  const suggestion = todayJournaled
    ? {
        title: "Nice momentum",
        text:
          lastEntry.category === "Goal"
            ? "Turn today’s reflection into one concrete next step."
            : "Capture a quick win to close your entry with intention.",
        cta: "Plan next step",
      }
    : {
        title: "Take a mindful minute",
        text:
          streakDays >= 3
            ? `Keep your ${streakDays}-day streak alive with a 1-minute voice note.`
            : "Voice how the day truly felt — we’ll auto-tag and save it for you.",
        cta: "Start recording",
      };

  return {
    stats: { streakDays, entriesThisWeek, todayJournaled, topCategory },
    suggestion,
    lastEntry,
    keywords,
  };
}
