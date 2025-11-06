import express from "express"
import dayjs from "dayjs"
import { requireAuth, ensureUserMatches } from "../middleware/auth.js"
import { db } from "../services/firebaseAdmin.js"
import { chatWithFallback } from "../services/openaiService.js"
import { handleTextReminder } from "../services/textHandler.js"

const router = express.Router()

router.use(requireAuth, ensureUserMatches)

function toYMD(value) {
  try {
    if (!value) return dayjs().format("YYYY-MM-DD")
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return value.trim()
    }
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return dayjs(date).format("YYYY-MM-DD")
    }
  } catch {}
  return dayjs().format("YYYY-MM-DD")
}

function asIso(value) {
  try {
    if (!value) return null
    const date = value.toDate ? value.toDate() : new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString()
  } catch {
    return null
  }
}

async function fetchRecentTasks(uid, limit = 14) {
  const tasks = []
  try {
    const snap = await db
      .collection("tasks")
      .where("userId", "==", String(uid))
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get()

    snap.forEach((doc) => {
      const data = doc.data() || {}
      tasks.push({
        id: doc.id,
        title: data.title || "",
        date: data.date || null,
        completed: !!data.completed,
        category: data.category || "Uncategorized",
        reminderTime: data.reminderTime || null,
        priority: data.priority || null,
        updatedAt: asIso(data.updatedAt) || asIso(data.createdAt),
      })
    })
    return tasks
  } catch (err) {
    console.warn("[PlannerRoutes] fetchRecentTasks primary query failed", err?.message || err)
  }

  try {
    const snap = await db
      .collection("tasks")
      .where("userId", "==", String(uid))
      .limit(limit)
      .get()
    snap.forEach((doc) => {
      const data = doc.data() || {}
      tasks.push({
        id: doc.id,
        title: data.title || "",
        date: data.date || null,
        completed: !!data.completed,
        category: data.category || "Uncategorized",
        reminderTime: data.reminderTime || null,
        priority: data.priority || null,
        updatedAt: asIso(data.updatedAt) || asIso(data.createdAt),
      })
    })
    tasks.sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return bTime - aTime
    })
  } catch (err) {
    console.warn("[PlannerRoutes] fetchRecentTasks fallback failed", err?.message || err)
  }
  return tasks.slice(0, limit)
}

async function fetchUpcomingReminders(uid, limit = 10) {
  try {
    const snap = await db
      .collection("reminders")
      .where("userId", "==", String(uid))
      .orderBy("scheduledTime", "asc")
      .limit(limit)
      .get()

    const reminders = []
    snap.forEach((doc) => {
      const data = doc.data() || {}
      reminders.push({
        id: doc.id,
        text: data.text || data.task || "",
        scheduledTime: data.scheduledTime ? new Date(data.scheduledTime).toISOString() : null,
        status: data.status || "scheduled",
        channels: data.channels || [],
        taskId: data.taskId || null,
      })
    })
    return reminders
  } catch (err) {
    console.warn("[PlannerRoutes] fetchUpcomingReminders failed", err?.message || err)
    try {
      const fallback = await db
        .collection("reminders")
        .where("userId", "==", String(uid))
        .limit(limit)
        .get()
      const reminders = []
      fallback.forEach((doc) => {
        const data = doc.data() || {}
        reminders.push({
          id: doc.id,
          text: data.text || data.task || "",
          scheduledTime: data.scheduledTime ? new Date(data.scheduledTime).toISOString() : null,
          status: data.status || "scheduled",
          channels: data.channels || [],
          taskId: data.taskId || null,
        })
      })
      reminders.sort((a, b) => {
        const aTime = a.scheduledTime ? new Date(a.scheduledTime).getTime() : Infinity
        const bTime = b.scheduledTime ? new Date(b.scheduledTime).getTime() : Infinity
        return aTime - bTime
      })
      return reminders.slice(0, limit)
    } catch (fallbackErr) {
      console.warn("[PlannerRoutes] fetchUpcomingReminders fallback failed", fallbackErr?.message || fallbackErr)
      return []
    }
  }
}

async function fetchRecentReports(uid, limit = 5) {
  try {
    const snap = await db
      .collection("reports")
      .where("userId", "==", String(uid))
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    const reports = []
    snap.forEach((doc) => {
      const data = doc.data() || {}
      reports.push({
        id: doc.id,
        period: data.period || "",
        start: data.start || null,
        end: data.end || null,
        metrics: data.metrics || {},
        urls: data.urls || {},
        createdAt: asIso(data.createdAt),
      })
    })
    return reports
  } catch (err) {
    console.warn("[PlannerRoutes] fetchRecentReports failed", err?.message || err)
    return []
  }
}

async function fetchRecentNotes(uid, limit = 6) {
  try {
    const snap = await db
      .collection("journalEntries")
      .where("userId", "==", String(uid))
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    const notes = []
    snap.forEach((doc) => {
      const data = doc.data() || {}
      notes.push({
        id: doc.id,
        title: data.title || "",
        mood: data.mood || null,
        summary: (data.summary || data.text || "").slice(0, 320),
        createdAt: asIso(data.createdAt),
      })
    })
    return notes
  } catch (err) {
    console.warn("[PlannerRoutes] fetchRecentNotes failed", err?.message || err)
    return []
  }
}

async function buildUserContext(uid) {
  const [profileSnap, tasks, reminders, reports, notes] = await Promise.all([
    db.collection("users").doc(String(uid)).get(),
    fetchRecentTasks(uid),
    fetchUpcomingReminders(uid),
    fetchRecentReports(uid),
    fetchRecentNotes(uid),
  ])

  const profile = profileSnap.exists ? profileSnap.data() || {} : {}

  const categoryTotals = tasks.reduce((acc, task) => {
    const key = (task.category || "Uncategorized").trim() || "Uncategorized"
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const completedCount = tasks.filter((t) => t.completed).length

  return {
    profile: {
      name: profile.name || profile.displayName || null,
      email: profile.email || null,
      plan: profile.plan || profile.subscriptionPlan || null,
      timezone: profile.timezone || profile.tz || null,
      preferences: profile.preferences || {},
      secureDocs: profile.secureDocs || [],
    },
    summary: {
      generatedAt: new Date().toISOString(),
      totalTasks: tasks.length,
      completedTasks: completedCount,
      openTasks: tasks.length - completedCount,
      categoryTotals,
    },
    tasks,
    reminders,
    reports,
    notes,
  }
}

function extractActionsFromText(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return { text: "", actions: [] }
  }
  const fence = /```json([\s\S]*?)```/i
  const match = rawText.match(fence)
  if (!match) {
    // Fallback: try to parse raw as json if no prose
    try {
      const parsed = JSON.parse(rawText)
      return {
        text: "",
        actions: Array.isArray(parsed?.actions) ? parsed.actions : [],
      }
    } catch {
      return { text: rawText.trim(), actions: [] }
    }
  }
  let actions = []
  try {
    const parsed = JSON.parse(match[1])
    if (Array.isArray(parsed?.actions)) actions = parsed.actions
  } catch (err) {
    console.warn("[PlannerRoutes] Failed to parse actions JSON", err?.message || err)
  }
  const cleaned = rawText.replace(match[0], "").trim()
  return { text: cleaned, actions }
}

async function createTaskFromAction(uid, payload = {}) {
  const now = new Date()
  const doc = {
    title: (payload.title || "").slice(0, 160) || "Untitled Task",
    details: (payload.details || "").slice(0, 500),
    category: payload.category || payload.categoryName || "Uncategorized",
    completed: !!payload.completed,
    date: toYMD(payload.date),
    logs: Array.isArray(payload.logs) ? payload.logs.slice(0, 10) : [],
    reminderTime: payload.reminderTime || null,
    order: Number.isFinite(payload.order) ? payload.order : null,
    createdAt: now,
    updatedAt: now,
    userId: uid,
    source: payload.source || "planner-assistant",
    metadata: payload.metadata || { origin: "planner-assistant" },
  }
  if (payload.duration) doc.duration = payload.duration
  if (payload.link) doc.link = payload.link
  if (payload.priority) doc.priority = payload.priority
  const ref = await db.collection("tasks").add(doc)
  return {
    status: "completed",
    type: "create_task",
    label: payload.label || doc.title,
    taskId: ref.id,
    payload: { ...payload, id: ref.id },
    message: `Created task “${doc.title}” for ${doc.date}`,
  }
}

async function scheduleReminderFromAction(uid, payload = {}) {
  const text = payload.text || payload.title || ""
  const scheduledTime = payload.scheduledTime || payload.when || null
  if (!text || !scheduledTime) {
    return {
      status: "error",
      type: "schedule_reminder",
      payload,
      message: "Missing text or scheduledTime for reminder",
    }
  }
  try {
    const channels = Array.isArray(payload.channels) ? payload.channels : undefined
    const reminder = await handleTextReminder(text, uid, channels, {
      scheduledTime,
      timezone: payload.timezone || payload.tz || "UTC",
      taskId: payload.taskId || null,
    })
    return {
      status: "completed",
      type: "schedule_reminder",
      payload,
      message: `Scheduled reminder “${text}” for ${scheduledTime}`,
      reminderId: reminder?.id || null,
    }
  } catch (err) {
    return {
      status: "error",
      type: "schedule_reminder",
      payload,
      message: err?.message || "Failed to schedule reminder",
    }
  }
}

async function executePlannerActions(uid, actions = []) {
  if (!Array.isArray(actions) || !actions.length) return []
  const results = []
  for (const raw of actions.slice(0, 5)) {
    try {
      const type = String(raw?.type || raw?.name || "").toLowerCase()
      if (type === "create_task") {
        results.push(await createTaskFromAction(uid, raw?.payload || raw))
      } else if (type === "schedule_reminder") {
        results.push(await scheduleReminderFromAction(uid, raw?.payload || raw))
      } else {
        results.push({
          status: "ignored",
          type: raw?.type || raw?.name || "unknown",
          payload: raw?.payload || raw,
          message: "Unsupported action type",
        })
      }
    } catch (err) {
      results.push({
        status: "error",
        type: raw?.type || raw?.name || "unknown",
        payload: raw?.payload || raw,
        message: err?.message || "Action failed",
      })
    }
  }
  return results
}

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
