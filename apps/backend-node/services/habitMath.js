export function calcStreak(records = [], today = new Date()) {
  if (!Array.isArray(records) || !records.length) return 0;
  const target = startOfDay(today);
  const days = Array.from(
    new Set(
      records
        .map((item) => item?.day || item?.date || null)
        .filter(Boolean)
        .map((day) => normalizeDayKey(day)),
    ),
  )
    .filter(Boolean)
    .sort((a, b) => (a < b ? 1 : -1));

  let streak = 0;
  for (const day of days) {
    const expectedDay = formatDayKey(addDays(target, -streak));
    if (day === expectedDay) {
      streak += 1;
    } else if (day === formatDayKey(addDays(target, -(streak + 1)))) {
      // Skip gaps larger than one day; streak remains, do not break yet
      streak += 1;
    } else if (day < expectedDay) {
      break;
    }
  }
  return streak;
}

export function calcConsistency(records = [], windowDays = 7, today = new Date()) {
  if (!Array.isArray(records) || !records.length || windowDays <= 0) return 0;
  const since = addDays(startOfDay(today), -Math.abs(windowDays) + 1);
  const uniqueDays = new Set();
  records.forEach((item) => {
    const day = normalizeDayKey(item?.day || item?.date);
    if (!day) return;
    if (day >= formatDayKey(since)) {
      uniqueDays.add(day);
    }
  });
  const ratio = uniqueDays.size / windowDays;
  return Math.max(0, Math.min(1, Number(ratio.toFixed(3))));
}

export function calcHabitStrength({ streak = 0, consistency = 0, windowDays = 7 } = {}) {
  if (!Number.isFinite(streak)) streak = 0;
  if (!Number.isFinite(consistency)) consistency = 0;
  if (!Number.isFinite(windowDays) || windowDays <= 0) windowDays = 7;
  const streakComponent = Math.min(Math.max(streak / windowDays, 0), 1);
  const score = 0.7 * consistency + 0.3 * streakComponent;
  return Number(score.toFixed(3));
}

export function averageCompletionTime(records = []) {
  if (!Array.isArray(records) || !records.length) return null;
  const times = records
    .map((item) => item?.completionTime || item?.completion_time || item?.completedAt)
    .filter(Boolean)
    .map((value) => toHoursFraction(value))
    .filter((n) => Number.isFinite(n));
  if (!times.length) return null;
  const avg = times.reduce((sum, value) => sum + value, 0) / times.length;
  const hours = Math.floor(avg);
  const minutes = Math.round((avg - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function toHoursFraction(value) {
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.getHours() + date.getMinutes() / 60;
  } catch {
    return null;
  }
}

function normalizeDayKey(input) {
  if (!input) return null;
  if (typeof input === "string") {
    const token = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return token;
    const date = new Date(token);
    if (!Number.isNaN(date.getTime())) return formatDayKey(date);
    return null;
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return formatDayKey(input);
  }
  if (typeof input === "object" && input.seconds) {
    const date = new Date(input.seconds * 1000);
    if (!Number.isNaN(date.getTime())) return formatDayKey(date);
  }
  return null;
}

function formatDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}
