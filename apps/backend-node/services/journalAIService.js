import { chatWithFallback } from "./openaiService.js";

const CATEGORY_LIST = ["Reflection", "Gratitude", "Goal", "Stress", "Idea"];
const CATEGORY_EMOJI = {
  Reflection: "🪞",
  Gratitude: "✨",
  Goal: "🎯",
  Stress: "🌧️",
  Idea: "💡",
};

const SENTIMENT_MOODS = {
  uplifting: { label: "Uplifted", emoji: "🌤️", intensity: 0.7 },
  grateful: { label: "Grateful", emoji: "🌼", intensity: 0.6 },
  calm: { label: "Calm", emoji: "🌿", intensity: 0.5 },
  balanced: { label: "Balanced", emoji: "🌀", intensity: 0.45 },
  hopeful: { label: "Hopeful", emoji: "🌅", intensity: 0.65 },
  focused: { label: "Focused", emoji: "🎯", intensity: 0.7 },
  stressed: { label: "Stressed", emoji: "⚡", intensity: 0.8 },
  uncertain: { label: "Uncertain", emoji: "🌧️", intensity: 0.6 },
};

function sanitizeJson(str) {
  if (!str) return "{}";
  return String(str)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function safeParseJson(str) {
  try {
    const cleaned = sanitizeJson(str);
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("[journalAI] Failed to parse JSON", err?.message || err);
    return null;
  }
}

function normalizeCategory(value) {
  const token = String(value || "").trim().toLowerCase();
  const found = CATEGORY_LIST.find((label) => label.toLowerCase() === token);
  return found || "Reflection";
}

function normalizeArray(value, maxItems = 5) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function resolveMood(sentiment) {
  const key = String(sentiment || "").toLowerCase();
  const mood = SENTIMENT_MOODS[key];
  if (mood) return mood;
  return { label: "Centered", emoji: "🪴", intensity: 0.5 };
}

function baseResult(rawText = "") {
  const text = String(rawText || "").trim();
  return {
    cleanedText: text,
    category: "Reflection",
    sentiment: "balanced",
    mood: resolveMood("balanced"),
    tone: { primary: "calm", secondary: "thoughtful", energy: "low" },
    keywords: [],
    summary: "",
    takeaway: "",
    action: "",
    categoryEmoji: CATEGORY_EMOJI.Reflection,
  };
}

export async function analyzeJournalText(rawText) {
  if (!rawText || !rawText.trim()) {
    return baseResult(rawText);
  }

  const fallback = baseResult(rawText);
  const prompt = `
You are an empathetic journaling analyst. Clean up this raw voice transcription and classify the entry.

Return ONLY valid JSON with the following shape:
{
  "cleaned_text": "<polished text with punctuation>",
  "category": "Reflection | Gratitude | Goal | Stress | Idea",
  "sentiment": "uplifting | grateful | calm | balanced | hopeful | focused | stressed | uncertain",
  "tone": {
    "primary": "<one word tone>",
    "secondary": "<supporting tone>",
    "energy": "low | medium | high"
  },
  "keywords": ["<short keyword>", "..."],
  "summary": "<one sentence recap describing the entry>",
  "takeaway": "<gentle encouragement or insight>",
  "action": "<optional micro action>"
}

Input:
"""
${rawText}
"""
`;

  try {
    const content = await chatWithFallback({
      messages: [
        { role: "system", content: "You polish journaling reflections into calm, concise summaries." },
        { role: "user", content: prompt },
      ],
      temperature: 0.35,
      modelList: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-3.5-turbo"],
    });

    const parsed = safeParseJson(content);
    if (!parsed) return fallback;

    const cleanedText = String(parsed.cleaned_text || parsed.text || rawText).trim();
    const category = normalizeCategory(parsed.category);
    const sentiment = String(parsed.sentiment || "balanced").toLowerCase();
    const tone = {
      primary: (parsed.tone?.primary || parsed.tone_primary || "calm").toLowerCase(),
      secondary: (parsed.tone?.secondary || parsed.tone_secondary || "reflective").toLowerCase(),
      energy: (parsed.tone?.energy || parsed.energy || "low").toLowerCase(),
    };

    const result = {
      cleanedText: cleanedText || fallback.cleanedText,
      category,
      sentiment,
      mood: resolveMood(sentiment),
      tone,
      keywords: normalizeArray(parsed.keywords),
      summary: String(parsed.summary || "").trim(),
      takeaway: String(parsed.takeaway || "").trim(),
      action: String(parsed.action || "").trim(),
      categoryEmoji: CATEGORY_EMOJI[category] || CATEGORY_EMOJI.Reflection,
    };

    return result;
  } catch (err) {
    console.warn("[journalAI] analyzeJournalText failed", err?.message || err);
    return fallback;
  }
}

export function deriveMoodFromSentiment(sentiment) {
  return resolveMood(sentiment);
}

export { CATEGORY_LIST, CATEGORY_EMOJI };
