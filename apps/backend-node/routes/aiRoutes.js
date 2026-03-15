// routes/ai.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { enhanceJournalEntry, summarizeTasks, splitTasks, extractReminderTime, extractTasksFromImage } from "../services/openaiService.js";
import { inferCategory } from "../services/categoryService.js";
import { checkUserPlanUsage } from "../services/planService.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
// Enable image tasks if either env flag is true; default to true to avoid blocking uploads in dev
const ENABLE_IMAGE_TASKS = (() => {
  const flagString = process.env.VITE_ENABLE_IMAGE_TASKS ?? process.env.ENABLE_IMAGE_TASKS
  if (flagString === undefined) return true // default on to avoid breaking image-only flows
  return String(flagString).toLowerCase() === 'true'
})()

const allowedOrigins = [
  "https://plancraftai.com",
  "https://www.plancraftai.com",
  "capacitor://plancraftai.com",
  "capacitor://localhost",
  "ionic://localhost",
  "https://audit-agent-66451.web.app",
  "https://api.plancraftai.com", 
  "https://audit-agent-66451.firebaseapp.com",
  "https://audit-agent.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // ✅ Production domains
  "https://www.plancraftai.com",
  "https://plancraftai.web.app",   // if you still deploy via Firebase Hosting

  // ✅ Local development
  // ✅ Optional API subdomain (if backend runs separately)
  "https://api.plancraftai.com",
]

function isNativeAppOrigin(origin) {
  return typeof origin === 'string' && /^(capacitor|ionic):\/\/[a-z0-9.-]+$/i.test(origin)
}

// Middleware: CORS
router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || isNativeAppOrigin(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-App-Token, X-User-Email, X-User-Id, X-User-Role, X-User-Tz, X-Requested-With"
  );
  res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204); // preflight quick exit
  next();
});

// Require auth for AI endpoints
router.use(requireAuth)

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

     // 🔹 Compact here before sending to OpenAI
    const safeTasks = (tasks || []).map(t => ({
      title: (t.title || "").slice(0, 120),
      completed: !!t.completed,
      date: t.date || null,
    }));


    const summary = await summarizeTasks(safeTasks);
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
    const {
      text,
      maxItems = 6,
      context = '',
      timeContext = null,
      now: clientNow,
      attachments = [],
      planDate = null,
      reminderTime: requestedReminderTime = null,
      workspaceId = null,
    } = req.body || {}
    const tz = (req.body && req.body.timezone) || req.headers['x-user-tz'] || 'UTC'
    const nowIso = typeof clientNow === 'string' && clientNow ? clientNow : new Date().toISOString()
    const normalizedAttachments = Array.isArray(attachments)
      ? attachments
          .map((att) => ({
            type: 'image',
            url: att?.url,
            mime: att?.mime,
            name: att?.name,
          }))
          .filter((att) => att.url)
      : []
    const hasAttachment = normalizedAttachments.length > 0
    const visionAllowed = ENABLE_IMAGE_TASKS && hasAttachment
    if (!text && !hasAttachment) {
      return res.status(400).json({ error: "Either 'text' or 'attachments' is required" })
    }
    // Plan enforcement and usage increment
    try {
      const userId = req.user?.uid || req.headers['x-user-id']
      if (userId) {
        const ok = await checkUserPlanUsage(String(userId), 'ai')
        if (!ok?.ok) {
          return res.status(403).json({ error: 'Daily AI limit reached. Upgrade to Pro to continue.' })
        }
      }
    } catch {}

    const combinedTasks = []
    let reminderTime = requestedReminderTime || null
    const firstAttachment = hasAttachment ? normalizedAttachments[0] : null

    if (visionAllowed && firstAttachment) {
      try {
        const vision = await extractTasksFromImage(firstAttachment.url, {
          planDate,
          reminderTime: requestedReminderTime,
          workspaceId,
        })
        if (Array.isArray(vision?.tasks)) {
          combinedTasks.push(
            ...vision.tasks.map((task) => ({
              ...task,
              source: task?.source || 'image',
              metadata: { ...(task?.metadata || {}), attachmentUrl: firstAttachment.url },
              attachments: [firstAttachment],
            })),
          )
        }
      } catch (err) {
        console.warn('[TimeBrain] vision extraction failed', err?.message || err)
      }
    }

    let reminderFromText = null
    if (text && typeof text === 'string') {
      const result = await splitTasks(text, { maxItems, context, timeContext })
      if (!result || !Array.isArray(result.tasks)) {
        return res.status(502).json({ error: 'Upstream returned unexpected format.' })
      }
      reminderFromText = result?.reminderTime ?? null
      combinedTasks.push(
        ...result.tasks.map((t) => ({
          ...t,
          source: t?.source || 'text',
        })),
      )
    }

    const rawTasks = combinedTasks.length ? combinedTasks.slice(0, maxItems) : []
    const normalizedTasks = rawTasks
      .filter((t) => t && typeof t.title === 'string' && t.title.trim().length > 0)
      .map((t, i) => ({
        title: t.title.trim(),
        displayTitle: typeof t.displayTitle === 'string' ? t.displayTitle.trim() : t.title.trim(),
        rawPhrase: typeof t.rawPhrase === 'string' ? t.rawPhrase.trim() : t.title.trim(),
        details: typeof t.details === 'string' ? t.details.trim() : '',
        estimate_minutes: Number.isFinite(t.estimate_minutes) ? t.estimate_minutes : 15,
        energy: ['low', 'medium', 'high'].includes((t.energy || '').toLowerCase()) ? t.energy.toLowerCase() : 'low',
        context: typeof t.context === 'string' ? t.context : 'planning',
        priority: Number.isFinite(t.priority) ? t.priority : Math.min(i + 1, 3),
        scheduledTime: typeof t.scheduledTime === 'string' ? t.scheduledTime : null,
        timeHint: typeof t.timeHint === 'string' ? t.timeHint : null,
        relation: ['after_previous', 'same_time_previous', 'independent'].includes(String(t.relation || '').toLowerCase())
          ? String(t.relation).toLowerCase()
          : 'independent',
        gapMinutes: Number.isFinite(t.gapMinutes) ? Math.max(0, Math.min(Number(t.gapMinutes), 120)) : 15,
        source: t.source || (firstAttachment ? 'image' : 'text'),
        metadata: t.metadata || (firstAttachment ? { attachmentUrl: firstAttachment.url } : {}),
        attachments: Array.isArray(t.attachments) ? t.attachments : firstAttachment ? [firstAttachment] : [],
      }))
    const tasks = await Promise.all(
      normalizedTasks.map(async (task) => {
        let category = 'Other'
        try {
          category = await inferCategory(task.title, task.details)
        } catch (err) {
          try {
            console.warn('[TimeBrain][Category] assign:error', {
              title: task.title,
              message: err?.message || err,
            })
          } catch {}
        }
        return { ...task, category }
      })
    )
    try {
      console.log('[TimeFlow] /split-tasks normalized', {
        count: tasks.length,
        sample: tasks[0] || null,
      })
    } catch {}
    // Attempt time extraction from the same input (non-fatal)
    if (!reminderTime && reminderFromText) reminderTime = reminderFromText
    if (!reminderTime && text) {
      try { reminderTime = await extractReminderTime(text, { nowISO: nowIso, timezone: tz, timeContext }) } catch {}
    }
    res.json({ tasks, reminderTime })
  } catch (error) {
    console.error('❌ Split Tasks API Error:', error)
    res.status(500).json({ error: 'Failed to generate tasks' })
  }
})

// POST /api/ai/extract-time
router.post('/extract-time', async (req, res) => {
  try {
    const { text, now, timeContext = null } = req.body || {}
    const tz = (req.body && req.body.timezone) || req.headers['x-user-tz'] || 'UTC'
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "'text' is required" })
    }
    const iso = await extractReminderTime(text, { nowISO: now, timezone: tz, timeContext })
    res.json({ reminderTime: iso || null })
  } catch (error) {
    console.error('❌ Extract Time API Error:', error)
    res.status(500).json({ error: 'Failed to extract reminder time' })
  }
})

export default router;
