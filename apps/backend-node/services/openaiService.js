// services/openaiService.js
import OpenAI from "openai";
import dotenv from "dotenv";
import dayjs from '../utils/dayjs.js'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { routeTaskParse } from './aiProviderRouter.js'
dotenv.config();

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
dayjs.extend(utc)
dayjs.extend(timezone)

// Centralized helper with model fallbacks and friendlier errors
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const FALLBACK_MODELS = (
  process.env.OPENAI_MODEL_FALLBACKS?.split(",") || [
    // Ordered by preference; edit via env if needed
    "gpt-4.1-mini",
    "gpt-4.1",
    "gpt-3.5-turbo",
  ]
).map((s) => s.trim()).filter(Boolean);
const VISION_MODEL_CANDIDATES = (
  process.env.OPENAI_VISION_MODELS?.split(",") || [
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4o",
    "gpt-4o-mini",
  ]
).map((s) => s.trim()).filter(Boolean)

function stripJsonFences(text = "") {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim()
}

function tryParseTasks(jsonText = "") {
  const cleaned = stripJsonFences(jsonText)
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed
    if (Array.isArray(parsed?.tasks)) return parsed.tasks
    return []
  } catch {
    return []
  }
}

export async function chatWithFallback({ messages, temperature = 0.7, modelList, timeoutMs = 60000 }) {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured")
  }
  const models = modelList && modelList.length ? modelList : [DEFAULT_MODEL, ...FALLBACK_MODELS];
  let lastErr;
  for (const model of models) {
    try {
      const startedAt = Date.now();
      const res = await openai.chat.completions.create(
        {
          model,
          messages,
          temperature,
        },
        { timeout: timeoutMs },
      );
      const elapsed = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.log(`[openaiService] ${model} responded in ${elapsed}ms`);
      return res.choices[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      lastErr = err;
      const code = err?.code || err?.error?.code;
      const status = err?.status;
      const msg = err?.error?.message || err?.message || "";
      const isModelAccessError =
        code === "model_not_found" ||
        status === 403 ||
        status === 404 ||
        /does not have access to model/i.test(msg);
      if (isModelAccessError) {
        // Try next model in the list
        // eslint-disable-next-line no-console
        console.warn(`[openaiService] Model '${model}' unavailable. Trying next fallback...`);
        continue;
      }
      // Any other error: stop and bubble up
      throw err;
    }
  }
  // If we exhausted all fallbacks
  const friendly = new Error(
    `All configured OpenAI models are unavailable. ` +
      `Set OPENAI_MODEL/OPENAI_MODEL_FALLBACKS or check project access.`
  );
  friendly.cause = lastErr;
  throw friendly;
}

export async function extractTasksFromImage(imageUrl, { planDate = null, reminderTime = null, workspaceId = null } = {}) {
  if (!imageUrl) return { tasks: [] }
  const details = [
    'You are an assistant turning screenshots and photos into actionable tasks.',
    'Look for todos, deadlines, meetings, and errands.',
    'Return ONLY valid JSON:',
    '{"tasks":[{"title":"","description":"","dueDate":"","priority":"","timeHint":""}]}',
    'Keep titles under 9 words. If nothing actionable, return {"tasks":[]}.',
  ]
  if (planDate) details.push(`Planning date: ${planDate}.`)
  if (reminderTime) details.push(`Reminder time preference: ${reminderTime}.`)
  if (workspaceId) details.push(`Workspace: ${workspaceId}.`)

  const messages = [
    { role: "system", content: "You translate visual notes into short, clear tasks for a planner." },
    {
      role: "user",
      content: [
        { type: "text", text: details.join("\n") },
        { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
      ],
    },
  ]

  const content = await chatWithFallback({
    messages,
    temperature: 0.3,
    modelList: VISION_MODEL_CANDIDATES,
    timeoutMs: 90000,
  })

  const tasks = tryParseTasks(content)
  return { tasks }
}

// ✨ Journal Enhancer
export async function enhanceJournalEntry(rawText) {
  const prompt = `
You are a mindful writing assistant. Take the following raw journal entry:
"${rawText}"

Enhance it into a clearer, empathetic reflection without losing the user's intent.
Return only the improved text.
  `;
  return chatWithFallback({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
}

// ✨ Task Summarizer
// export async function summarizeTasks(tasks) {
//   const prompt = `
// You are an AI productivity coach. Given these tasks:
// ${JSON.stringify(tasks, null, 2)}

// Summarize progress with:
// - Completed %
// - Pending items
// - Suggested focus for today
// Return valid JSON only.
//   `;
//   const content = await chatWithFallback({ messages: [{ role: "user", content: prompt }], temperature: 0.5 });
//   return JSON.parse(content);
// }
// export async function summarizeTasks(tasks) {
//   const prompt = `
// You are an assistant analyzing a task list. 
// Return a JSON object with:

// {
//   "Completed %": <number>,
//   "Pending items": <number>,
//   "Suggested focus for today": "<string>",
//   "Quick wins": [ "<string>", "<string>" ],
//   "Heavy lifts": [ "<string>", "<string>" ],
//   "Weekly warning": "<string>"
// }

// Tasks:
// ${JSON.stringify(tasks, null, 2)}
// `

//   const response = await openai.chat.completions.create({
//     model: "gpt-3.5-turbo",
//     messages: [{ role: "user", content: prompt }],
//     response_format: { type: "json_object" }
//   })

//   return JSON.parse(response.choices[0].message.content)
// }
// services/openaiService.js

function normalizeSummaryTask(task = {}) {
  const title = String(task?.title || "").trim().slice(0, 160)
  const normalizedDate = task?.date ? dayjs(task.date) : null
  const date = normalizedDate?.isValid?.() ? normalizedDate.format("YYYY-MM-DD") : null
  return {
    title,
    completed: !!task?.completed,
    date,
  }
}

function titleWordCount(title = "") {
  return title.trim().split(/\s+/).filter(Boolean).length
}

const SUMMARY_HEAVY_KEYWORDS = [
  "plan",
  "review",
  "prepare",
  "build",
  "draft",
  "research",
  "submit",
  "complete",
  "finalize",
  "application",
  "billing",
  "tax",
  "report",
  "proposal",
  "meeting",
  "portal",
]

const SUMMARY_QUICK_KEYWORDS = [
  "call",
  "email",
  "text",
  "reply",
  "send",
  "check",
  "book",
  "pay",
  "share",
  "update",
  "confirm",
  "follow up",
]

function isHeavyLift(title = "") {
  const normalized = title.toLowerCase()
  const wordCount = titleWordCount(normalized)
  return wordCount >= 6 || SUMMARY_HEAVY_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function isQuickWin(title = "") {
  const normalized = title.toLowerCase()
  const wordCount = titleWordCount(normalized)
  return wordCount <= 4 || SUMMARY_QUICK_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

function summaryUrgency(task, todayKey, weekEndKey) {
  if (!task?.date) return 4
  if (task.date < todayKey) return 0
  if (task.date === todayKey) return 1
  if (task.date <= weekEndKey) return 2
  return 3
}

function dedupeSummaryTitles(tasks = [], limit = 3) {
  const seen = new Set()
  const picked = []
  for (const task of tasks) {
    const title = String(task?.title || "").trim()
    if (!title) continue
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    picked.push(title)
    if (picked.length >= limit) break
  }
  return picked
}

export async function summarizeTasks(tasks) {
  const normalized = Array.isArray(tasks) ? tasks.map(normalizeSummaryTask).filter((task) => task.title) : []
  if (!normalized.length) {
    return {
      "Completed %": 0,
      "Pending items": 0,
      "Suggested focus for today": "No tasks found",
      "Quick wins": [],
      "Heavy lifts": [],
      "Weekly warning": "",
    }
  }

  const total = normalized.length
  const completedCount = normalized.filter((task) => task.completed).length
  const pendingTasks = normalized.filter((task) => !task.completed)
  const pendingCount = pendingTasks.length
  const completedPct = total ? Math.round((completedCount / total) * 100) : 0

  if (!pendingCount) {
    return {
      "Completed %": completedPct,
      "Pending items": 0,
      "Suggested focus for today": "Great job — plan tomorrow’s top 3.",
      "Quick wins": [],
      "Heavy lifts": [],
      "Weekly warning": "",
    }
  }

  const today = dayjs().format("YYYY-MM-DD")
  const weekEnd = dayjs().endOf("week").format("YYYY-MM-DD")
  const pendingByUrgency = [...pendingTasks].sort((a, b) => {
    const urgencyDelta = summaryUrgency(a, today, weekEnd) - summaryUrgency(b, today, weekEnd)
    if (urgencyDelta !== 0) return urgencyDelta
    if ((a.date || "") !== (b.date || "")) return (a.date || "").localeCompare(b.date || "")
    return titleWordCount(b.title) - titleWordCount(a.title)
  })

  const overdueTasks = pendingByUrgency.filter((task) => task.date && task.date < today)
  const dueTodayTasks = pendingByUrgency.filter((task) => task.date === today)
  const dueThisWeekTasks = pendingByUrgency.filter((task) => task.date && task.date <= weekEnd)

  const heavyLiftTasks = pendingByUrgency.filter((task) => isHeavyLift(task.title))
  const quickWinTasks = pendingByUrgency.filter((task) => {
    if (isHeavyLift(task.title)) return false
    return isQuickWin(task.title) || !task.date || task.date <= weekEnd
  })

  const heavyLifts = dedupeSummaryTitles(heavyLiftTasks.length ? heavyLiftTasks : pendingByUrgency, 3)
  const quickWins = dedupeSummaryTitles(quickWinTasks.length ? quickWinTasks : pendingByUrgency, 3)

  let focus = ""
  if (overdueTasks.length) {
    focus = `Clear overdue work: ${overdueTasks[0].title}`
  } else if (heavyLifts.length) {
    focus = `Make progress on ${heavyLifts[0]}`
  } else if (dueTodayTasks.length) {
    focus = `Close today: ${dueTodayTasks[0].title}`
  } else {
    focus = `Build momentum with ${quickWins[0] || pendingByUrgency[0].title}`
  }

  let weeklyWarning = ""
  if (overdueTasks.length >= 3) {
    weeklyWarning = `${overdueTasks.length} tasks are overdue — clear the oldest ones before adding new work.`
  } else if (pendingCount >= 12 && completedPct < 45) {
    weeklyWarning = "Your backlog is getting heavy — narrow this week to one heavy lift and a few quick wins."
  } else if (dueTodayTasks.length >= 5) {
    weeklyWarning = "Today looks packed — cut it down to the top three must-do tasks."
  } else if (dueThisWeekTasks.length >= 8) {
    weeklyWarning = "This week is crowded — protect time for your biggest commitment early."
  }

  return {
    "Completed %": completedPct,
    "Pending items": pendingCount,
    "Suggested focus for today": focus,
    "Quick wins": quickWins,
    "Heavy lifts": heavyLifts,
    "Weekly warning": weeklyWarning,
  }
}
// ✨ Quote Generator
export async function getQuoteFromIdea(idea) {
  const prompt = `
You are a senior AI strategist.

Given the startup idea: "${idea}", generate a high-level project report in JSON format with:
- vision
- stack
- architecture
- features
- timeline
- estimate
- marketInsight
- notes
- nextSteps
Respond ONLY with valid JSON.
  `;
  const content = await chatWithFallback({ messages: [{ role: "user", content: prompt }], temperature: 0.5 });
  return JSON.parse(content);
}

// ✨ General Ask AI
export async function askAI(userPrompt, context = "") {
  const systemMessage = {
    role: "system",
    content: "You are a helpful AI assistant for productivity and planning.",
  };

  const userMessage = {
    role: "user",
    content: context ? `Context: ${context}\nUser Question: ${userPrompt}` : userPrompt,
  };

  return chatWithFallback({ messages: [systemMessage, userMessage], temperature: 0.7 });
}

// ✨ Finalize AI Response
export async function finalizeResponse(draft) {
  const prompt = `
You are an AI editor. Given this draft response:
"${draft}"

Polish it to be concise, professional, and clear.
Return only the improved response.
  `;
  return chatWithFallback({ messages: [{ role: "user", content: prompt }], temperature: 0.4 });
}

export async function splitTasks(input, { maxItems = 6, timezone = "UTC", now = null } = {}) {
  return routeTaskParse({ input, maxItems, timezone, now })
}

// ✨ Extract reminder time from natural language text
export async function extractReminderTime(input, { nowISO, timezone: tzOpt, timeContext = null } = {}) {
  const now = typeof nowISO === 'string' && nowISO ? nowISO : new Date().toISOString()
  const tz = typeof tzOpt === 'string' && tzOpt ? tzOpt : 'UTC'
  const contextBlock = (() => {
    if (!timeContext) return ''
    try { return JSON.stringify(timeContext, null, 2) } catch { return String(timeContext) }
  })()

  const system = {
    role: 'system',
    content: [
      'You convert natural language time expressions into an absolute ISO 8601 UTC timestamp.',
      'Assume all times are in the user\'s local timezone when not explicitly specified.',
      'Always compute the correct calendar date (e.g., for "tomorrow"), using the provided timezone.',
      'Return only JSON.'
    ].join(' ')
  }
  const user = {
    role: 'user',
    content: [
      `Current time (ISO): ${now}`,
      `User timezone (IANA): ${tz}`,
      contextBlock ? `Temporal context:\n${contextBlock}` : '',
      `Text: "${input}"`,
      'Return ONLY valid JSON with exactly this shape:\n{ "reminderTime": "<UTC ISO 8601 with Z>" | null }',
      'Rules:',
      '- If the text has no time reference, return null.',
      '- If time is relative (e.g., in 10 minutes), compute absolute time using the provided current time and timezone.',
      "- Output MUST be a UTC timestamp with 'Z' suffix.",
      '- Do not include explanations.',
    ].filter(Boolean).join('\n\n')
  }

  const content = await chatWithFallback({
    messages: [system, user],
    temperature: 0.1,
  })

  let cleaned = content.trim()
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  if (!cleaned.startsWith('{')) {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) cleaned = match[0]
  }

  // Normalize model output into reliable UTC ISO using the provided timezone when needed
  const normalizeToUtcIso = (val) => {
    try {
      const s = String(val || '')
      if (!s) return null
      const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(s)
      if (hasZone) {
        const d = new Date(s)
        return isNaN(d.getTime()) ? null : d.toISOString()
      }
      // Interpret as local wall time in tz
      const m = s.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/)
      if (m) {
        const date = m[1]
        const hh = m[2]
        const mm = m[3]
        const ss = m[4] || '00'
        return dayjs.tz(`${date} ${hh}:${mm}:${ss}`, tz, true).utc().toISOString()
      }
      return dayjs.tz(s, tz, true).utc().toISOString()
    } catch {
      try { return new Date(val).toISOString() } catch { return null }
    }
  }

  try {
    const parsed = JSON.parse(cleaned)
    const rt = parsed?.reminderTime
    if (!rt) return null
    const iso = normalizeToUtcIso(rt)
    if (iso) {
      try {
        console.log('[TimeFlow] extractReminderTime success', { input, now, tz, candidate: rt, iso })
      } catch {}
      return iso
    }
  } catch {
    // fall through
  }

  // Fallback: try naive ISO-like match
  const m = cleaned.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/)
  if (m) {
    const iso = normalizeToUtcIso(m[0])
    if (iso) {
      try {
        console.log('[TimeFlow] extractReminderTime fallback match', { input, now, tz, candidate: m[0], iso })
      } catch {}
      return iso
    }
  }
  try {
    console.warn('[TimeFlow] extractReminderTime failed to resolve', { input, now, tz, cleaned })
  } catch {}
  return null
}

export async function detectActionSuggestions(
  input,
  { maxItems = 6, timezone: tzOpt = "UTC", nowISO = null } = {},
) {
  const text = String(input || "").trim();
  if (!text) return { suggestions: [] };

  const timezoneName = typeof tzOpt === "string" && tzOpt.trim() ? tzOpt.trim() : "UTC";
  const now = typeof nowISO === "string" && nowISO ? nowISO : new Date().toISOString();

  const system = {
    role: "system",
    content: [
      "You detect actionable commitments inside messy notes, journal entries, and voice transcripts.",
      "Your job is to surface only useful action suggestions, not every noun phrase.",
      "Prioritize deadlines, commitments, promises, follow-ups, and time-based actions.",
      "Return only valid JSON.",
    ].join(" "),
  };

  const schema = `
Return ONLY valid JSON in this format:
[
  {
    "title": "Action title that starts with a verb and stays recognizable later",
    "displayTitle": "Polished user-facing title that keeps essential context",
    "rawPhrase": "Exact snippet from the note",
    "details": "Optional extra context",
    "confidence": 0.0,
    "reason": "Why this is considered actionable",
    "category": "Work|Health|Learning|Personal|Finance|Routine|Other",
    "dueDate": "YYYY-MM-DD" | null,
    "scheduledTime": "YYYY-MM-DDTHH:mm" | null,
    "timeHint": "Timing in the user's words" | null,
    "reasons": ["deadline", "commitment"],
    "missingFields": ["dueDate", "time", "details"]
  }
]`;

  const rules = `
Rules:
- At most ${maxItems} suggestions.
- Include only actionable items.
- Ignore pure reflections, feelings, vague themes, or general life updates unless they imply a concrete action.
- confidence must be a number from 0 to 1.
- Use 0.85 to 0.99 when the action and timing are both clear.
- Use 0.55 to 0.84 when the action is clear but timing or scope is missing.
- Use 0.25 to 0.54 when it may be actionable but is ambiguous.
- Avoid values below 0.2 unless the phrase is barely actionable.
- Titles must be specific, start with a verb, and keep the minimum context needed to recognize the task later.
- If the action depends on a destination, person, class, or deliverable, keep that context in the title instead of reducing it to 2-3 words.
- Prefer titles like "Print slides at college" or "Call John about the budget" over generic titles like "Print slides" or "Call John" when the note contains that context.
- displayTitle should be concise and natural for a suggestion card, but still understandable tomorrow without reopening the source note.
- details should preserve the fuller original intent in plain language when extra context helps execution.
- rawPhrase must be copied exactly from the note when possible.
- dueDate should be used for date-like commitments such as "before July 20" or "next Tuesday".
- If no date is found, set dueDate to null.
- scheduledTime should only be set when the note includes a concrete clock time or precise scheduled moment.
- reason should be a single short sentence explaining why this should be surfaced.
- missingFields should contain any missing pieces among dueDate, time, or details.
- If timing is missing, include "dueDate" and/or "time" inside missingFields.
- Use only these categories: Work, Health, Learning, Personal, Finance, Routine, Other.
- reasons should be short labels such as deadline, promise, urgency, time_based, follow_up, commitment.
- If nothing should be surfaced, return [].
`;

  const user = {
    role: "user",
    content: [
      `Current time (ISO): ${now}`,
      `User timezone (IANA): ${timezoneName}`,
      `User note:\n"""${text}"""`,
      schema,
      rules,
    ].join("\n\n"),
  };

  const content = await chatWithFallback({
    messages: [system, user],
    temperature: 0.1,
  });

  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const match = cleaned.match(/\[[\s\S]*\]/) || cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];
  }

  try {
    const parsed = JSON.parse(cleaned);
    const suggestions = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
    return { suggestions };
  } catch (err) {
    console.error("❌ Failed to parse action suggestions JSON:", cleaned);
    throw err;
  }
}
