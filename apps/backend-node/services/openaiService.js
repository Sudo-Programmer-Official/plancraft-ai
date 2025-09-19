// services/openaiService.js
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✨ Journal Enhancer
export async function enhanceJournalEntry(rawText) {
  const prompt = `
You are a mindful writing assistant. Take the following raw journal entry:
"${rawText}"

Enhance it into a clearer, empathetic reflection without losing the user's intent.
Return only the improved text.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // upgrade from gpt-3.5
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

// ✨ Task Summarizer
export async function summarizeTasks(tasks) {
  const prompt = `
You are an AI productivity coach. Given these tasks:
${JSON.stringify(tasks, null, 2)}

Summarize progress with:
- Completed %
- Pending items
- Suggested focus for today
Return valid JSON only.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse(response.choices[0].message.content);
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

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
  });

  return JSON.parse(response.choices[0].message.content);
}

// ✨ General Ask AI
export async function askAI(userPrompt, context = "") {
  const systemMessage = {
    role: "system",
    content: "You are a helpful AI assistant for productivity and planning.",
  };

  const userMessage = {
    role: "user",
    content: context
      ? `Context: ${context}\nUser Question: ${userPrompt}`
      : userPrompt,
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [systemMessage, userMessage],
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

// ✨ Finalize AI Response
export async function finalizeResponse(draft) {
  const prompt = `
You are an AI editor. Given this draft response:
"${draft}"

Polish it to be concise, professional, and clear.
Return only the improved response.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  return response.choices[0].message.content.trim();
}