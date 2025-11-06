import express from "express";
import { requireAuth, ensureUserMatches } from "../middleware/auth.js";
import { db } from "../services/firebaseAdmin.js";
import { recordCompletion, habitsEnabled } from "../services/habitService.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { runHabitAnalytics } from "../jobs/habitAnalytics.js";
import { getVoiceCoachMessage } from "../services/voiceCoachService.js";

const router = express.Router();
const summaryCache = new Map();
const CACHE_TTL_MS = Number(process.env.HABIT_SUMMARY_CACHE_MS || 5 * 60 * 1000);

function envEnabled(key) {
  const raw = String(process.env[key] || "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function cacheKey(userId) {
  return String(userId || "").trim();
}

function getCachedSummary(userId) {
  const key = cacheKey(userId);
  if (!key || !summaryCache.has(key)) return null;
  const entry = summaryCache.get(key);
  if (!entry || Date.now() >= entry.expires) {
    summaryCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedSummary(userId, value) {
  const key = cacheKey(userId);
  if (!key) return;
  summaryCache.set(key, {
    value,
    expires: Date.now() + CACHE_TTL_MS,
  });
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num <= 0) return 0;
  if (num >= 1) return 1;
  return num;
}

function resolveWindowDays() {
  const raw = Number(process.env.HABIT_ANALYTICS_WINDOW_DAYS || 7);
  if (!Number.isFinite(raw) || raw <= 0) return 7;
  return Math.min(Math.max(Math.floor(raw), 1), 60);
}

router.use(requireAuth, ensureUserMatches);

router.post("/log-completion", async (req, res) => {
  try {
    if (!habitsEnabled()) {
      return res.json({ ok: true, skipped: true, reason: "habits_disabled" });
    }

    const { userId, taskId, completedAt, timezone, source } = req.body || {};
    if (!userId || !taskId) {
      return res.status(400).json({ error: "Missing userId or taskId" });
    }

    const snap = await db.collection("tasks").doc(String(taskId)).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Task not found" });
    }
    const data = snap.data() || {};
    if (String(data.userId || "") !== String(userId)) {
      return res.status(403).json({ error: "Forbidden: task does not belong to user" });
    }

    const task = {
      id: taskId,
      title: data.title || "",
      category: data.category || "General",
      timezone: data.timezone || data.metadata?.timezone || null,
    };

    console.log("[HabitTracker] api completion hook", { userId, taskId, source: source || "ui" });
    const result = await recordCompletion(userId, task, {
      completedAt: completedAt ? new Date(completedAt) : new Date(),
      timezone: timezone || task.timezone || null,
      source: source || "manual_complete",
    });

    summaryCache.delete(cacheKey(userId));
    return res.json({ ok: true, logged: !!result, habitId: result?.id || null });
  } catch (err) {
    console.error("[HabitRoutes] log-completion failed", err?.message || err);
    return res.status(500).json({ error: "Failed to log habit completion" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const userId = String(req.query?.userId || req.user?.uid || "").trim();
    const windowDays = resolveWindowDays();
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    if (!habitsEnabled() || !envEnabled("ENABLE_HABIT_ANALYTICS")) {
      return res.json({ ok: true, summary: null, windowDays });
    }

    const cached = getCachedSummary(userId);
    if (cached) {
      return res.json({ ok: true, summary: cached, windowDays, cached: true });
    }

    const snap = await db.collection("habit_summary").doc(userId).get();
    if (!snap.exists) {
      return res.json({ ok: true, summary: null, windowDays });
    }

    const data = snap.data() || {};
    const summary = {
      current_streak: toNumber(data.current_streak, 0),
      best_streak: toNumber(data.best_streak, 0),
      consistency_score: clamp01(data.consistency_score ?? 0),
      habit_strength: clamp01(data.habit_strength ?? 0),
      avg_completion_time: data.avg_completion_time || null,
      last_analyzed: data.last_analyzed || data.updated_at || null,
      last_coach_at: data.last_coach_at || data.last_voice_sent_at || data.last_spoken || null,
      last_coach_tone: data.last_coach_tone || null,
      last_coach_message: data.last_coach_message || null,
      last_coach_audio_url:
        data.last_coach_audio_url || data.last_coach_audio || data.last_voice_audio_url || null,
    };

    setCachedSummary(userId, summary);
    return res.json({ ok: true, summary, windowDays, cached: false });
  } catch (err) {
    console.error("[HabitRoutes] summary failed", err?.message || err);
    return res.status(500).json({ error: "Failed to load habit summary" });
  }
});

router.get("/coach", async (req, res) => {
  try {
    const userId = String(req.query?.userId || req.user?.uid || "");
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const payload = await getVoiceCoachMessage(userId);
    if (!payload) return res.json({ ok: true, message: null });
    return res.json({ ok: true, message: payload });
  } catch (err) {
    console.error("[HabitRoutes] coach fetch failed", err?.message || err);
    return res.status(500).json({ error: "Failed to load coach message" });
  }
});

router.post("/analyze", requireAdmin, async (req, res) => {
  try {
    const result = await runHabitAnalytics();
    summaryCache.clear();
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[HabitRoutes] manual analyze failed", err?.message || err);
    return res.status(500).json({ error: "Failed to run habit analytics" });
  }
});

export default router;
