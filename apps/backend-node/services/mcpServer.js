import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod-v4";
import { db } from "./firebaseAdmin.js";
import { createTask } from "./taskService.js";
import { checkUserPlanUsage } from "./planService.js";
import {
  getWorkspace,
  getWorkspaceMembership,
  listUserWorkspaces,
} from "./workspaceService.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const EDITOR_ROLES = new Set(["editor", "admin", "owner"]);
const MAX_TASKS_PER_CALL = 10;

const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  details: z.string().trim().max(1000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  scheduledTime: z.string().trim().max(100).optional(),
  reminderTime: z.string().trim().max(100).optional(),
  timezone: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
  priority: z.union([z.number(), z.string()]).optional(),
});

function normalizeTaskJson(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((entry) => normalizeTaskJson(entry));
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeTaskJson(entry)]),
    );
  }
  return value;
}

function mapTaskDoc(docSnap) {
  return {
    id: docSnap.id,
    ...normalizeTaskJson(docSnap.data()),
  };
}

function normalizeDate(value) {
  if (typeof value !== "string") return null;
  const date = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizeLimit(value, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

function toolResult(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

function toolError(message) {
  return {
    isError: true,
    content: [{ type: "text", text: String(message || "Tool call failed") }],
  };
}

function safeTool(handler) {
  return async (args, context) => {
    try {
      return await handler(args || {}, context);
    } catch (error) {
      const code = error?.code || "MCP_TOOL_ERROR";
      console.warn("[MCP] tool failed", { code, message: error?.message || "unknown error" });
      return toolError(`${code}: ${error?.message || "Tool call failed"}`);
    }
  };
}

async function requireWorkspaceAccess(userId, workspaceId, { write = false } = {}) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedWorkspaceId = String(workspaceId || "").trim();
  if (!normalizedUserId) {
    const error = new Error("Authenticated user is required");
    error.code = "UNAUTHORIZED";
    throw error;
  }
  if (!normalizedWorkspaceId) {
    const error = new Error("workspaceId is required");
    error.code = "WORKSPACE_REQUIRED";
    throw error;
  }

  const [workspace, membership] = await Promise.all([
    getWorkspace(normalizedWorkspaceId),
    getWorkspaceMembership(normalizedWorkspaceId, normalizedUserId),
  ]);
  if (!workspace) {
    const error = new Error("Workspace not found");
    error.code = "WORKSPACE_NOT_FOUND";
    throw error;
  }
  if (!membership || membership.status !== "active") {
    const error = new Error("You are not an active member of this workspace");
    error.code = "WORKSPACE_FORBIDDEN";
    throw error;
  }
  if (write && !EDITOR_ROLES.has(String(membership.role || "").toLowerCase())) {
    const error = new Error("Editor access is required for this action");
    error.code = "WORKSPACE_WRITE_FORBIDDEN";
    throw error;
  }
  return { workspace, membership };
}

async function listTasks({ workspaceId, date = null, startDate = null, endDate = null, limit = 50 }) {
  let ref = db.collection("tasks").where("workspaceId", "==", workspaceId);
  if (date) {
    ref = ref.where("date", "==", date);
  } else {
    if (startDate) ref = ref.where("date", ">=", startDate);
    if (endDate) ref = ref.where("date", "<=", endDate);
  }
  const snap = await ref.limit(normalizeLimit(limit)).get();
  return snap.docs.map(mapTaskDoc);
}

async function getTaskInWorkspace(taskId, workspaceId) {
  const id = String(taskId || "").trim();
  if (!id) {
    const error = new Error("taskId is required");
    error.code = "TASK_REQUIRED";
    throw error;
  }
  const ref = db.collection("tasks").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    const error = new Error("Task not found");
    error.code = "TASK_NOT_FOUND";
    throw error;
  }
  if (String(snap.data()?.workspaceId || "") !== String(workspaceId)) {
    const error = new Error("Task does not belong to the active workspace");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }
  return { ref, snap };
}

export const MCP_TOOL_NAMES = Object.freeze([
  "list_workspaces",
  "get_today_plan",
  "list_tasks",
  "get_task",
  "search_tasks",
  "create_tasks",
  "complete_task",
  "reschedule_task",
]);

export function createPlanCraftMcpServer({ userId }) {
  const server = new McpServer({
    name: "plancraft-ai",
    version: process.env.APP_VERSION || "1.0.0",
  });

  server.registerTool(
    "list_workspaces",
    {
      title: "List workspaces",
      description: "List the authenticated user's active PlanCraft workspaces and roles.",
    },
    safeTool(async () => {
      const workspaces = await listUserWorkspaces(String(userId));
      return toolResult({
        workspaces: workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          timezone: workspace.timezone || "UTC",
          role: workspace.role || "viewer",
          plan: workspace.plan || "free",
        })),
      });
    }),
  );

  server.registerTool(
    "get_today_plan",
    {
      title: "Get today's plan",
      description: "Return tasks for a workspace on a requested date, defaulting to today in the workspace timezone.",
      inputSchema: z.object({
        workspaceId: z.string().trim().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    },
    safeTool(async ({ workspaceId, date }) => {
      const { workspace } = await requireWorkspaceAccess(userId, workspaceId);
      const targetDate = date || dayjs().tz(workspace.timezone || "UTC").format("YYYY-MM-DD");
      const tasks = await listTasks({ workspaceId, date: targetDate, limit: 100 });
      return toolResult({ workspaceId, date: targetDate, tasks });
    }),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "List tasks in a workspace, optionally filtered by date or date range.",
      inputSchema: z.object({
        workspaceId: z.string().trim().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    },
    safeTool(async ({ workspaceId, date, startDate, endDate, limit }) => {
      await requireWorkspaceAccess(userId, workspaceId);
      const tasks = await listTasks({ workspaceId, date, startDate, endDate, limit });
      return toolResult({ workspaceId, tasks });
    }),
  );

  server.registerTool(
    "get_task",
    {
      title: "Get task",
      description: "Read one task after verifying it belongs to the requested workspace.",
      inputSchema: z.object({
        workspaceId: z.string().trim().min(1),
        taskId: z.string().trim().min(1),
      }),
    },
    safeTool(async ({ workspaceId, taskId }) => {
      await requireWorkspaceAccess(userId, workspaceId);
      const { snap } = await getTaskInWorkspace(taskId, workspaceId);
      return toolResult({ task: mapTaskDoc(snap) });
    }),
  );

  server.registerTool(
    "search_tasks",
    {
      title: "Search tasks",
      description: "Search task titles and details within one workspace.",
      inputSchema: z.object({
        workspaceId: z.string().trim().min(1),
        query: z.string().trim().min(1).max(160),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    },
    safeTool(async ({ workspaceId, query, limit }) => {
      await requireWorkspaceAccess(userId, workspaceId);
      const tasks = await listTasks({ workspaceId, limit: 100 });
      const needle = query.toLowerCase();
      const matches = tasks
        .filter((task) => `${task.title || ""} ${task.details || ""}`.toLowerCase().includes(needle))
        .slice(0, normalizeLimit(limit, 20));
      return toolResult({ workspaceId, query, tasks: matches });
    }),
  );

  server.registerTool(
    "create_tasks",
    {
      title: "Create tasks",
      description: "Create one or more tasks in a workspace. Use this for independent actions instead of merging them into one task.",
      inputSchema: z.object({
        workspaceId: z.string().trim().min(1),
        tasks: z.array(taskInputSchema).min(1).max(MAX_TASKS_PER_CALL),
        scheduleReminders: z.boolean().optional(),
      }),
    },
    safeTool(async ({ workspaceId, tasks, scheduleReminders = false }) => {
      const { workspace } = await requireWorkspaceAccess(userId, workspaceId, { write: true });
      const created = [];
      for (const task of tasks) {
        const usage = await checkUserPlanUsage(String(userId), "tasks");
        if (!usage?.ok) {
          return toolError(`TASK_LIMIT_REACHED: Created ${created.length} of ${tasks.length} requested tasks.`);
        }
        const createdTask = await createTask(
          String(userId),
          {
            ...task,
            workspaceId,
            source: "mcp",
            timezone: task.timezone || workspace.timezone || "UTC",
          },
          {
            workspaceId,
            origin: "mcp",
            timezone: task.timezone || workspace.timezone || "UTC",
            skipReminder: !scheduleReminders,
            silent: true,
          },
        );
        created.push(normalizeTaskJson(createdTask));
      }
      return toolResult({ workspaceId, createdCount: created.length, tasks: created });
    }),
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete task",
      description: "Mark a workspace task complete or reopen it.",
      inputSchema: z.object({
        workspaceId: z.string().trim().min(1),
        taskId: z.string().trim().min(1),
        completed: z.boolean().optional(),
      }),
    },
    safeTool(async ({ workspaceId, taskId, completed = true }) => {
      await requireWorkspaceAccess(userId, workspaceId, { write: true });
      const { ref } = await getTaskInWorkspace(taskId, workspaceId);
      await ref.set(
        {
          completed,
          completedAt: completed ? new Date() : null,
          updatedAt: new Date(),
        },
        { merge: true },
      );
      const refreshed = await ref.get();
      return toolResult({ task: mapTaskDoc(refreshed) });
    }),
  );

  server.registerTool(
    "reschedule_task",
    {
      title: "Reschedule task",
      description: "Change a task's date and/or scheduled reminder time.",
      inputSchema: z.object({
        workspaceId: z.string().trim().min(1),
        taskId: z.string().trim().min(1),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        scheduledTime: z.string().trim().max(100).optional(),
        reminderTime: z.string().trim().max(100).nullable().optional(),
      }),
    },
    safeTool(async ({ workspaceId, taskId, date, scheduledTime, reminderTime }) => {
      await requireWorkspaceAccess(userId, workspaceId, { write: true });
      const nextDate = normalizeDate(date);
      if (!nextDate && !scheduledTime && reminderTime === undefined) {
        return toolError("RESCHEDULE_INPUT_REQUIRED: Provide date, scheduledTime, or reminderTime.");
      }
      const { ref } = await getTaskInWorkspace(taskId, workspaceId);
      const updates = { updatedAt: new Date() };
      if (nextDate) updates.date = nextDate;
      if (scheduledTime) updates.scheduledTime = scheduledTime;
      if (reminderTime !== undefined) updates.reminderTime = reminderTime;
      await ref.set(updates, { merge: true });
      const refreshed = await ref.get();
      return toolResult({ task: mapTaskDoc(refreshed) });
    }),
  );

  return server;
}
