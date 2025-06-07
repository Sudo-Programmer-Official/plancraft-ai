import express from "express";
import { getQuoteFromIdea } from "../services/openaiService.js";

const router = express.Router();

const allowedOrigins = [
  "https://www.prompt2quote.com",
  "https://prompt2quote.com",
  "http://localhost:5173",
];

router.options("/", (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    });
  }
  res.sendStatus(204);
});

router.post("/", async (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  const { idea } = req.body;
  if (!idea) return res.status(400).json({ error: "Idea is required" });

  try {
    const result = await getQuoteFromIdea(idea);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
