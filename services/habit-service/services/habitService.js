import {
  listHabits,
  createHabit,
  updateHabit,
  softDeleteHabit,
  getHabit,
} from "../firestore/habitsRepository.js";
import { validateHabitPayload } from "../utils/validation.js";

export async function getUserHabits(userId) {
  return listHabits(userId);
}

export async function addHabit(userId, body) {
  const { error, value } = validateHabitPayload(body);
  if (error) throw new Error(error);
  return createHabit({ ...value, userId, active: true });
}

export async function editHabit(userId, habitId, body) {
  const existing = await getHabit(habitId);
  if (!existing || existing.userId !== userId) throw new Error("habit_not_found");
  const { error, value } = validateHabitPayload({ ...existing, ...body });
  if (error) throw new Error(error);
  return updateHabit(habitId, value);
}

export async function removeHabit(userId, habitId) {
  const existing = await getHabit(habitId);
  if (!existing || existing.userId !== userId) throw new Error("habit_not_found");
  return softDeleteHabit(habitId);
}

export async function findHabit(habitId) {
  return getHabit(habitId);
}
