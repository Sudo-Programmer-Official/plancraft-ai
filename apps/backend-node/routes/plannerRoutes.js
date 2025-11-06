import express from "express"
import { requireAuth, ensureUserMatches } from "../middleware/auth.js"
import { chatWithFallback } from "../services/openaiService.js"
import {
  buildUserContext,
  extractActionsFromText,
  executePlannerActions,
} from "../services/plannerAssistantService.js"

const router = express.Router()

router.use(requireAuth, ensureUserMatches)

router.post("/query", async (req, res) => {
  try {
    const { userId, query, history = [] } = req.body || {}
    if (!userId || !query) {
      return res.status(400).json({ error: "Missing userId or query" })
    }

    const context = await buildUserContext(userId)
    const historyMessages = Array.isArray(history)
      ? history
          .slice(-10)
          .map((item) => ({
            role: item?.role === "assistant" ? "assistant" : "user",
            content: String(item?.content || "").slice(0, 2000),
          }))
      : []

    const systemPrompt = `
You are PlanCraftAI, the user's trusted planner assistant. Always be precise, concise, and proactive.

- Provide helpful explanations referencing tasks, reminders, reports, and context.
- Suggest next steps when relevant and surface key stats or insights.
- When you need to perform an action (create a task, schedule a reminder, etc.), append a JSON block wrapped in triple backticks using the format:
\`\`\`json
{"actions":[{"type":"create_task","payload":{"title":"Review invoices","date":"2025-01-15"}}]}
\`\`\`
- Supported action types: "create_task" and "schedule_reminder". Keep payloads minimal and include ISO timestamps or YYYY-MM-DD dates.
- Only include actions when confident; the system executes them automatically.
`

    const contextString = JSON.stringify(context, null, 2).slice(0, 12000)

    const messages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: String(query) },
      {
        role: "assistant",
        content: `Context snapshot for user:\n${contextString}`,
      },
    ]

    const rawReply = await chatWithFallback({
      messages,
      temperature: 0.3,
    })

    const { text, actions } = extractActionsFromText(rawReply)
    const executedActions = await executePlannerActions(userId, actions)

    return res.json({
      reply: text || rawReply,
      actions: executedActions,
      contextSummary: {
        totalTasks: context.summary.totalTasks,
        completedTasks: context.summary.completedTasks,
        categoryTotals: context.summary.categoryTotals,
      },
    })
  } catch (err) {
    console.error("[PlannerRoutes] query failed", err?.message || err)
    return res.status(500).json({ error: "Planner assistant is unavailable right now." })
  }
})

export default router
