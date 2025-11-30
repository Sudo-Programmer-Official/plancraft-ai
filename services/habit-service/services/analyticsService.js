import dayjs from "dayjs";
import { calcStreak, calcConsistency, calcHabitStrength, averageCompletionTime, summarizeBuckets } from "../ml/rules.js";
import { fetchLogsWindow } from "./habitLogService.js";
import { upsertSummary, getSummary } from "../firestore/habitSummaryRepository.js";

function resolveWindowDays() {
  const raw = Number(process.env.HABIT_ANALYTICS_WINDOW_DAYS || 7);
  if (!Number.isFinite(raw) || raw <= 0) return 7;
  return Math.min(Math.floor(raw), 60);
}

function startDateForWindow(days) {
  const windowDays = Number.isFinite(days) ? days : 7;
  return dayjs().utc().startOf("day").subtract(windowDays - 1, "day").format("YYYY-MM-DD");
}

export async function analyzeUser(userId, { dryRun = false } = {}) {
  const windowDays = resolveWindowDays();
  const since = startDateForWindow(windowDays);
  const logs = await fetchLogsWindow(userId, since);

  if (!logs.length) {
    return { ok: true, skipped: true, reason: "no_logs" };
  }

  const streak = calcStreak(logs);
  const consistency = calcConsistency(logs, windowDays);
  const habitStrength = calcHabitStrength({ streak, consistency, windowDays });
  const avgCompletionTime = averageCompletionTime(logs);
  const buckets = summarizeBuckets(logs);

  const payload = {
    current_streak: streak,
    consistency_score: consistency,
    habit_strength: habitStrength,
    avg_completion_time: avgCompletionTime,
    buckets,
    last_analyzed: new Date().toISOString(),
  };

  if (dryRun) return { ok: true, preview: payload };

  const summary = await upsertSummary(userId, payload);
  return { ok: true, summary, windowDays, since };
}

export function getCachedSummary(userId) {
  return getSummary(userId);
}
