import dayjs from "dayjs";

export function calcStreak(logs = []) {
  const dates = new Set(
    logs
      .filter((l) => l.completed !== false)
      .map((l) => l.date || l.day || l.dayKey || l.id?.split("_")?.at(-1))
      .filter(Boolean)
  );
  if (!dates.size) return 0;

  let streak = 0;
  let cursor = dayjs().startOf("day");
  while (dates.has(cursor.format("YYYY-MM-DD"))) {
    streak += 1;
    cursor = cursor.subtract(1, "day");
  }
  return streak;
}

export function calcConsistency(logs = [], windowDays = 7) {
  const completed = new Set(
    logs
      .filter((l) => l.completed !== false)
      .map((l) => l.date || l.day || l.dayKey)
      .filter(Boolean)
  ).size;
  if (!windowDays) return 0;
  const pct = completed / Math.max(windowDays, 1);
  return clamp01(pct);
}

export function calcHabitStrength({ streak = 0, consistency = 0, windowDays = 7 }) {
  const streakWeight = Math.min(streak / Math.max(windowDays, 1), 1);
  const strength = 0.6 * streakWeight + 0.4 * consistency;
  return clamp01(strength);
}

export function averageCompletionTime(logs = []) {
  const timestamps = logs
    .map((l) => l.completionTime || l.completedAt)
    .filter(Boolean)
    .map((t) => Date.parse(t))
    .filter((t) => Number.isFinite(t));
  if (!timestamps.length) return null;
  const avg = timestamps.reduce((sum, t) => sum + t, 0) / timestamps.length;
  return new Date(avg).toISOString();
}

export function timeOfDayBucket(log) {
  const ts = Date.parse(log.completionTime || log.completedAt);
  if (!Number.isFinite(ts)) return "unknown";
  const hour = new Date(ts).getUTCHours();
  if (hour < 6) return "early";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function summarizeBuckets(logs = []) {
  const buckets = { early: 0, morning: 0, afternoon: 0, evening: 0, unknown: 0 };
  logs.forEach((log) => {
    const bucket = timeOfDayBucket(log);
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  });
  return buckets;
}

function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num <= 0) return 0;
  if (num >= 1) return 1;
  return num;
}
