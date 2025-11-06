import express from "express";
import { requireAuth, ensureUserMatches } from "../middleware/auth.js";
import { chatWithFallback } from "../services/openaiService.js";
import {
  buildUserContext,
  extractActionsFromText,
  executePlannerActions,
  detectIntentFromMessage,
  buildFallbackActionsFromIntent,
} from "../services/plannerAssistantService.js";

const router = express.Router();

router.use(requireAuth, ensureUserMatches);

router.post("/chat", async (req, res) => {
  try {
    const { message, userId, history = [] } = req.body || {};
    if (!userId || !message) {
      return res.status(400).json({ error: "Missing message or userId" });
    }

    const [initialContext, historyMessages] = await Promise.all([
      buildUserContext(userId),
      Promise.resolve(
        Array.isArray(history)
          ? history.slice(-10).map((item) => ({
              role: item?.role === "assistant" ? "assistant" : "user",
              content: String(item?.content || item?.text || "").slice(0, 2000),
            }))
          : []
      ),
    ]);

    let context = initialContext;

    const systemPrompt = `
You are PlanCraftAI's Planner Assistant.
You have access to a user's tasks, reminders, journal notes, and reports.
Understand the intent, respond concisely, and when appropriate suggest next steps.
When an actionable request is detected, add a single JSON block in triple backticks describing the actions to run.
Supported action types and payload hints:
- create_task: { "title": string, "date": "YYYY-MM-DD", "details"?: string, "category"?: string, "reminderTime"?: "HH:mm", "channels"?: [] }
- update_task: { "taskId": string, "title"?: string, "date"?: "YYYY-MM-DD", "reminderTime"?: "HH:mm", "completed"?: boolean }
- complete_task: { "taskId": string }
- schedule_reminder: { "text": string, "scheduledTime": ISO-8601 UTC, "timezone"?: string, "channels"?: [] }
- get_tasks: { "status"?: "open" | "completed" | "all", "date"?: "YYYY-MM-DD", "limit"?: number }
- get_reminders: { "status"?: "scheduled" | "sent", "limit"?: number }
Example JSON:
\`\`\`json
{"actions":[{"type":"create_task","payload":{"title":"Call client","date":"2025-02-15"}}]}
\`\`\`
Only include the JSON block when an action is required. Use IDs from the context when referring to tasks or reminders, prefer concise replies, and ask follow-up questions when details are missing.
    `.trim();

    const contextSummary = {
      profile: {
        name: context.profile.name,
        plan: context.profile.plan,
        timezone: context.profile.timezone,
      },
      metrics: context.summary,
      recentTasks: context.tasks.slice(0, 6),
      reminders: context.reminders.slice(0, 6),
      documents: context.profile.secureDocs || [],
      notes: context.notes?.slice ? context.notes.slice(0, 4) : [],
    };

    const messages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: String(message) },
      {
        role: "assistant",
        content: `Context snapshot:\n${JSON.stringify(contextSummary).slice(0, 12000)}`,
      },
    ];

    const rawReply = await chatWithFallback({
      messages,
      temperature: 0.3,
    });

    const { text, actions } = extractActionsFromText(rawReply);
    const intent = detectIntentFromMessage(message);
    let actionQueue = Array.isArray(actions) ? actions.slice(0) : [];
    if (!actionQueue.length && intent) {
      actionQueue = buildFallbackActionsFromIntent(intent, message, context);
    }
    const executedActions = await executePlannerActions(userId, actionQueue, context);
    const primaryAction =
      executedActions.find((a) => a.status === "completed") || executedActions[0] || null;

    const actionSummaries = executedActions
      .filter((item) => item?.message && item.status !== "ignored")
      .map((item) => item.message);
    let replyText = text || rawReply || "";
    if (actionSummaries.length) {
      replyText = replyText
        ? `${replyText.trim()}\n\n${actionSummaries.join("\n")}`
        : actionSummaries.join("\n");
    }

    const shouldRefreshContext = executedActions.some(
      (item) =>
        item.status === "completed" &&
        ["create_task", "update_task", "complete_task", "schedule_reminder"].includes(
          String(item.type || "").toLowerCase(),
        ),
    );

    if (shouldRefreshContext) {
      try {
        context = await buildUserContext(userId);
      } catch (err) {
        console.warn("[TalkToPlanner] context refresh failed", err?.message || err);
      }
    }

    if (executedActions.some((item) => item.status === "completed")) {
      const summary = intent || primaryAction?.type || "unknown";
      console.log(`[PlannerBridge] Action executed: ${summary} | Notifications triggered`);
    }

    return res.json({
      aiMessage: replyText,
      reply: replyText,
      intent: intent || primaryAction?.type || null,
      action: primaryAction?.type || intent || null,
      data: primaryAction || null,
      actions: executedActions,
      context: {
        summary: context.summary,
        tasks: context.tasks.slice(0, 8),
        reminders: context.reminders.slice(0, 8),
        documents: context.profile.secureDocs || [],
        reports: context.reports.slice(0, 4),
      },
      contextSummary: {
        totalTasks: context.summary.totalTasks,
        completedTasks: context.summary.completedTasks,
        categoryTotals: context.summary.categoryTotals,
      },
    });
  } catch (err) {
    console.error("[TalkToPlanner] chat failed", err?.message || err);
    return res.status(500).json({ error: "Failed to process planner message." });
  }
});

export default router;
