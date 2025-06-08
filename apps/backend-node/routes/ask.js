// apps/backend-node/routes/ask.js
import express from "express";
import { getChatReply } from "../services/openaiService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Valid prompt is required" });
  }

  try {
    const reply = await getChatReply(prompt);
    res.status(200).json(reply);
  } catch (err) {
    console.error("❌ Ask API error:", err?.message || err);
    res.status(500).json({ error: "AI assistant failed to respond." });
  }
});

export default router;
