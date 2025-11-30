const PERIODS = new Set(["daily", "weekly", "monthly"]);

export function validateHabitPayload(body = {}) {
  const title = String(body.title || "").trim();
  if (!title) return { error: "title_required" };

  const type = body.type === "auto" ? "auto" : "manual";
  const category = String(body.category || body.area || "General").trim() || "General";

  const times = Number(body.frequency?.times || body.times || 1);
  const period = String(body.frequency?.period || body.period || "daily").toLowerCase();
  const frequency = {
    times: Number.isFinite(times) && times > 0 ? Math.floor(times) : 1,
    period: PERIODS.has(period) ? period : "daily",
  };

  return {
    value: {
      title: title.slice(0, 120),
      type,
      category: category.slice(0, 60),
      frequency,
      targetTime: body.targetTime || null,
      source: body.source || null,
    },
  };
}

export function normalizeDateKey(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
