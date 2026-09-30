import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

const CATEGORY_LIST = ["Work", "Health", "Learning", "Personal", "Finance", "Routine", "Other"]
const DEFAULT_MODEL = process.env.OPENAI_CATEGORY_MODEL || "gpt-4o-mini"

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const LOCAL_CATEGORY_RULES = [
  ["Health", /\b(?:dentist|doctor|clinic|health|medicine|medication|gym|workout|run|exercise)\b/i],
  ["Finance", /\b(?:bank|bill|budget|tax|pay|payment|invoice|expense|finance)\b/i],
  ["Learning", /\b(?:learn|study|course|class|lecture|read|research|practice|exam)\b/i],
  ["Work", /\b(?:work|project|meeting|client|interview|job|office|aws|deploy|code|email|report)\b/i],
  ["Routine", /\b(?:clean|cook|laundry|shop|groceries|sleep|morning|shower|home)\b/i],
  ["Personal", /\b(?:family|friend|birthday|旅行|travel|appointment|call mom|call dad)\b/i],
]

function inferLocalCategory(title, details = "") {
  const text = `${title} ${details}`
  return LOCAL_CATEGORY_RULES.find(([, pattern]) => pattern.test(text))?.[0] || "Other"
}

/**
 * Infer a high-level category for a task using OpenAI.
 * Falls back to "Other" on any failure or unexpected response.
 */
export async function inferCategory(title, details = "") {
  const safeTitle = typeof title === "string" ? title.trim() : ""
  const safeDetails = typeof details === "string" ? details.trim() : ""

  if (!safeTitle) return "Other"

  const localCategory = inferLocalCategory(safeTitle, safeDetails)
  if (localCategory !== "Other" || process.env.ENABLE_AI_CATEGORY_FALLBACK !== "1") {
    return localCategory
  }

  const prompt = [
    `Classify the following task into one of these categories: ${CATEGORY_LIST.join(", ")}.`,
    `Task: "${safeTitle}"`,
  ]
  if (safeDetails) prompt.push(`Details: "${safeDetails}"`)
  prompt.push("Return only the category name.")

  try {
    if (!openai) return "Other"
    const startedAt = Date.now()
    const res = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt.join("\n") }],
      temperature: 0.1,
      max_tokens: 8,
    })
    const elapsed = Date.now() - startedAt
    const category = res?.choices?.[0]?.message?.content?.trim()
    const normalized = CATEGORY_LIST.includes(category) ? category : "Other"
    try {
      // eslint-disable-next-line no-console
      console.log("[TimeBrain][Category] inferCategory", {
        category: normalized,
        model: DEFAULT_MODEL,
        ms: elapsed,
        reason: category === normalized ? "match" : "fallback-other",
      })
    } catch {}
    return normalized
  } catch (err) {
    try {
      // eslint-disable-next-line no-console
      console.warn("[TimeBrain][Category] inferCategory:error", {
        message: err?.message || err,
      })
    } catch {}
    return "Other"
  }
}

export function getSupportedCategories() {
  return [...CATEGORY_LIST]
}
