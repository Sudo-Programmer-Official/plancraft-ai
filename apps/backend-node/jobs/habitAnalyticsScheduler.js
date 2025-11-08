import cron from "node-cron";
import { runHabitAnalytics } from "./habitAnalytics.js";
import { normalizeCronSpec } from "../utils/cronSpec.js";

function shouldEnable() {
  const raw = String(process.env.ENABLE_HABIT_ANALYTICS || "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function cronSpec() {
  return normalizeCronSpec(process.env.HABIT_ANALYTICS_CRON, "0 5 * * *");
}

export function initHabitAnalyticsScheduler() {
  if (!shouldEnable()) {
    console.log("[HabitAnalytics] scheduler disabled (set ENABLE_HABIT_ANALYTICS=1 to enable)");
    return;
  }

  const spec = cronSpec();
  console.log(`[HabitAnalytics] scheduler enabled (spec=${spec})`);
  cron.schedule(spec, async () => {
    try {
      console.log("[HabitAnalytics] cron triggered", new Date().toISOString());
      await runHabitAnalytics();
    } catch (err) {
      console.error("[HabitAnalytics] cron job failed", err?.message || err);
    }
  });
}

export default {
  initHabitAnalyticsScheduler,
};
