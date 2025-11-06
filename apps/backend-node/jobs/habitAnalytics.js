import dayjs from "dayjs";
import { db } from "../services/firebaseAdmin.js";
import {
  calcStreak,
  calcConsistency,
  calcHabitStrength,
  averageCompletionTime,
} from "../services/habitMath.js";

function flagEnabled() {
  const raw = String(process.env.ENABLE_HABIT_ANALYTICS || "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

function resolveWindowDays() {
  const raw = Number(process.env.HABIT_ANALYTICS_WINDOW_DAYS || 7);
  if (!Number.isFinite(raw) || raw <= 0) return 7;
  return Math.min(Math.max(Math.floor(raw), 1), 60);
}

function startDateForWindow(days) {
  const windowDays = Number.isFinite(days) ? days : 7;
  return dayjs().utc().startOf("day").subtract(windowDays - 1, "day").format("YYYY-MM-DD");
}

export async function runHabitAnalytics({ dryRun = false } = {}) {
  if (!flagEnabled()) {
    console.log("[HabitAnalytics] skipped (flag off)");
    return { processed: 0, skipped: "flag_off" };
  }

  const windowDays = resolveWindowDays();
  const sinceDayKey = startDateForWindow(windowDays);
  const todayIso = new Date().toISOString();

  const usersSnap = await db.collection("users").get();
  const userDocs = usersSnap.docs || [];
  console.log(`[HabitAnalytics] analyzing ${userDocs.length} users (window=${windowDays} days)`);

  let processed = 0;
  for (const doc of userDocs) {
    const uid = doc.id;
    try {
      const habitsSnap = await db
        .collection("habit_tracker")
        .where("userId", "==", uid)
        .where("day", ">=", sinceDayKey)
        .get();

      if (habitsSnap.empty) {
        console.log(`[HabitAnalytics] no data for user=${uid}`);
        continue;
      }

      const records = habitsSnap.docs.map((d) => d.data() || {});
      const streak = calcStreak(records);
      const consistency = calcConsistency(records, windowDays);
      const strength = calcHabitStrength({ streak, consistency, windowDays });
      const avgTime = averageCompletionTime(records);

      console.log(
        `[HabitAnalytics] user=${uid} streak=${streak} consistency=${consistency} strength=${strength}`,
      );

      if (dryRun) continue;

      const payload = {
        current_streak: streak,
        consistency_score: consistency,
        habit_strength: strength,
        avg_completion_time: avgTime,
        last_analyzed: todayIso,
        streak_updated_at: todayIso,
        updated_at: todayIso,
      };

      await db.collection("habit_summary").doc(uid).set(payload, { merge: true });
      processed += 1;
    } catch (err) {
      console.error("[HabitAnalytics] user analysis failed", { uid, error: err?.message || err });
    }
  }

  console.log(`[HabitAnalytics] completed. summaries updated=${processed}`);
  return { processed, windowDays, since: sinceDayKey };
}

export default {
  runHabitAnalytics,
};
