// services/openaiService.js
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Centralized helper with model fallbacks and friendlier errors
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
const FALLBACK_MODELS = (
  process.env.OPENAI_MODEL_FALLBACKS?.split(",") || [
    // Ordered by preference; edit via env if needed
    "gpt-3.5-turbo",
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
export async function summarizeTasks(tasks) {
  const prompt = `
You are an assistant analyzing a task list. 
Return a JSON object with:

{
  "Completed %": <number>,
  "Pending items": <number>,
  "Suggested focus for today": "<string>",
  "Quick wins": [ "<string>", "<string>" ],
  "Heavy lifts": [ "<string>", "<string>" ],
  "Weekly warning": "<string>"
}

Tasks:
${JSON.stringify(tasks, null, 2)}
`

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  })

  return JSON.parse(response.choices[0].message.content)
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
