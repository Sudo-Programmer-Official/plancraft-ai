import express from "express";
import { sendPushNotification } from "../services/notifyService.js";
import { normalizeNotificationSound } from "../utils/notificationSound.js";

const router = express.Router();

router.post("/notify", async (req, res) => {
  const { token, title, body, sound } = req.body || {};
  if (!token || !title || !body) {
    return res
      .status(400)
      .json({ success: false, error: "token, title, body required" });
  }

  try {
    const response = await sendPushNotification(
      token,
      title,
      body,
      {},
      {
        sound: normalizeNotificationSound(sound),
      },
    );
    res.json({ success: true, response });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err?.message || "send failed" });
  }
});

export default router;
