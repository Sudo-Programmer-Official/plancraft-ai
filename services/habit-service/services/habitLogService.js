import { upsertDailyLog, getLogsForDate, getLogsForWindow, getLogsForHabit } from "../firestore/habitLogsRepository.js";
import { normalizeDateKey } from "../utils/validation.js";
import { findHabit } from "./habitService.js";

export async function logCompletion({ userId, habitId, date, count = 1, timezone, source, taskId }) {
  const dayKey = normalizeDateKey(date);
  if (!dayKey) throw new Error("invalid_date");

  const habit = await findHabit(habitId);
  if (!habit || habit.userId !== userId) throw new Error("habit_not_found");

  return upsertDailyLog(habitId, userId, dayKey, {
    count,
    timezone,
    source,
    taskId,
    completed: true,
    completionTime: date || new Date().toISOString(),
  });
}

export function fetchLogsByDate(userId, date) {
  const dayKey = normalizeDateKey(date);
  return getLogsForDate(userId, dayKey);
}

export function fetchLogsWindow(userId, sinceDate) {
  return getLogsForWindow(userId, sinceDate);
}

export function fetchHabitLogs(habitId, sinceDate) {
  return getLogsForHabit(habitId, sinceDate);
}
