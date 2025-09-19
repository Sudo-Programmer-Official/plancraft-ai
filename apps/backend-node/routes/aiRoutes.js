// routes/ai.js
import express from "express";
import { enhanceJournalEntry, summarizeTasks } from "../services/openaiService.js";

const router = express.Router();

const allowedOrigins = [
  "http://localhost:5173", // dev
  "https://audit-agent-66451.web.app", // prod
  "https://audit-agent-66451.firebaseapp.com", // prod
];

// Middleware: CORS
router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204); // preflight quick exit
  next();
});

// Enhance journal
router.post("/journal/enhance", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text" });

    const enhanced = await enhanceJournalEntry(text);
    res.json({ enhanced });
  } catch (err) {
    console.error("❌ Journal Enhance Error:", err);
    res.status(500).json({ error: "Failed to enhance journal entry" });
  }
});

// Summarize tasks
router.post("/tasks/summarize", async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: "Tasks should be an array" });
    }

    const summary = await summarizeTasks(tasks);
    res.json({ summary });
  } catch (err) {
    console.error("❌ Task Summarize Error:", err);
    res.status(500).json({ error: "Failed to summarize tasks" });
  }
});

export default router;