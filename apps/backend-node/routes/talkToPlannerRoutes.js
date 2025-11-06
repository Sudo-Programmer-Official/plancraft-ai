import express from "express";
import { requireAuth, ensureUserMatches } from "../middleware/auth.js";
import { chatWithFallback } from "../services/openaiService.js";
import {
  buildUserContext,
  extractActionsFromText,
  executePlannerActions,
  detectIntentFromMessage,
} from "../services/plannerAssistantService.js";

const router = express.Router();

router.use(requireAuth, ensureUserMatches);

router.post("/chat", async (req, res) => {
  try {
    const { message, userId, history = [] } = req.body || {};
    if (!userId || !message) {
      return res.status(400).json({ error: "Missing message or userId" });
    }

    const [context, historyMessages] = await Promise.all([
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

    const systemPrompt = `
You are PlanCraftAI's Planner Assistant.
You have access to a user's tasks, reminders, journal notes, and reports.
Understand the intent, respond concisely, and when appropriate suggest next steps.
When an actionable request is detected, append a JSON block in triple backticks describing the action.
JSON schema:
\`\`\`json
{"actions":[{"type":"create_task","payload":{"title":"Call client","date":"2025-02-15"}}]}
\`\`\`
Supported types: create_task, schedule_reminder.
Keep payloads minimal and include ISO timestamps or YYYY-MM-DD dates.
If unsure, respond conversationally and ask clarifying questions.
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
    const executedActions = await executePlannerActions(userId, actions);
    const primaryAction =
      executedActions.find((a) => a.status === "completed") || executedActions[0] || null;

    const intent = detectIntentFromMessage(message);
    const completed = executedActions.some((item) => item.status === "completed");
    if (completed) {
      const summary = intent || primaryAction?.type || "unknown";
      console.log(`[PlannerBridge] Action executed: ${summary} | Notifications triggered`);
    }

    return res.json({
      aiMessage: text || rawReply,
      reply: text || rawReply,
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
