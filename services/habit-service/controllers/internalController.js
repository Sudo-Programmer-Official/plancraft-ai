import { handleTaskCompleted } from "../services/autoDetectService.js";

export async function taskCompleted(req, res, next) {
  try {
    const { userId, taskId, title, category, completedAt, timezone } = req.body || {};
    if (!userId || !taskId) {
      return res.status(400).json({ error: "Missing userId or taskId" });
    }
    const result = await handleTaskCompleted({
      userId,
      taskId,
      title,
      category,
      completedAt,
      timezone,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}
