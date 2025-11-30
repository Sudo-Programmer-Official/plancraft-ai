import { getLatestInsights, saveInsights } from "../firestore/habitInsightsRepository.js";
import { analyzeUser, getCachedSummary } from "./analyticsService.js";
import { calcStreak, calcConsistency, summarizeBuckets } from "../ml/rules.js";

export async function getWeeklyInsights(userId) {
  const cached = await getLatestInsights(userId);
  return cached;
}

export async function regenerateInsights(userId) {
  const summaryResult = await analyzeUser(userId, { dryRun: false });
  const summary = summaryResult.summary || (await getCachedSummary(userId));
  const logsDigest = summaryResult.preview?.logs || null;

  const streak = summary?.current_streak || 0;
  const consistency = summary?.consistency_score || 0;
  const strength = summary?.habit_strength || 0;
  const buckets = summary?.buckets || summarizeBuckets(logsDigest || []);

  const suggestions = buildSuggestions({ streak, consistency, strength, buckets });
  const payload = {
    weekStart: resolveWeekStart(),
    consistencyScore: consistency,
    streaks: { overall: streak },
    strongestHabit: summary?.strongestHabit || null,
    weakestHabit: summary?.weakestHabit || null,
    suggestions,
  };
  return saveInsights(userId, payload);
}

function buildSuggestions({ streak, consistency, strength, buckets }) {
  const ideas = [];
  if (streak >= 5) ideas.push("Strong streak—schedule a celebration day to lock the habit.");
  if (streak === 0) ideas.push("Restart with a tiny version of your habit to rebuild momentum.");
  if (consistency < 0.5) ideas.push("Add a reminder at the time you usually complete tasks.");
  if (strength > 0.7) ideas.push("Increase difficulty slightly or chain with a new habit.");

  const topBucket = Object.entries(buckets || {}).sort((a, b) => b[1] - a[1])[0];
  if (topBucket && topBucket[1] > 0) {
    ideas.push(`You complete more in the ${topBucket[0]}. Protect that time block.`);
  }
  return ideas.slice(0, 4);
}

function resolveWeekStart() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const diff = (day + 6) % 7; // start Monday
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return start.toISOString().slice(0, 10);
}
