import { getCachedSummary } from "./analyticsService.js";
import { sendCoachPrompt } from "./aiClient.js";

export async function getCoachMessage(userId) {
  const summary = await getCachedSummary(userId);
  const prompt = buildPrompt(summary);
  const response = await sendCoachPrompt(prompt, { userId });
  return {
    message: response.message || response.text || "Keep going—consistency compounds.",
    model: response.model || "habit-coach-stub",
  };
}

function buildPrompt(summary) {
  const streak = summary?.current_streak ?? 0;
  const consistency = summary?.consistency_score ?? 0;
  const strength = summary?.habit_strength ?? 0;
  return [
    "You are a concise, encouraging habit coach for PlanCraftAI.",
    `Streak: ${streak} days`,
    `Consistency: ${(consistency * 100).toFixed(0)}%`,
    `Habit strength: ${(strength * 100).toFixed(0)}%`,
    "Give one short, specific suggestion.",
  ].join("\n");
}
