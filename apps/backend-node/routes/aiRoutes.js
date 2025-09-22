// routes/ai.js
import express from "express";
import { enhanceJournalEntry, summarizeTasks, splitTasks } from "../services/openaiService.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const router = express.Router();

const allowedOrigins = [
  "https://plancraftai.com",
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

  // const prompt = `
  // Break this daily plan into clear tasks (short, actionable):
  // "${text}"
  // Return as a JSON array of task titles.
  // `;

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
//     const raw = await chatWithFallback({
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.3,
//     });

//     let tasks;
//     try {
//       tasks = JSON.parse(raw);
//     } catch {
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
// router.post("/split-tasks", async (req, res) => {
//   const { text } = req.body;
//   if (!text) return res.json({ tasks: [] });

// const prompt = `
// You are an assistant that extracts ONLY actionable tasks from a user's daily reflection.

// Rules:
// - Ignore greetings, emotions, or filler sentences (e.g., "Hey", "I'm feeling good", "It was a great day").
// - Keep only actionable items: things to do, complete, or accomplish.
// - Rewrite them as clear, concise tasks starting with a verb if possible.
// - Output ONLY valid JSON array, no commentary, in the format:
// ["Task 1", "Task 2", "Task 3"]

// Example:
// Input: "Hey, today I felt good. I need to finish a project, prepare breakfast, and maybe go for a run."
// Output: ["Finish the project", "Prepare breakfast", "Go for a run"]

// Now extract actionable tasks from this daily plan:
// "${text}"
// Return as a JSON array of task titles.
// `;

//   try {
//     const raw = await chatWithFallback({
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.2, // lower temp for consistency
//     });

//     let tasks = [];
//     try {
//       tasks = JSON.parse(raw);
//     } catch {
//       // fallback: try to recover list
//       tasks = raw
//         .split("\n")
//         .map((t) => t.replace(/^\d+\.\s*/, "").replace(/^-/, "").trim())
//         .filter(Boolean);
//     }

//     res.json({ tasks });
//   } catch (error) {
//     console.error("❌ Split Tasks API Error:", error);
//     res.status(500).json({ error: "Failed to generate tasks" });
//   }
// });
// router.post("/split-tasks", async (req, res) => {
//   const { text } = req.body;
//   if (!text) return res.json({ tasks: [] });

//   const prompt = `
// You are a productivity assistant. Extract ONLY actionable tasks from the user's input.

// Rules:
// - Ignore reflections, moods, or comments (e.g., "Today was a great day", "I feel good").
// - Keep only concrete, do-able tasks.
// - Rewrite tasks starting with a verb (Finish, Prepare, Go, Write, Call, Email, etc.).
// - Output ONLY valid JSON array of strings, no markdown, no explanations.

// Example:
// Input: "I had a great day. I need to finish a feature, then prepare breakfast, and maybe go to the gym."
// Output: ["Finish the feature", "Prepare breakfast", "Go to the gym"]

// Daily plan:
// "${text}"
// `;

//   try {
//     const raw = await chatWithFallback({
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.1, // keep super deterministic
//     });

//     let tasks = [];
//     try {
//       // Clean up possible markdown or stray quotes
//       const cleaned = raw
//         .replace(/```json/i, "")
//         .replace(/```/g, "")
//         .trim();

//       tasks = JSON.parse(cleaned);

//       // Final sanitization: keep only strings that start with a verb-like word
//       tasks = tasks.filter(
//         (t) =>
//           typeof t === "string" &&
//           /^[A-Z][a-z]+/.test(t) && // starts with a capitalized word
//           t.length > 2
//       );
//     } catch {
//       // fallback recovery
//       tasks = raw
//         .split("\n")
//         .map((t) =>
//           t.replace(/^\d+\.\s*/, "")
//             .replace(/^-/, "")
//             .trim()
//         )
//         .filter(Boolean);
//     }

//     res.json({ tasks });
//   } catch (error) {
//     console.error("❌ Split Tasks API Error:", error);
//     res.status(500).json({ error: "Failed to generate tasks" });
//   }
// });
router.post('/split-tasks', async (req, res) => {
  try {
    const { text, maxItems = 6, context = '' } = req.body || {}
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "'text' is required" })
    }
    const result = await splitTasks(text, { maxItems, context })
    if (!result || !Array.isArray(result.tasks)) {
      return res.status(502).json({ error: 'Upstream returned unexpected format.' })
    }
    const tasks = result.tasks
      .filter((t) => t && typeof t.title === 'string' && t.title.trim().length > 0)
      .map((t, i) => ({
        title: t.title.trim(),
        details: typeof t.details === 'string' ? t.details.trim() : '',
        estimate_minutes: Number.isFinite(t.estimate_minutes) ? t.estimate_minutes : 15,
        energy: ['low', 'medium', 'high'].includes((t.energy || '').toLowerCase()) ? t.energy.toLowerCase() : 'low',
        context: typeof t.context === 'string' ? t.context : 'planning',
        priority: Number.isFinite(t.priority) ? t.priority : Math.min(i + 1, 3),
      }))
    res.json({ tasks })
  } catch (error) {
    console.error('❌ Split Tasks API Error:', error)
    res.status(500).json({ error: 'Failed to generate tasks' })
  }
})

export default router;
