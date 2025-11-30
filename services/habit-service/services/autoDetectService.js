import { addHabit } from "./habitService.js";
import { logCompletion } from "./habitLogService.js";
import { normalizeDateKey } from "../utils/validation.js";

export async function handleTaskCompleted({ userId, taskId, title, category, completedAt, timezone }) {
  const habit = await ensureHabit(userId, { title, category, source: "auto" });
  const dateKey = normalizeDateKey(completedAt || new Date());
  const log = await logCompletion({
    userId,
    habitId: habit.id,
    date: dateKey,
    timezone,
    source: "task_completed",
    taskId,
  });
  return { habit, log };
}

async function ensureHabit(userId, { title, category, source }) {
  // Simple deterministic habit id by title hash is avoided to keep Firestore auto ids.
  // A more advanced version would query for similar titles; here we just create if absent.
  const habitTitle = title?.trim() || "Task Habit";
  const habit = await addHabit(userId, {
    title: habitTitle,
    category: category || "General",
    type: "auto",
    source,
    frequency: { times: 1, period: "daily" },
  });
  return habit;
}
