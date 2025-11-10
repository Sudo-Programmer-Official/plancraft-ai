import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { db } from "../lib/firebaseAdmin.js";
import {
  sanitizeMilestones,
  computeGoalProgress,
  serializeGoal,
  buildGoalSummary,
  normalizeDateToken,
} from "../utils/progress.js";
import { generateMilestonesWithAI } from "./milestoneGenerator.js";
import { syncLinkedTasks, createTasksForMilestones } from "./taskBridge.js";
import { scheduleMilestoneReminder, canScheduleMilestoneReminders } from "./reminderBridge.js";
import { sendGoalPush, canSendGoalPush } from "./notificationBridge.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const goalsCollection = () => db.collection("goals");
const reflectionsCollection = () => db.collection("goal_reflections");
const VALID_STATUSES = new Set(["active", "paused", "completed", "archived"]);
const PROGRESS_THRESHOLDS = [0.5, 0.8, 1];

function progressMilestoneCrossed(previous = 0, next = 0) {
  for (const marker of PROGRESS_THRESHOLDS) {
    if (previous < marker && next >= marker) return marker;
  }
  return null;
}

async function maybeSendGoalPush(userId, payload = {}) {
  if (!canSendGoalPush() || !userId) return;
  try {
    await sendGoalPush(userId, payload);
  } catch (err) {
    console.warn("[GoalsService] push dispatch failed", err?.message || err);
  }
}

async function syncMilestoneRemindersForGoal(goalId, goalDoc, options = {}) {
  if (!canScheduleMilestoneReminders()) return goalDoc.milestones || [];
  const timezoneId = options.timezone || goalDoc.timezone || "UTC";
  const milestones = Array.isArray(goalDoc.milestones)
    ? goalDoc.milestones.map((milestone) => ({ ...milestone }))
    : [];
  let changed = false;

  for (let idx = 0; idx < milestones.length; idx += 1) {
    const milestone = milestones[idx];
    if (!milestone || milestone.completed) continue;
    if (milestone.reminderScheduled || !milestone.deadline) continue;
    if (dayjs(milestone.deadline).isBefore(dayjs().subtract(1, "hour"))) continue;
    const result = await scheduleMilestoneReminder({
      userId: goalDoc.userId,
      milestone,
      goalTitle: goalDoc.title,
      timezone: milestone.timezone || timezoneId,
    });
    if (result) {
      milestones[idx] = {
        ...milestone,
        reminderScheduled: true,
        reminderSyncedAt: new Date(),
        reminderId: result?.reminder?.id || result?.id || milestone.reminderId || randomUUID(),
      };
      changed = true;
    }
  }

  if (changed && goalId) {
    await goalsCollection().doc(goalId).update({ milestones, updatedAt: new Date() });
  }

  return milestones;
}

function safeString(value, fallback = "", limit = 400) {
  if (value === null || value === undefined) return fallback;
  const raw = typeof value === "string" ? value : String(value);
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (!limit || trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit - 3)}...`;
}

function sanitizeCategory(value) {
  const token = safeString(value, "", 60);
  if (!token) return "General";
  return token;
}

function sanitizeStatus(value, fallback = "active") {
  if (!value) return fallback;
  const candidate = String(value).trim().toLowerCase();
  return VALID_STATUSES.has(candidate) ? candidate : fallback;
}

function clampProgress(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, num));
}

function normalizeLinkedTasks(list = []) {
  if (!Array.isArray(list)) return [];
  return Array.from(
    new Set(
      list
        .map((value) => {
          if (!value && value !== 0) return null;
          return String(value).trim();
        })
        .filter(Boolean),
    ),
  ).slice(0, 30);
}

function deriveTargetDate(payload = {}, milestones = []) {
  const direct = normalizeDateToken(payload.targetDate || payload.deadline || null);
  if (direct) return direct;
  const milestoneDates = milestones
    .map((m) => normalizeDateToken(m.deadline))
    .filter(Boolean)
    .sort();
  if (milestoneDates.length) return milestoneDates[milestoneDates.length - 1];
  return null;
}

function prepareGoalDocument(payload = {}, options = {}) {
  const userId = safeString(payload.userId || payload.uid || payload.ownerId, "");
  if (!userId) throw new Error("Missing userId for goal");

  const baseMilestones = sanitizeMilestones(payload.milestones || []);
  return {
    userId,
    title: safeString(payload.title, "Untitled Goal", 160),
    description: safeString(payload.description || payload.summary, "", 2000),
    category: sanitizeCategory(payload.category || payload.domain),
    motivationNote: safeString(payload.motivationNote || payload.reason || "", 800),
    targetDate: deriveTargetDate(payload, baseMilestones),
    milestones: baseMilestones,
    linkedTasks: normalizeLinkedTasks(payload.linkedTasks || payload.tasks || []),
    progress: clampProgress(payload.progress, computeGoalProgress(baseMilestones, 0)),
    status: sanitizeStatus(payload.status),
    voiceContext: options.voiceContext || payload.voiceContext || null,
    aiContext: options.aiContext || payload.aiContext || null,
    motivationPulseAt: payload.motivationPulseAt ? new Date(payload.motivationPulseAt) : null,
    timezone: payload.timezone || options.timezone || null,
    tags: Array.isArray(payload.tags)
      ? payload.tags
          .map((tag) => safeString(tag, "", 48))
          .filter(Boolean)
          .slice(0, 12)
      : [],
  };
}

function serializeSnapshot(doc) {
  if (!doc) return null;
  const raw = doc.data();
  return serializeGoal({ id: doc.id, goalId: doc.id, ...raw });
}

export async function createGoal(payload = {}, options = {}) {
  const prepared = prepareGoalDocument(payload, options);
  let milestones = prepared.milestones;

  if ((options.autoPlan || payload.autoPlan || !milestones.length) && prepared.title) {
    try {
      milestones = await generateMilestonesWithAI(
        {
          title: prepared.title,
          description: prepared.description,
          targetDate: prepared.targetDate,
          category: prepared.category,
        },
        { timeframe: payload.timeframe },
      );
    } catch (err) {
      console.warn("[GoalsService] AI milestone gen fallback", err?.message || err);
    }
  }

  const now = new Date();
  const measuredProgress = computeGoalProgress(milestones, prepared.progress);
  const goalDoc = {
    ...prepared,
    milestones,
    targetDate: deriveTargetDate(prepared, milestones),
    progress: measuredProgress,
    progressHistory: [
      {
        id: randomUUID(),
        progress: measuredProgress,
        capturedAt: now,
        source: options.source || payload.source || "manual",
      },
    ],
    linkedTasks: prepared.linkedTasks,
    status: prepared.status || "active",
    createdAt: now,
    updatedAt: now,
  };

  const ref = await goalsCollection().add(goalDoc);
  const stored = { id: ref.id, goalId: ref.id, ...goalDoc };

  try {
    const synced = await syncMilestoneRemindersForGoal(ref.id, stored, { timezone: payload.timezone });
    if (Array.isArray(synced)) stored.milestones = synced;
  } catch (err) {
    console.warn("[GoalsService] reminder sync (create) failed", err?.message || err);
  }

  await syncLinkedTasks({
    userId: prepared.userId,
    goalId: ref.id,
    nextLinked: prepared.linkedTasks,
    previousLinked: [],
    goalSummary: buildGoalSummary(stored),
  });

  if (payload.generateTasksForMilestones || options.generateTasks) {
    await createTasksForMilestones({
      userId: prepared.userId,
      goalId: ref.id,
      milestones,
      timezone: payload.timezone,
    });
  }

  await maybeSendGoalPush(prepared.userId, {
    title: "Goal created",
    body: `“${stored.title}” is now live. Let's make it real.`,
    data: { goalId: ref.id },
  });

  return serializeGoal(stored);
}

export async function listGoals(userId, filters = {}) {
  const uid = safeString(userId, "");
  if (!uid) throw new Error("Missing userId");
  let query = goalsCollection().where("userId", "==", uid);
  if (filters.status && filters.status !== "all") {
    query = query.where("status", "==", sanitizeStatus(filters.status));
  }
  if (filters.category) {
    query = query.where("category", "==", sanitizeCategory(filters.category));
  }
  if (filters.after) {
    const afterDate = new Date(filters.after);
    if (!Number.isNaN(afterDate.getTime())) {
      query = query.where("updatedAt", ">=", afterDate);
    }
  }
  const snapshot = await query.orderBy("updatedAt", "desc").get();
  return snapshot.docs.map(serializeSnapshot);
}

export async function getGoal(goalId, userId) {
  if (!goalId) throw new Error("Missing goalId");
  const doc = await goalsCollection().doc(goalId).get();
  if (!doc.exists) throw new Error("Goal not found");
  const data = doc.data();
  if (userId && data.userId !== userId) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return serializeSnapshot(doc);
}

function buildMilestonePatch(existing, updates) {
  if (!updates || !Array.isArray(updates)) return existing;
  return sanitizeMilestones(updates);
}

export async function updateGoal(goalId, userId, updates = {}, options = {}) {
  if (!goalId) throw new Error("Missing goalId");
  const ref = goalsCollection().doc(goalId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Goal not found");
  const current = snap.data();
  if (userId && current.userId !== userId) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  const patch = {};
  const previousLinked = current.linkedTasks || [];
  let milestones = current.milestones || [];
  const prevProgress = Number(current.progress) || 0;
  const now = new Date();
  let shouldSyncReminders = false;

  if (Object.prototype.hasOwnProperty.call(updates, "title")) {
    patch.title = safeString(updates.title, current.title || "Untitled Goal", 160);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "description")) {
    patch.description = safeString(updates.description, "", 2000);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "category")) {
    patch.category = sanitizeCategory(updates.category);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "motivationNote")) {
    patch.motivationNote = safeString(updates.motivationNote, "", 800);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "status")) {
    patch.status = sanitizeStatus(updates.status, current.status);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "targetDate")) {
    patch.targetDate = normalizeDateToken(updates.targetDate) || null;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "milestones")) {
    milestones = buildMilestonePatch(current.milestones, updates.milestones);
    patch.milestones = milestones;
    shouldSyncReminders = true;
  }
  if (Object.prototype.hasOwnProperty.call(updates, "linkedTasks")) {
    patch.linkedTasks = normalizeLinkedTasks(updates.linkedTasks);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "progress")) {
    patch.progress = clampProgress(updates.progress, current.progress || 0);
  }

  if (Object.prototype.hasOwnProperty.call(updates, "autoPlan") && updates.autoPlan) {
    milestones = await generateMilestonesWithAI(
      {
        title: patch.title || current.title,
        description: patch.description || current.description,
        targetDate: patch.targetDate || current.targetDate,
        category: patch.category || current.category,
      },
      { timeframe: updates.timeframe },
    );
    patch.milestones = milestones;
    shouldSyncReminders = true;
  }

  if (patch.milestones) {
    patch.progress = computeGoalProgress(patch.milestones, patch.progress ?? current.progress ?? 0);
    patch.targetDate = patch.targetDate || deriveTargetDate(patch, patch.milestones);
  }

  if (
    Object.prototype.hasOwnProperty.call(patch, "progress") &&
    Math.abs((patch.progress ?? prevProgress) - prevProgress) > 0.001
  ) {
    const history = Array.isArray(current.progressHistory) ? [...current.progressHistory] : [];
    history.unshift({
      id: randomUUID(),
      progress: patch.progress,
      capturedAt: now,
      source: updates.source || options.source || "manual",
    });
    patch.progressHistory = history.slice(0, 20);
  }

  patch.updatedAt = now;
  await ref.update(patch);

  if (patch.linkedTasks) {
    await syncLinkedTasks({
      userId: current.userId,
      goalId,
      nextLinked: patch.linkedTasks,
      previousLinked,
      goalSummary: buildGoalSummary({ ...current, ...patch }),
    });
  }

  if (updates.generateTasksForMilestones) {
    await createTasksForMilestones({
      userId: current.userId,
      goalId,
      milestones: patch.milestones || milestones,
      timezone: updates.timezone,
    });
  }

  let fresh = await ref.get();
  const freshData = fresh.data() || {};

  if (shouldSyncReminders || !freshData.milestones?.every?.((m) => m.reminderScheduled || m.completed)) {
    try {
      const synced = await syncMilestoneRemindersForGoal(goalId, { ...freshData, userId: current.userId }, { timezone: updates.timezone });
      if (Array.isArray(synced)) {
        freshData.milestones = synced;
        fresh = await ref.get();
      }
    } catch (err) {
      console.warn("[GoalsService] reminder sync (update) failed", err?.message || err);
    }
  }

  const nextProgress = Number(freshData.progress ?? patch.progress ?? prevProgress) || 0;
  const marker = progressMilestoneCrossed(prevProgress, nextProgress);
  if (marker !== null) {
    await maybeSendGoalPush(current.userId, {
      title: "Goal momentum",
      body: `You're ${Math.round(nextProgress * 100)}% done with “${freshData.title || current.title}”.`,
      data: { goalId },
    });
  }

  return serializeSnapshot(await ref.get());
}

export async function deleteGoal(goalId, userId, options = {}) {
  if (!goalId) throw new Error("Missing goalId");
  const ref = goalsCollection().doc(goalId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: true, deleted: false };
  const current = snap.data();
  if (userId && current.userId !== userId) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }

  if (options.hardDelete) {
    await ref.delete();
  } else {
    await ref.update({ status: "archived", archivedAt: new Date(), updatedAt: new Date() });
  }

  await syncLinkedTasks({
    userId: current.userId,
    goalId,
    nextLinked: [],
    previousLinked: current.linkedTasks || [],
    goalSummary: buildGoalSummary(current),
  });

  return { ok: true, deleted: true };
}

function buildCategoryOverview(goals = []) {
  const bucket = new Map();
  goals.forEach((goal) => {
    const key = goal.category || "General";
    if (!bucket.has(key)) {
      bucket.set(key, { name: key, total: 0, completed: 0, progressSum: 0 });
    }
    const entry = bucket.get(key);
    entry.total += 1;
    if (goal.status === "completed") entry.completed += 1;
    entry.progressSum += Number(goal.progress || 0);
  });
  return Array.from(bucket.values()).map((entry) => ({
    ...entry,
    avgProgress: entry.total ? entry.progressSum / entry.total : 0,
  }));
}

function collectUpcomingMilestones(goals = [], limit = 4) {
  const collection = [];
  goals.forEach((goal) => {
    (goal.milestones || []).forEach((milestone) => {
      if (!milestone || milestone.completed || !milestone.deadline) return;
      const deadline = dayjs(milestone.deadline);
      if (!deadline.isValid()) return;
      collection.push({
        goalId: goal.goalId || goal.id,
        goalTitle: goal.title,
        milestoneId: milestone.id,
        title: milestone.title,
        deadline: milestone.deadline,
        daysRemaining: deadline.diff(dayjs(), "day"),
      });
    });
  });
  return collection.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, limit);
}

export async function summarizeGoals(userId) {
  const uid = safeString(userId, "");
  if (!uid) throw new Error("Missing userId");

  const snapshot = await goalsCollection().where("userId", "==", uid).get();
  const goals = snapshot.docs.map((doc) => ({ goalId: doc.id, id: doc.id, ...doc.data() }));
  const totalGoals = goals.length;
  const activeGoals = goals.filter((goal) => goal.status !== "archived").length;
  const completedGoals = goals.filter((goal) => goal.status === "completed").length;
  const avgProgress = totalGoals
    ? goals.reduce((acc, goal) => acc + Number(goal.progress || 0), 0) / totalGoals
    : 0;

  const categories = buildCategoryOverview(goals).sort((a, b) => b.total - a.total);
  const upcomingMilestones = collectUpcomingMilestones(goals);

  const reflectionSnap = await reflectionsCollection()
    .where("userId", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  const lastReflection = reflectionSnap.docs.length ? reflectionSnap.docs[0].data() : null;
  const lastReflectionIso = lastReflection?.createdAt?.toDate
    ? lastReflection.createdAt.toDate().toISOString()
    : lastReflection?.createdAt || null;
  const reflectionDue =
    !lastReflectionIso || dayjs(lastReflectionIso).isBefore(dayjs().subtract(6, "day"));
  const primaryCategory = categories[0]?.name || "your goals";
  const reflectionPrompt = `What moved you closer to ${primaryCategory} this week?`;

  return {
    totals: {
      totalGoals,
      activeGoals,
      completedGoals,
      avgProgress,
    },
    categories,
    upcomingMilestones,
    reflection: {
      lastEntryAt: lastReflectionIso,
      due: reflectionDue,
      prompt: reflectionPrompt,
    },
  };
}

export async function recordGoalReflection(userId, payload = {}) {
  const uid = safeString(userId, "");
  if (!uid) throw new Error("Missing userId");
  const text = safeString(payload.text || payload.entry || payload.note, "", 2000);
  if (!text) throw new Error("Reflection text is required");
  const now = new Date();
  const body = {
    userId: uid,
    goalId: payload.goalId || null,
    text,
    mood: safeString(payload.mood, "", 40) || null,
    tone: safeString(payload.tone, "", 40) || null,
    source: safeString(payload.source, "manual", 40),
    voiceNoteUrl: safeString(payload.voiceNoteUrl, "", 400) || null,
    createdAt: now,
    weekOf: dayjs(now).startOf("week").format("YYYY-MM-DD"),
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
  const ref = await reflectionsCollection().add(body);
  await maybeSendGoalPush(uid, {
    title: "Reflection saved",
    body: "Your weekly reflection is logged. Keep that momentum going.",
  });
  const doc = await ref.get();
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : now.toISOString(),
  };
}

export async function listGoalReflections(userId, filters = {}) {
  const uid = safeString(userId, "");
  if (!uid) throw new Error("Missing userId");
  let query = reflectionsCollection().where("userId", "==", uid);
  if (filters.goalId) {
    query = query.where("goalId", "==", filters.goalId);
  }
  query = query.orderBy("createdAt", "desc").limit(Math.min(filters.limit || 10, 25));
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      goalId: data.goalId || null,
      text: data.text,
      mood: data.mood || null,
      tone: data.tone || null,
      source: data.source || "manual",
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
    };
  });
}
