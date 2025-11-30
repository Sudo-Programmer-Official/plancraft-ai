import { getCoachMessage } from "../services/coachService.js";

export async function sendCoachMessage(req, res, next) {
  try {
    const payload = await getCoachMessage(req.userId, req.body || {});
    res.json({ ok: true, message: payload });
  } catch (err) {
    next(err);
  }
}
