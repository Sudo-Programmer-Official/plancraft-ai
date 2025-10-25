import admin, { db } from '../../server/firebaseAdmin.js';
import { textToSpeech } from './textToSpeech.js';
import { parseIntent } from './intentParser.js';

const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

function assertScope({ orgId, projectId }) {
  if (!orgId) throw Object.assign(new Error('Missing orgId'), { status: 400 });
  if (!projectId) throw Object.assign(new Error('Missing projectId'), { status: 400 });
}

async function fetchProjectTasks(orgId, projectId) {
  const ref = db.collection(`orgs/${orgId}/projects/${projectId}/tasks`);
  const snap = await ref.orderBy('updatedAt', 'desc').limit(100).get();
  return snap.docs.map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() }));
}

function scoreTaskMatch(task, query) {
  const hay = (task.title || '').toLowerCase();
  const needle = query.toLowerCase();
  if (hay === needle) return 1;
  if (hay.includes(needle)) return 0.8;
  const hayWords = hay.split(/\W+/);
  const needleWords = needle.split(/\W+/);
  const overlap = needleWords.filter((word) => hayWords.includes(word)).length;
  return overlap / Math.max(needleWords.length, hayWords.length);
}

function pickBestTask(tasks, title) {
  if (!title) return null;
  let best = null;
  let bestScore = 0;
  tasks.forEach((task) => {
    const score = scoreTaskMatch(task, title);
    if (score > bestScore) {
      best = task;
      bestScore = score;
    }
  });
  return best && bestScore >= 0.35 ? best : null;
}

function summarizeTasks(tasks, { limit = 5 } = {}) {
  if (!tasks.length) return 'No tasks found.';
  const top = tasks.slice(0, limit);
  const lines = top.map((task) => {
    const status = task.status || 'pending';
    const title = task.title || 'Untitled task';
    const assignee = task.assignedTo ? ` (assigned to ${task.assignedTo})` : '';
    const progress = typeof task.progress === 'number' ? ` — ${task.progress}%` : '';
    return `• ${title}${assignee} — ${status}${progress}`;
  });
  return lines.join('\n');
}

function formatStatusSummary(tasks) {
  if (!tasks.length) return 'No tasks yet for this project.';
  const counts = tasks.reduce(
    (acc, task) => {
      acc.total += 1;
      const status = task.status || 'pending';
      acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
      if (task.dueDate) acc.withDue += 1;
      if (typeof task.progress === 'number') acc.withProgress += 1;
      return acc;
    },
    { total: 0, withDue: 0, withProgress: 0, byStatus: {} },
  );

  const fragments = [`Total tasks: ${counts.total}`];
  Object.entries(counts.byStatus).forEach(([status, value]) => {
    fragments.push(`${status}: ${value}`);
  });
  return fragments.join(' · ');
}

export async function handleVoiceCommand({ text, orgId, projectId, uid }) {
  assertScope({ orgId, projectId });

  const intentResult = await parseIntent(text);
  const intent = intentResult.intent || 'unknown';
  const data = intentResult.data || {};

  const baseContext = { orgId, projectId, uid, originalText: text, intent };

  switch (intent) {
    case 'create_task':
      return createTaskFromVoice({ ...baseContext, data });
    case 'update_task':
      return updateTaskFromVoice({ ...baseContext, data });
    case 'get_tasks':
      return getTasksFromVoice({ ...baseContext, data });
    case 'get_status':
      return getStatusFromVoice({ ...baseContext, data });
    default:
      return {
        intent,
        replyText: "I'm not sure how to help with that yet.",
        speechUrl: await textToSpeech("I'm not sure how to help with that yet."),
        data: {},
      };
  }
}

async function createTaskFromVoice({ orgId, projectId, uid, data, originalText }) {
  const title = (data.title || originalText).trim();
  if (!title) {
    return {
      intent: 'create_task',
      replyText: 'I could not figure out the task title.',
      speechUrl: null,
      data: {},
    };
  }

  const doc = {
    title,
    description: data.description || '',
    status: data.status || 'pending',
    assignedTo: data.assignedTo || null,
    progress: typeof data.progress === 'number' ? Math.min(100, Math.max(0, data.progress)) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid || null,
    lastNote: null,
    lastUpdateAt: serverTimestamp(),
    metadata: { source: 'voice' },
  };

  const ref = await db.collection(`orgs/${orgId}/projects/${projectId}/tasks`).add(doc);
  const stored = await ref.get();
  const payload = { id: ref.id, ...stored.data() };
  const replyText = `Added task ${title}.`;
  return {
    intent: 'create_task',
    replyText,
    speechUrl: await textToSpeech(replyText),
    data: payload,
  };
}

async function updateTaskFromVoice({ orgId, projectId, uid, data, originalText }) {
  const tasks = await fetchProjectTasks(orgId, projectId);
  const target = pickBestTask(tasks, data.title || originalText);
  if (!target) {
    const replyText = `I could not find a task matching ${data.title || originalText}.`;
    return {
      intent: 'update_task',
      replyText,
      speechUrl: await textToSpeech(replyText),
      data: {},
    };
  }

  const updates = {
    updatedAt: serverTimestamp(),
  };
  if (data.status) updates.status = data.status === 'completed' ? 'completed' : data.status;
  if (typeof data.progress === 'number') updates.progress = Math.min(100, Math.max(0, data.progress));
  if (uid) updates.lastUpdatedBy = uid;
  if (data.note || originalText) {
    updates.lastNote = data.note || originalText;
    updates.lastUpdateAt = serverTimestamp();
  }

  await target.ref.update(updates);
  const fresh = await target.ref.get();

  try {
    await target.ref.collection('updates').add({
      note: data.note || originalText || null,
      status: fresh.get('status') ?? null,
      progress: fresh.get('progress') ?? null,
      uid: uid || null,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[updateTaskFromVoice] failed to append update log', err);
  }

  const replyText = `Updated ${target.title}.`;
  return {
    intent: 'update_task',
    replyText,
    speechUrl: await textToSpeech(replyText),
    data: { id: target.id, ...fresh.data() },
  };
}

async function getTasksFromVoice({ orgId, projectId, data }) {
  const tasks = await fetchProjectTasks(orgId, projectId);
  const status = data.status || null;
  const filtered = status ? tasks.filter((task) => (task.status || 'pending') === status) : tasks;
  const replyText = summarizeTasks(filtered);

  return {
    intent: 'get_tasks',
    replyText,
    speechUrl: await textToSpeech(replyText),
    data: filtered.map(({ ref, ...rest }) => rest),
  };
}

async function getStatusFromVoice({ orgId, projectId }) {
  const tasks = await fetchProjectTasks(orgId, projectId);
  const replyText = formatStatusSummary(tasks);
  return {
    intent: 'get_status',
    replyText,
    speechUrl: await textToSpeech(replyText),
    data: tasks.map(({ ref, ...rest }) => rest),
  };
}

function filterTasksForQuery(tasks, text) {
  const lower = text.toLowerCase();
  let filtered = tasks;

  if (lower.includes('overdue')) {
    filtered = filtered.filter((task) => {
      const due = task.dueDate?.toDate ? task.dueDate.toDate() : task.dueDate ? new Date(task.dueDate) : null;
      if (!due) return false;
      const now = new Date();
      return due < now;
    });
  } else if (lower.includes('today')) {
    filtered = filtered.filter((task) => {
      const due = task.dueDate?.toDate ? task.dueDate.toDate() : task.dueDate ? new Date(task.dueDate) : null;
      if (!due) return false;
      const now = new Date();
      return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate();
    });
  } else if (lower.includes('tomorrow')) {
    filtered = filtered.filter((task) => {
      const due = task.dueDate?.toDate ? task.dueDate.toDate() : task.dueDate ? new Date(task.dueDate) : null;
      if (!due) return false;
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return due.getFullYear() === tomorrow.getFullYear() &&
        due.getMonth() === tomorrow.getMonth() &&
        due.getDate() === tomorrow.getDate();
    });
  }

  const statusMatch = lower.match(/\b(pending|blocked|completed|in progress|todo|to-do)\b/);
  if (statusMatch) {
    const statusLookup = {
      pending: 'pending',
      todo: 'pending',
      'to-do': 'pending',
      blocked: 'blocked',
      completed: 'completed',
      'in progress': 'in_progress',
    };
    const status = statusLookup[statusMatch[1]];
    if (status) {
      filtered = filtered.filter((task) => (task.status || 'pending') === status);
    }
  }

  return filtered;
}

export async function handleVoiceQuery({ text, orgId, projectId }) {
  assertScope({ orgId, projectId });
  const tasks = await fetchProjectTasks(orgId, projectId);
  const filtered = filterTasksForQuery(tasks, text);
  const summary = summarizeTasks(filtered, { limit: 6 });
  return {
    replyText: summary,
    speechUrl: await textToSpeech(summary),
    data: filtered.map(({ ref, ...rest }) => rest),
  };
}
