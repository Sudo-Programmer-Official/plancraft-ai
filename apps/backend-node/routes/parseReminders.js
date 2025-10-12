import express from "express"
import OpenAI from "openai"
import { requireAuth } from "../middleware/auth.js"

const router = express.Router()
router.use(requireAuth)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// POST /api/parse-reminders
// Body: { transcript: string, userId?: string }
// Returns: Array<{ task: string, time: string }>
router.post("/parse-reminders", async (req, res) => {
  try {
    const { transcript } = req.body || {}
    const text = String(transcript || "").trim()
    if (!text) return res.status(400).json({ error: "Missing transcript" })

    const sys = [
      "Extract all reminders from the user's text.",
      "Return a JSON object with an array under key 'reminders'.",
      "Each item: { task: string, time: ISO8601 string }.",
      "If time is ambiguous, estimate sensibly (e.g., next occurrence).",
    ].join(" ")

    const gpt = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    })

    const content = gpt?.choices?.[0]?.message?.content || "{}"
    let parsed
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      console.warn("[parse-reminders] JSON parse failed; content:", content)
      parsed = { reminders: [] }
    }
    const reminders = Array.isArray(parsed?.reminders) ? parsed.reminders : []
    return res.json(reminders)
  } catch (e) {
    console.error("[parse-reminders] Failed", e)
    return res.status(500).json({ error: e?.message || "Server error" })
  }
})

export default router
