// routes/ai.js
import express from "express";
import { enhanceJournalEntry, summarizeTasks, chatWithFallback } from "../services/openaiService.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// routes/ai.js
// router.post("/split-tasks", async (req, res) => {
//   const { text } = req.body;

//   const prompt = `
//   Break this daily plan into clear tasks (short, actionable):
//   "${text}"
//   Return as a JSON array of task titles.
//   `;

//   const response = await openai.chat.completions.create({
//     model: "gpt-3-turbo",
//     messages: [{ role: "user", content: prompt }],
//   });

//   try {
//     const tasks = JSON.parse(response.choices[0].message.content);
//     res.json({ tasks });
//   } catch (e) {
//     res.json({ tasks: response.choices[0].message.content.split("\n") });
//   }
// });
// routes/ai.js
// router.post("/split-tasks", async (req, res) => {
//   const { text } = req.body;

//   const prompt = `
//   Break this daily plan into short, actionable tasks.
//   Return ONLY valid JSON in the format:
//   ["Task 1", "Task 2", "Task 3"]
  
//   Daily plan:
//   "${text}"
//   `;

//   try {
//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini", // ✅ or gpt-4-turbo
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.3,
//     });

//     const raw = response.choices[0].message.content.trim();
//     let tasks;

//     try {
//       tasks = JSON.parse(raw); // Expecting JSON array
//     } catch (err) {
//       // Fallback: split by line breaks if JSON parsing fails
//       tasks = raw
//         .split("\n")
//         .map((t) => t.replace(/^\d+\.\s*/, "").trim())
//         .filter(Boolean);
//     }

//     res.json({ tasks });
//   } catch (error) {
//     console.error("❌ Split Tasks API Error:", error);
//     res.status(500).json({ error: "Failed to generate tasks" });
//   }
// });
router.post("/split-tasks", async (req, res) => {
  const { text } = req.body;

  const prompt = `
  Break this daily plan into short, actionable tasks.
  Return ONLY valid JSON in the format:
  ["Task 1", "Task 2", "Task 3"]

  Daily plan:
  "${text}"
  `;

  try {
    const raw = await chatWithFallback({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    let tasks;
    try {
      tasks = JSON.parse(raw);
    } catch {
      tasks = raw
        .split("\n")
        .map((t) => t.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean);
    }

    res.json({ tasks });
  } catch (error) {
    console.error("❌ Split Tasks API Error:", error);
    res.status(500).json({ error: "Failed to generate tasks" });
  }
});

export default router;