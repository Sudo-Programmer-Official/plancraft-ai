// services/openaiService.js
import OpenAI from "openai";
import dotenv from "dotenv";
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
dayjs.extend(utc)
dayjs.extend(timezone)

// Centralized helper with model fallbacks and friendlier errors
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
const FALLBACK_MODELS = (
  process.env.OPENAI_MODEL_FALLBACKS?.split(",") || [
    // Ordered by preference; edit via env if needed
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-16k",
    "gpt-4.1-mini",
    "gpt-4.1",
  ]
).map((s) => s.trim()).filter(Boolean);

export async function chatWithFallback({ messages, temperature = 0.7, modelList }) {
  const models = modelList && modelList.length ? modelList : [DEFAULT_MODEL, ...FALLBACK_MODELS];
  let lastErr;
  for (const model of models) {
    try {
      const res = await openai.chat.completions.create({ model, messages, temperature });
      return res.choices[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      lastErr = err;
      const code = err?.code || err?.error?.code;
      const status = err?.status;
      const msg = err?.error?.message || err?.message || "";
      const isModelAccessError =
        code === "model_not_found" ||
        status === 403 ||
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

export async function summarizeTasks(tasks) {
  if (!tasks || !tasks.length) {
    return {
      "Completed %": 0,
      "Pending items": 0,
      "Suggested focus for today": "No tasks found",
      "Quick wins": [],
      "Heavy lifts": [],
      "Weekly warning": ""
    }
  }

  // 🔹 Compact tasks to avoid huge prompts (drop large fields; truncate)
  const MAX_TITLE = 160
  const MAX_DETAILS = 240
  const compact = (t) => ({
    title: String(t.title || "").slice(0, MAX_TITLE),
    details: String(t.details || "").slice(0, MAX_DETAILS),
    completed: !!t.completed,
    date: t.date || undefined,
  })

  const compacted = tasks.map(compact)

  // 🔹 Compute simple metrics locally (no need to query LLM)
  const total = compacted.length
  const completedCount = compacted.filter((t) => t.completed).length
  const pendingCount = total - completedCount
  const completedPct = total ? Math.round((completedCount / total) * 100) : 0

  // 🔹 Prepare only pending tasks for focus suggestions
  const pendingTasks = compacted.filter((t) => !t.completed)
  // Further reduce payload to only essentials: a short string per task
  const modelItems = pendingTasks.map((t) => {
    const title = t.title || ""
    const details = t.details || ""
    const combined = details ? `${title} — ${details}` : title
    // Keep strings compact; downstream prompt expects short strings
    return combined.slice(0, 280)
  })

  // 🔹 Chunk by character budget instead of count
  const BUDGET = Number(process.env.SUMMARY_PROMPT_CHAR_BUDGET || 9000) // chars
  const serialize = (arr) => JSON.stringify(arr) // compact (no pretty print)
  const chunks = []
  let current = []
  let currentLen = 2 // for surrounding []
  for (const item of modelItems) {
    const itemStr = (current.length ? "," : "") + JSON.stringify(item)
    if (currentLen + itemStr.length > BUDGET && current.length) {
      chunks.push(current)
      current = [item]
      currentLen = 2 + JSON.stringify(item).length
    } else {
      current.push(item)
      currentLen += itemStr.length
    }
  }
  if (current.length) chunks.push(current)

  // Fallback if no pending tasks; still return stats
  if (!chunks.length) {
    return {
      "Completed %": completedPct,
      "Pending items": pendingCount,
      "Suggested focus for today": completedPct === 100 ? "Great job — plan tomorrow’s top 3." : "Pick one high-impact task and 2 quick wins.",
      "Quick wins": [],
      "Heavy lifts": [],
      "Weekly warning": "",
    }
  }

  // 🔹 Summarize each chunk safely with automatic backoff if still too large
  async function summarizeChunkSafe(list) {
    let slice = list
    while (slice.length) {
      const prompt = `You are an AI productivity coach. From the following pending tasks, provide a concise suggestion.\n\nTasks (JSON array of short strings):\n${serialize(slice)}\n\nReturn ONLY valid JSON:\n{\n  "Suggested focus": "<string>",\n  "Quick wins": ["<string>", "<string>"],\n  "Heavy lifts": ["<string>", "<string>"]\n}`
      try {
        const res = await chatWithFallback({
          modelList: ["gpt-3.5-turbo", "gpt-4.1-mini"],
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        })
        const cleaned = res.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
        return JSON.parse(cleaned)
      } catch (err) {
        const msg = err?.error?.message || err?.message || ""
        const code = err?.code || err?.error?.code
        const tooLong = /context length|maximum context length|too many tokens/i.test(msg)
        if (tooLong || code === "context_length_exceeded") {
          // Reduce slice size and try again
          if (slice.length <= 5) throw err
          slice = slice.slice(0, Math.ceil(slice.length / 2))
          continue
        }
        throw err
      }
    }
    // Should not reach here
    return { "Suggested focus": "", "Quick wins": [], "Heavy lifts": [] }
  }

  const partials = []
  for (const c of chunks) {
    try {
      const part = await summarizeChunkSafe(c)
      partials.push(part)
    } catch (e) {
      console.warn("⚠️ Failed to summarize a chunk:", e?.message || e)
    }
  }

  // 🔹 Merge partials into final using the model (keep payload small)
  const MERGE_MAX_PARTS = Number(process.env.SUMMARY_MERGE_MAX_PARTS || 24)
  const MERGE_BUDGET = Number(process.env.SUMMARY_MERGE_CHAR_BUDGET || 6000)

  const compactPart = (p) => ({
    "Suggested focus": String(p["Suggested focus"] || "").slice(0, 200),
    "Quick wins": (p["Quick wins"] || []).map((s) => String(s).slice(0, 120)).slice(0, 3),
    "Heavy lifts": (p["Heavy lifts"] || []).map((s) => String(s).slice(0, 120)).slice(0, 3),
  })

  let selected = partials.slice(0, MERGE_MAX_PARTS).map(compactPart)
  let mergePayloadObj = { stats: { total, completedCount, pendingCount, completedPct }, parts: selected }
  let mergePayload = JSON.stringify(mergePayloadObj)
  while (mergePayload.length > MERGE_BUDGET && selected.length > 1) {
    // Trim parts until under budget
    selected = selected.slice(0, Math.ceil(selected.length / 2))
    mergePayloadObj = { stats: mergePayloadObj.stats, parts: selected }
    mergePayload = JSON.stringify(mergePayloadObj)
  }

  // If still over budget or no parts, fallback locally
  if (!selected.length || mergePayload.length > MERGE_BUDGET) {
    return {
      "Completed %": completedPct,
      "Pending items": pendingCount,
      "Suggested focus for today": pendingCount ? "Pick one high-impact task and 2 quick wins." : "Great job — plan tomorrow’s top 3.",
      "Quick wins": partials.flatMap(p => p["Quick wins"] || []).slice(0, 3),
      "Heavy lifts": partials.flatMap(p => p["Heavy lifts"] || []).slice(0, 3),
      "Weekly warning": "",
    }
  }

  const mergePrompt = `You are an AI productivity coach. Merge these partial suggestions and stats into a single concise dashboard.\n\nData (JSON):\n${mergePayload}\n\nReturn ONLY valid JSON with fields:\n{\n  "Completed %": <number>,\n  "Pending items": <number>,\n  "Suggested focus for today": "<string>",\n  "Quick wins": ["<string>", "<string>"],\n  "Heavy lifts": ["<string>", "<string>"],\n  "Weekly warning": "<string>"\n}`

  try {
    const final = await chatWithFallback({
      modelList: ["gpt-3.5-turbo", "gpt-4.1-mini"],
      messages: [{ role: "user", content: mergePrompt }],
      temperature: 0.3,
    })
    const cleaned = final.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
    const parsed = JSON.parse(cleaned)
    parsed["Completed %"] = Number(parsed["Completed %"]) || completedPct
    parsed["Pending items"] = Number(parsed["Pending items"]) || pendingCount
    return parsed
  } catch (e) {
    const msg = e?.error?.message || e?.message || ""
    const tooLong = /context length|maximum context length|too many tokens/i.test(msg)
    if (tooLong) {
      // Final local fallback if merge still too long
      return {
        "Completed %": completedPct,
        "Pending items": pendingCount,
        "Suggested focus for today": pendingCount ? "Pick one high-impact task and 2 quick wins." : "Great job — plan tomorrow’s top 3.",
        "Quick wins": partials.flatMap(p => p["Quick wins"] || []).slice(0, 3),
        "Heavy lifts": partials.flatMap(p => p["Heavy lifts"] || []).slice(0, 3),
        "Weekly warning": "",
      }
    }
    console.warn("⚠️ Merge step failed, falling back to local stats:", e?.message || e)
    return {
      "Completed %": completedPct,
      "Pending items": pendingCount,
      "Suggested focus for today": pendingCount ? "Pick one high-impact task and 2 quick wins." : "Great job — plan tomorrow’s top 3.",
      "Quick wins": partials.flatMap(p => p["Quick wins"] || []).slice(0, 3),
      "Heavy lifts": partials.flatMap(p => p["Heavy lifts"] || []).slice(0, 3),
      "Weekly warning": "",
    }
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

export async function splitTasks(input, { maxItems = 6, context = "", timezone = "UTC", currentTime = new Date().toISOString() } = {}) {
  const system = {
    role: "system",
    content: [
      "You are a productivity coach that understands temporal relationships between tasks.",
      "Convert free-form notes into structured tasks with timing information.",
      "Pay attention to sequence words, time references, and parallel task indicators.",
      `Current time: ${currentTime}`,
      `User timezone: ${timezone}`,
      "Extract both explicit times and implicit task relationships."
    ].join("\n")
  };

  const schema = `
Return ONLY valid JSON in this format:
{
  "tasks": [
    {
      "title": "Action verb + clear outcome (max 8 words)",
      "details": "Specifics or success criteria",
      "estimate_minutes": 15,
      "energy": "low|medium|high",
      "context": "home|work|computer|phone|errand|meeting|deep-work|planning",
      "priority": 1,
      "time": {
        "type": "absolute|relative",
        "value": "ISO string for absolute, or relative reference like 'after_task_1', 'with_task_2'",
        "delay_minutes": 0
      }
    }
  ],
  "timeRelations": [
    {
      "taskId": 1,
      "followsTaskId": null,
      "parallelWithTaskId": null,
      "minimumGapMinutes": 15
    }
  ]
}`;

  const rules = `
Rules:
- At most ${maxItems} tasks.
- Each task must start with a verb (e.g., Write, Review, Prepare, Go).
- Extract explicit time references into absolute timestamps.
- Infer relative timing between tasks (e.g., "then", "after that").
- Detect parallel tasks (e.g., "while", "during", "as").
- Each task should be atomic, completable in 10–30 minutes.
- Add minimum gaps between sequential tasks (default 15 minutes).
- For tasks without explicit times, distribute evenly across next 4 hours.
- Do not include duplicates or vague filler sentences.
`;

  const user = {
    role: "user",
    content: `${context ? `Context: ${context}\n` : ""}User notes:\n"""${input}"""\n\n${schema}\n${rules}`,
  };

  const content = await chatWithFallback({
    messages: [system, user],
    temperature: 0.2,
  });

  // 🔹 Sanitize output before parsing
  let cleaned = content.trim();

  // Strip ```json ... ``` fences if present
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

  // Extra fallback: if multiple JSON objects exist, extract the first {...}
  if (!cleaned.startsWith("{")) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      cleaned = match[0];
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("❌ Failed to parse AI JSON:", cleaned);
    throw err;
  }

  // Validate and adjust task times
  if (parsed?.tasks?.length) {
    const { autoAdjustTimes, validateTimeRelations } = await import('../utils/timeSequencer.js');
    
    // Validate temporal relationships
    const validation = validateTimeRelations(parsed.tasks, parsed.timeRelations || []);
    if (!validation.isValid) {
      console.warn("⚠️ Invalid time relations detected:", validation.errors);
      // Remove invalid relations but continue processing
      parsed.timeRelations = [];
    }
    
    // Adjust task times based on relationships
    try {
      parsed.tasks = autoAdjustTimes({
        tasks: parsed.tasks,
        timeRelations: parsed.timeRelations || [],
        startTime: currentTime,
        timezone,
      });
    } catch (e) {
      console.error("❌ Failed to adjust task times:", e);
      // Preserve original tasks but log error
    }
  }

  return parsed;
}

// ✨ Extract reminder time from natural language text
export async function extractReminderTime(input, { nowISO, timezone: tzOpt } = {}) {
  const now = typeof nowISO === 'string' && nowISO ? nowISO : new Date().toISOString()
  const tz = typeof tzOpt === 'string' && tzOpt ? tzOpt : 'UTC'

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
    content: `Current time (ISO): ${now}\nUser timezone (IANA): ${tz}\n\nText: "${input}"\n\nReturn ONLY valid JSON with exactly this shape:\n{ "reminderTime": "<UTC ISO 8601 with Z>" | null }\n\nRules:\n- If the text has no time reference, return null.\n- If time is relative (e.g., in 10 minutes), compute absolute time using the provided current time and timezone.\n- Output MUST be a UTC timestamp with 'Z' suffix.\n- Do not include explanations.`
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
    if (iso) return iso
  } catch {
    // fall through
  }

  // Fallback: try naive ISO-like match
  const m = cleaned.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/)
  if (m) {
    const iso = normalizeToUtcIso(m[0])
    if (iso) return iso
  }
  return null
}
