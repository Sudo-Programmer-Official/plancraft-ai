import express from "express";
import { requireAuth, ensureUserMatches } from "../middleware/auth.js";
import { saveFeedback } from "../services/feedbackService.js";

const router = express.Router();

router.use(requireAuth, ensureUserMatches);

router.post("/", async (req, res) => {
  try {
    const { userId, rating, type, message, context = {}, metadata = {} } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const feedback = await saveFeedback({
      userId,
      rating,
      type,
      message,
      context,
      metadata,
      userAgent: req.headers["user-agent"],
      locale: req.headers["accept-language"],
    });

    return res.json({ feedback });
  } catch (err) {
    console.error("[FeedbackRoutes] save failed", err?.message || err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || "Failed to submit feedback" });
  }
});

export default router;
