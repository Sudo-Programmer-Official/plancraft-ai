// apps/backend-node/routes/ask.js
import express from "express";
import { getChatReply } from "../services/openaiService.js";

const router = express.Router();

// Optional: Add allowedOrigins check here as needed
router.post("/", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const reply = await getChatReply(prompt);
    res.status(200).json(reply);
  } catch (err) {
    console.error("Ask API error:", err);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

export default router;
