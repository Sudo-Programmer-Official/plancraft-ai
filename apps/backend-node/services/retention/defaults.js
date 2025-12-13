import dayjs from "dayjs";

export const DEFAULT_SUPPRESSION_RULES = {
  maxEmailsPerDay: 1,
  recentLoginMinutes: 360, // 6 hours
};

export const DEFAULT_TEMPLATES = {
  workspace_empty: {
    key: "workspace_empty",
    subject: "Your workspace is ready — want to add your first task?",
    body: `Hey {{first_name}},

You created the "{{workspace_name}}" workspace, but nothing’s inside yet.

Add one task and you’ll immediately see how planning flows here.

→ Add your first task`,
    cta_url: "{{cta_url}}",
    type: "retention",
  },
  creator_draft_waiting: {
    key: "creator_draft_waiting",
    subject: "Your post draft is waiting",
    body: `You started creating content in Creator Mode, but didn’t publish it yet.

Want to finish it now?

→ Continue where you left off`,
    cta_url: "{{cta_url}}",
    type: "retention",
  },
  task_finish_nudge: {
    key: "task_finish_nudge",
    subject: "You started something — want to finish?",
    body: `You added tasks but none are marked done yet.

Pick one quick win and close it out in under 2 minutes.`,
    cta_url: "{{cta_url}}",
    type: "retention",
  },
  return_prompt: {
    key: "return_prompt",
    subject: "Jump back in — your plan is waiting",
    body: `It’s been a bit since you checked in.

Do you want to pick up where you left off?`,
    cta_url: "{{cta_url}}",
    type: "retention",
  },
};

export const DEFAULT_TRIGGERS = [
  {
    key: "signup_no_workspace",
    label: "Signup +24h, no workspace created",
    type: "onboarding",
    audience: "user",
    description: "User signed up but has not created or joined a workspace after 24h.",
    delayHours: 24,
    cooldownHours: 48,
    templateKey: "workspace_empty",
    intent: "signup+1d_no_workspace",
  },
  {
    key: "workspace_no_task",
    label: "Workspace created, no tasks",
    type: "onboarding",
    audience: "workspace",
    description: "Workspace exists but still empty after a day.",
    delayHours: 24,
    cooldownHours: 48,
    templateKey: "workspace_empty",
    intent: "workspace_created_no_task",
  },
  {
    key: "task_no_completion_48h",
    label: "Task added, nothing completed in 48h",
    type: "activation",
    audience: "user",
    description: "User created tasks but did not complete any within 48h.",
    delayHours: 48,
    cooldownHours: 48,
    templateKey: "task_finish_nudge",
    intent: "task_added_no_completion",
  },
  {
    key: "creator_mode_no_publish",
    label: "Creator Mode used but not published",
    type: "activation",
    audience: "workspace",
    description: "Creator Mode activity without a publish action.",
    delayHours: 12,
    cooldownHours: 24,
    templateKey: "creator_draft_waiting",
    intent: "creator_used_not_published",
  },
  {
    key: "no_login_3d",
    label: "No login in 3 days",
    type: "retention",
    audience: "user",
    description: "Gentle prompt for users quiet for 72h.",
    delayHours: 72,
    cooldownHours: 48,
    templateKey: "return_prompt",
    intent: "no_login_3d",
  },
  {
    key: "no_login_7d",
    label: "No login in 7 days",
    type: "retention",
    audience: "user",
    description: "Stronger reminder after a week away.",
    delayHours: 168,
    cooldownHours: 72,
    templateKey: "return_prompt",
    intent: "no_login_7d",
  },
  {
    key: "dropoff_active_user",
    label: "Active user suddenly dropped off",
    type: "retention",
    audience: "user",
    description: "Previously active (>=3 completions last 7d) but idle for 72h.",
    delayHours: 72,
    cooldownHours: 72,
    templateKey: "return_prompt",
    intent: "active_dropoff",
  },
];

export function hoursSince(date, now = dayjs()) {
  if (!date) return Infinity;
  const d = dayjs(date);
  if (!d.isValid()) return Infinity;
  return Math.abs(now.diff(d, "hour", true));
}

export function coerceDate(input) {
  if (!input && input !== 0) return null;
  try {
    if (typeof input?.toDate === "function") return input.toDate();
    if (typeof input?.seconds === "number") return new Date(input.seconds * 1000);
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function toIso(date) {
  const d = coerceDate(date);
  return d ? d.toISOString() : null;
}
