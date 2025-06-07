import express from "express";
import { getQuoteFromIdea } from "../services/openaiService.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { idea } = req.body;
  if (!idea) return res.status(400).json({ error: "Idea is required" });

  try {
    const result = await getQuoteFromIdea(idea);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
