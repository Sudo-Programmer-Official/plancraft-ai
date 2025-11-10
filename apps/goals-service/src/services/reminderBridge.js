import fetch from "node-fetch";

const RAW_ENDPOINT = process.env.GOALS_REMINDER_SERVICE_URL || process.env.REMINDER_SERVICE_URL || "";
const REMINDER_ENDPOINT = RAW_ENDPOINT.replace(/\/$/, "");
const SERVICE_TOKEN = process.env.GOALS_REMINDER_SERVICE_TOKEN || process.env.SERVICE_API_TOKEN || null;
const DEFAULT_TEMPLATE =
  process.env.GOAL_REMINDER_TEMPLATE || "Milestone '{title}' for '{goal}' is due soon. Ready to check it off?";

export function canScheduleMilestoneReminders() {
  return Boolean(REMINDER_ENDPOINT);
}

function buildReminderText(goalTitle, milestoneTitle) {
  return DEFAULT_TEMPLATE.replace('{goal}', goalTitle || 'your goal').replace('{title}', milestoneTitle || 'milestone');
}

export async function scheduleMilestoneReminder({ userId, milestone, goalTitle, timezone }) {
  if (!canScheduleMilestoneReminders()) return null;
  if (!userId || !milestone?.deadline) return null;
  const scheduledTime = milestone.deadline;
  const deadlineDate = new Date(scheduledTime);
  if (Number.isNaN(deadlineDate.getTime())) return null;
  if (deadlineDate.getTime() < Date.now() - 60 * 60 * 1000) {
    return null;
  }
  try {
    const payload = {
      userId,
      text: buildReminderText(goalTitle, milestone.title),
      scheduledTime,
      timezone: milestone.timezone || timezone || 'UTC',
      channels: milestone.channels || undefined,
      taskId: milestone.taskId || undefined,
    };
    const headers = { 'Content-Type': 'application/json' };
    if (SERVICE_TOKEN) headers['x-service-token'] = SERVICE_TOKEN;
    const res = await fetch(REMINDER_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Reminder API ${res.status}: ${text}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true };
    }
  } catch (err) {
    console.error('[GoalsService] Reminder sync failed', err?.message || err);
    return null;
  }
}
