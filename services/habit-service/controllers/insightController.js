import { getWeeklyInsights, regenerateInsights } from "../services/insightService.js";
import { analyzeUser } from "../services/analyticsService.js";

export async function weeklyInsights(req, res, next) {
  try {
    const data = await getWeeklyInsights(req.userId);
    res.json({ ok: true, insights: data });
  } catch (err) {
    next(err);
  }
}

export async function monthlyInsights(_req, res) {
  // Placeholder: monthly aggregation will reuse weekly logic.
  res.json({ ok: true, insights: null, note: "monthly stub" });
}

export async function regenerate(req, res, next) {
  try {
    const insights = await regenerateInsights(req.userId);
    res.json({ ok: true, insights });
  } catch (err) {
    next(err);
  }
}

export async function dryRun(req, res, next) {
  try {
    const result = await analyzeUser(req.userId, { dryRun: true });
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
}
