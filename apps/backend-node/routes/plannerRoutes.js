import express from "express"
import { requireAuth, ensureUserMatches } from "../middleware/auth.js"
import { chatWithFallback } from "../services/openaiService.js"
import {
  buildUserContext,
  extractActionsFromText,
  executePlannerActions,
  detectIntentFromMessage,
  buildFallbackActionsFromIntent,
} from "../services/plannerAssistantService.js"

const router = express.Router()

router.use(requireAuth, ensureUserMatches)

router.post("/query", async (req, res) => {
  try {
    const { userId, query, history = [] } = req.body || {}
    if (!userId || !query) {
      return res.status(400).json({ error: "Missing userId or query" })
    }

    let context = await buildUserContext(userId)
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

- Reference the provided context when sharing insights or recommendations.
- When you need to perform an action, append a single JSON block wrapped in triple backticks.
- Supported action types:
  • create_task: { "title": string, "date": "YYYY-MM-DD", "details"?: string, "category"?: string, "reminderTime"?: "HH:mm" }
  • update_task: { "taskId": string, "title"?: string, "date"?: "YYYY-MM-DD", "reminderTime"?: "HH:mm", "completed"?: boolean }
  • complete_task: { "taskId": string }
  • schedule_reminder: { "text": string, "scheduledTime": ISO-8601 UTC, "timezone"?: string, "channels"?: [] }
  • get_tasks: { "status"?: "open" | "completed" | "all", "date"?: "YYYY-MM-DD", "limit"?: number }
  • get_reminders: { "status"?: "scheduled" | "sent", "limit"?: number }
\`\`\`json
{"actions":[{"type":"create_task","payload":{"title":"Review invoices","date":"2025-01-15"}}]}
\`\`\`
- Only include the JSON block when an action is required and rely on IDs from context whenever possible.
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
    const intent = detectIntentFromMessage(query)
    let actionQueue = Array.isArray(actions) ? actions.slice(0) : []
    if (!actionQueue.length && intent) {
      actionQueue = buildFallbackActionsFromIntent(intent, query, context)
    }
    const executedActions = await executePlannerActions(userId, actionQueue, context)

    const actionSummaries = executedActions
      .filter((item) => item?.message && item.status !== "ignored")
      .map((item) => item.message)
    const replyText =
      actionSummaries.length && !text
        ? actionSummaries.join("\n")
        : [text || rawReply || "", actionSummaries.join("\n")].filter(Boolean).join("\n\n")

    const shouldRefreshContext = executedActions.some(
      (item) =>
        item.status === "completed" &&
        ["create_task", "update_task", "complete_task", "schedule_reminder"].includes(
          String(item.type || "").toLowerCase(),
        ),
    )
    if (shouldRefreshContext) {
      try {
        context = await buildUserContext(userId)
      } catch (err) {
        console.warn("[PlannerRoutes] context refresh failed", err?.message || err)
      }
    }

    return res.json({
      reply: replyText.trim(),
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
