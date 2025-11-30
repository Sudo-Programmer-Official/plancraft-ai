import { logCompletion, fetchLogsByDate } from "../services/habitLogService.js";

export async function createLog(req, res, next) {
  try {
    const log = await logCompletion({
      userId: req.userId,
      habitId: req.params.id,
      date: req.body?.date || new Date(),
      count: req.body?.count || 1,
      timezone: req.body?.timezone,
      source: req.body?.source || "manual",
      taskId: req.body?.taskId,
    });
    res.status(201).json({ ok: true, log });
  } catch (err) {
    err.status = err.message === "habit_not_found" ? 404 : 400;
    next(err);
  }
}

export async function listLogs(req, res, next) {
  try {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: "Missing date" });
    const logs = await fetchLogsByDate(req.userId, date);
    res.json({ ok: true, logs });
  } catch (err) {
    next(err);
  }
}
