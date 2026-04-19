import dayjs from "../../utils/dayjs.js";
import { db } from "../firebaseAdmin.js";
import { sendEmail } from "../emailService.js";
import { getUserPrefs } from "../userPrefService.js";
import {
  DEFAULT_TRIGGERS,
  DEFAULT_SUPPRESSION_RULES,
  hoursSince,
  coerceDate,
} from "./defaults.js";
import { getTemplate, renderTemplate } from "./templates.js";
import {
  computeUserEngagementState,
  refreshWorkspaceStatesForUser,
  listCandidateUsers,
} from "./engagementService.js";

const EVENTS_COLLECTION = "retention_events";
const TRIGGERS_COLLECTION = "retention_triggers";
const NUDGES_COLLECTION = "retention_nudges";

function baseAppUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.VITE_APP_BASE_URL ||
    "https://plancraftai.com"
  );
}

async function loadTriggers() {
  const snap = await db.collection(TRIGGERS_COLLECTION).get();
  const stored = new Map();
  snap.forEach((doc) => stored.set(doc.id, { key: doc.id, ...(doc.data() || {}) }));

  return DEFAULT_TRIGGERS.map((t) => {
    const override = stored.get(t.key) || {};
    return {
      ...t,
      ...override,
      enabled: override.enabled !== undefined ? override.enabled : true,
    };
  });
}

async function recordEvent(payload = {}) {
  const ref = await db.collection(EVENTS_COLLECTION).add({
    ...payload,
    fired_at: payload.fired_at || new Date(),
    created_at: new Date(),
  });
  return ref.id;
}

async function recentEventForTrigger(userId, triggerKey) {
  try {
    let ref = db
      .collection(EVENTS_COLLECTION)
      .where("userId", "==", String(userId))
      .where("trigger_key", "==", triggerKey);
    try {
      ref = ref.orderBy("fired_at", "desc");
    } catch {
      /* noop if index missing */
    }
    const snap = await ref.limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, ...(snap.docs[0].data() || {}) };
  } catch (err) {
    console.warn("[Retention] recent event lookup failed", err?.message || err);
  }
  return null;
}

async function shouldSuppressEmail(userId, userState) {
  const prefs = await getUserPrefs(userId);
  if (prefs.enable_email === false) return "unsubscribed";

  const lastLoginIso = userState?.last_login_at || userState?.lastLoginAt;
  if (lastLoginIso) {
    const minutes = dayjs().diff(dayjs(lastLoginIso), "minute");
    if (minutes >= 0 && minutes < DEFAULT_SUPPRESSION_RULES.recentLoginMinutes) {
      return "recent_login";
    }
  }

  try {
    const snap = await db
      .collection("email_logs")
      .where("userId", "==", String(userId))
      .limit(25)
      .get();
    const windowStart = dayjs().subtract(24, "hour");
    const recent = snap.docs.filter((doc) => {
      const data = doc.data() || {};
      const sourceOk = !data.source || data.source === "retention";
      const sent = coerceDate(data.sent_at || data.sentAt || data.created_at || doc.createTime?.toDate?.());
      if (!sent) return false;
      return sourceOk && dayjs(sent).isAfter(windowStart);
    });
    if (recent.length >= DEFAULT_SUPPRESSION_RULES.maxEmailsPerDay) {
      return "daily_cap";
    }
  } catch (err) {
    console.warn("[Retention] suppression check failed", err?.message || err);
  }

  return null;
}

function findWorkspaceById(workspaces = [], id) {
  return (workspaces || []).find((w) => String(w.workspace_id) === String(id));
}

async function sendRetentionEmail(userId, trigger, templateKey, context = {}) {
  const userSnap = await db.collection("users").doc(String(userId)).get();
  const profile = userSnap.exists ? userSnap.data() || {} : {};
  const email = profile.email || context.email;
  if (!email) return { success: false, skipped: true, reason: "missing_email" };

  const template = await getTemplate(templateKey);
  const name = profile.name || profile.displayName || "";
  const firstName = name ? name.split(" ")[0] : "there";
  const rendered = renderTemplate(template, {
    ...context,
    first_name: firstName,
    workspace_name: context.workspace_name || context.workspaceName || "your workspace",
    plan: profile.plan || context.plan || "free",
  });

  const result = await sendEmail({
    to: email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  await db.collection("email_logs").add({
    userId: String(userId),
    template_key: templateKey,
    trigger_key: trigger?.key,
    sent_at: new Date(),
    status: result?.success === false ? "skipped" : "sent",
    response: result || {},
    source: "retention",
    cta_url: rendered.cta_url || null,
    subject: rendered.subject,
  });

  return result;
}

async function createInAppNudge(userId, trigger, context = {}) {
  try {
    await db.collection(NUDGES_COLLECTION).add({
      userId: String(userId),
      trigger_key: trigger?.key,
      title: context.title || trigger?.label || "PlanCraftAI",
      body: context.body || context.text || "",
      cta_url: context.cta_url || null,
      workspaceId: context.workspaceId || null,
      createdAt: new Date(),
      status: "pending",
    });
  } catch (err) {
    console.warn("[Retention] failed to create in-app nudge", err?.message || err);
  }
}

function buildTriggerContext(trigger, userState, workspaceState) {
  const defaultCta = workspaceState?.workspace_id
    ? `${baseAppUrl()}/workspaces/${workspaceState.workspace_id}`
    : `${baseAppUrl()}/dashboard`;
  return {
    trigger_key: trigger.key,
    workspace_name: workspaceState?.workspace_name || "your workspace",
    workspaceId: workspaceState?.workspace_id || null,
    cta_url: defaultCta,
  };
}

function evaluateTrigger(trigger, userState, workspaceStates, now) {
  const events = [];
  const hours = (date) => hoursSince(date, now);

  switch (trigger.key) {
    case "signup_no_workspace": {
      if (!userState.signup_at) break;
      const noWorkspace = (userState.workspace_count || 0) === 0;
      const waited = hours(userState.signup_at) >= trigger.delayHours;
      if (noWorkspace && waited) events.push({ userId: userState.userId, workspaceId: null });
      break;
    }
    case "workspace_no_task": {
      (workspaceStates || []).forEach((ws) => {
        const empty = (ws.tasks_created_count || 0) === 0;
        const windowStart = ws.created_at || userState.signup_at;
        const waited = windowStart ? hours(windowStart) >= trigger.delayHours : false;
        if (empty && waited) events.push({ userId: userState.userId, workspaceId: ws.workspace_id });
      });
      break;
    }
    case "task_no_completion_48h": {
      const hasTasks = (userState.tasks_created_count || 0) > 0;
      const completedRecently = userState.last_task_completed_at
        ? hours(userState.last_task_completed_at) < trigger.delayHours
        : false;
      const lastTaskOldEnough =
        !userState.last_task_created_at ||
        hours(userState.last_task_created_at) >= trigger.delayHours;
      if (hasTasks && !completedRecently && lastTaskOldEnough) {
        events.push({ userId: userState.userId, workspaceId: null });
      }
      break;
    }
    case "creator_mode_no_publish": {
      (workspaceStates || []).forEach((ws) => {
        if (!ws.creator_mode_used) return;
        const published = !!ws.publish_attempted;
        const waited = hours(ws.last_activity_at || ws.created_at) >= trigger.delayHours;
        if (!published && waited) {
          events.push({ userId: userState.userId, workspaceId: ws.workspace_id });
        }
      });
      break;
    }
    case "no_login_3d":
    case "no_login_7d": {
      const anchor = userState.last_login_at || userState.signup_at;
      if (!anchor) break;
      if (hours(anchor) >= trigger.delayHours) {
        events.push({ userId: userState.userId, workspaceId: null });
      }
      break;
    }
    case "dropoff_active_user": {
      const active = (userState.tasks_completed_count || 0) >= 3;
      const idle = hours(userState.last_activity_at || userState.last_login_at) >= trigger.delayHours;
      if (active && idle) events.push({ userId: userState.userId, workspaceId: null });
      break;
    }
    default:
      break;
  }
  return events;
}

async function fireEvent(trigger, userState, workspaceStates, eventScope) {
  const workspace = eventScope.workspaceId
    ? findWorkspaceById(workspaceStates, eventScope.workspaceId)
    : null;
  const context = buildTriggerContext(trigger, userState, workspace);
  const suppression = await shouldSuppressEmail(userState.userId, userState);

  const firedAt = new Date();
  const eventRecord = {
    userId: String(userState.userId),
    workspaceId: eventScope.workspaceId || null,
    trigger_key: trigger.key,
    template_key: trigger.templateKey,
    fired_at: firedAt,
  };

  if (suppression) {
    await recordEvent({
      ...eventRecord,
      status: "suppressed",
      suppression_reason: suppression,
    });
    return { status: "suppressed", reason: suppression };
  }

  const emailResult = await sendRetentionEmail(
    userState.userId,
    trigger,
    trigger.templateKey,
    context
  );
  await createInAppNudge(userState.userId, trigger, {
    title: trigger.label,
    body:
      context.body ||
      "Pick up where you left off in PlanCraftAI.",
    cta_url: context.cta_url,
    workspaceId: eventScope.workspaceId,
  });

  await recordEvent({
    ...eventRecord,
    status: emailResult?.success === false ? "skipped" : "sent",
    delivery: {
      email: emailResult,
      in_app: true,
    },
  });

  return { status: "sent", email: emailResult };
}

export async function evaluateUser(userId) {
  const userState = await computeUserEngagementState(userId);
  if (!userState) return { userId, fired: 0 };

  const workspaceStates = await refreshWorkspaceStatesForUser(userState.workspace_ids || []);
  const triggers = await loadTriggers();
  const activeTriggers = triggers.filter((t) => t.enabled !== false);
  const now = dayjs();

  let fired = 0;
  for (const trigger of activeTriggers) {
    const recent = await recentEventForTrigger(userId, trigger.key);
    if (recent && hoursSince(recent.fired_at, now) < (trigger.cooldownHours || 24)) {
      continue;
    }
    const scopes = evaluateTrigger(trigger, userState, workspaceStates, now);
    for (const scope of scopes) {
      await fireEvent(trigger, userState, workspaceStates, scope);
      fired += 1;
    }
  }

  return { userId, fired };
}

export async function runRetentionSweep(options = {}) {
  const limit = Number(options.limit || process.env.RETENTION_SWEEP_LIMIT || 40);
  const users = options.users || (await listCandidateUsers(limit));
  let totalFired = 0;

  for (const user of users) {
    try {
      const result = await evaluateUser(user.id || user.uid || user.userId);
      totalFired += result?.fired || 0;
    } catch (err) {
      console.warn("[Retention] evaluateUser failed", user?.id || user, err?.message || err);
    }
  }
  return { scanned: users.length, fired: totalFired };
}

export async function listRetentionStats() {
  const since = dayjs().subtract(7, "day");
  let events = [];
  try {
    let ref = db.collection(EVENTS_COLLECTION);
    try {
      ref = ref.orderBy("fired_at", "desc");
    } catch {
      /* noop */
    }
    const snap = await ref.limit(250).get();
    events = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .filter((e) => {
        const fired = coerceDate(e.fired_at);
        return fired ? dayjs(fired).isAfter(since) : true;
      });
  } catch (err) {
    console.warn("[Retention] stats events fetch failed", err?.message || err);
  }

  let emailLogs = [];
  try {
    const snap = await db.collection("email_logs").where("source", "==", "retention").limit(250).get();
    emailLogs = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
  } catch {
    /* noop */
  }

  const sent7d = events.filter((e) => e.status === "sent");
  const suppressed7d = events.filter((e) => e.status === "suppressed");
  const pending = events.filter((e) => e.status !== "sent" && e.status !== "suppressed");

  return {
    events: events.length,
    sent7d: sent7d.length,
    suppressed7d: suppressed7d.length,
    pending: pending.length,
    emailLogs,
  };
}
