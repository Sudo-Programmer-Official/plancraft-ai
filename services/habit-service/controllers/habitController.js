import { addHabit, editHabit, getUserHabits, removeHabit } from "../services/habitService.js";

export async function listHabits(req, res, next) {
  try {
    const habits = await getUserHabits(req.userId);
    res.json({ ok: true, habits });
  } catch (err) {
    next(err);
  }
}

export async function createHabit(req, res, next) {
  try {
    const habit = await addHabit(req.userId, req.body || {});
    res.status(201).json({ ok: true, habit });
  } catch (err) {
    err.status = err.message?.includes("title_required") ? 400 : 400;
    next(err);
  }
}

export async function updateHabit(req, res, next) {
  try {
    const habit = await editHabit(req.userId, req.params.id, req.body || {});
    res.json({ ok: true, habit });
  } catch (err) {
    err.status = err.message === "habit_not_found" ? 404 : 400;
    next(err);
  }
}

export async function deleteHabit(req, res, next) {
  try {
    const habit = await removeHabit(req.userId, req.params.id);
    res.json({ ok: true, habit, deleted: true });
  } catch (err) {
    err.status = err.message === "habit_not_found" ? 404 : 400;
    next(err);
  }
}
