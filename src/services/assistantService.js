import { db } from '../../server/firebaseAdmin.js';
import { parseIntent } from './intentParser.js';
import { buildAssistantContext } from './contextAggregator.js';
import { createVaultItem } from './vaultIndexer.js';
import { searchVault, invalidateVaultSearchCache } from './vaultSearchService.js';
import { invalidateOrgFeedCache } from './feedService.js';
import textToSpeech from './textToSpeech.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
const OPENAI_API_BASE = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions';
const ASSISTANT_MODEL =
  process.env.OPENAI_ASSISTANT_MODEL || process.env.ASSISTANT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const ASSISTANT_SPEECH_VOLUME = Number(
  process.env.ASSISTANT_SPEECH_VOLUME && !Number.isNaN(Number(process.env.ASSISTANT_SPEECH_VOLUME))
    ? process.env.ASSISTANT_SPEECH_VOLUME
    : 0.8,
);

const TASK_STATUS_MAP = {
  pending: 'todo',
  todo: 'todo',
  completed: 'done',
  done: 'done',
  in_progress: 'in_progress',
  blocked: 'blocked',
};

function mapTaskStatus(status) {
  if (!status) return 'todo';
  const normalized = status.toString().toLowerCase().replace(/\s+/g, '_');
  return TASK_STATUS_MAP[normalized] || 'todo';
}

async function callOpenAI(messages) {
  if (!OPENAI_API_KEY) {
    return {
      choices: [{ message: { content: '' } }],
    };
  }

  const response = await fetch(OPENAI_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: ASSISTANT_MODEL,
      temperature: 0.4,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI assistant error ${response.status}: ${text}`);
  }

  return response.json();
}

async function recordAssistantEvent({ orgId, type = 'assistant', title, summary, content, metadata = {}, createdBy }) {
  try {
    const now = new Date();
    await createVaultItem({
      orgId,
      type,
      title,
      summary,
      content,
      metadata,
      sourceId: metadata.sourceId || null,
      createdAt: now,
      updatedAt: now,
      createdBy,
    });
    invalidateOrgFeedCache(orgId);
    invalidateVaultSearchCache(orgId);
  } catch (err) {
    console.error('[assistantService] failed to record vault entry', err);
  }
}

async function createTask({ orgId, uid, data, requestText }) {
  const title = data?.title || requestText || 'Assistant task';
  const status = mapTaskStatus(data?.status);
  const now = new Date();
  const payload = {
    title,
    description: data?.note || '',
    status,
    priority: data?.priority || 'medium',
    assignees: Array.isArray(data?.assignees) ? data.assignees : [],
    reporterUid: uid,
    source: 'assistant',
    metadata: {
      assistantIntent: 'create_task',
      prompt: requestText,
    },
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection(`orgs/${orgId}/tasks`).add(payload);

  await recordAssistantEvent({
    orgId,
    type: 'assistant',
    title: `Assistant created task: ${title}`,
    summary: `New ${status} task created from assistant request.`,
    content: data?.note || '',
    metadata: {
      taskId: ref.id,
      status,
      assignees: payload.assignees,
    },
    createdBy: uid,
  });

  return {
    ok: true,
    type: 'create_task',
    message: `Created task "${title}".`,
    taskId: ref.id,
    payload,
  };
}

async function findTaskByTitle({ orgId, title }) {
  const snap = await db.collection(`orgs/${orgId}/tasks`).orderBy('updatedAt', 'desc').limit(40).get();
  const lower = (title || '').toLowerCase();
  if (!lower) return null;
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .find((task) => (task.title || '').toLowerCase().includes(lower));
}

async function updateTask({ orgId, uid, data, requestText }) {
  const taskTitle = data?.title || '';
  const task = await findTaskByTitle({ orgId, title: taskTitle });
  if (!task) {
    return {
      ok: false,
      type: 'update_task',
      message: `Could not find a task matching "${taskTitle || 'your request'}".`,
    };
  }

  const updates = { updatedAt: new Date() };
  if (data?.status) updates.status = mapTaskStatus(data.status);
  if (typeof data?.progress === 'number') updates.progress = Math.min(100, Math.max(0, Number(data.progress)));
  if (data?.note) updates.lastNote = data.note;

  await db.collection(`orgs/${orgId}/tasks`).doc(task.id).set(updates, { merge: true });

  await recordAssistantEvent({
    orgId,
    type: 'assistant',
    title: `Assistant updated task: ${task.title}`,
    summary: `Status: ${updates.status || task.status || 'unchanged'}.`,
    content: data?.note || requestText || '',
    metadata: {
      taskId: task.id,
      progress: updates.progress ?? task.progress ?? null,
      status: updates.status || task.status || null,
    },
    createdBy: uid,
  });

  return {
    ok: true,
    type: 'update_task',
    message: `Updated task "${task.title}".`,
    taskId: task.id,
    updates,
  };
}

function summarizeTasksResponse(tasks = []) {
  if (!tasks.length) return 'No active tasks right now.';
  const lines = tasks.slice(0, 5).map((task) => {
    const status = task.status || 'todo';
    const title = task.title || '(untitled task)';
    const assignees =
      Array.isArray(task.assignees) && task.assignees.length ? ` — ${task.assignees.join(', ')}` : '';
    return `• [${status}] ${title}${assignees}`;
  });
  return `Here are the latest tasks:\n${lines.join('\n')}`;
}

async function summarizeVaultSearch({ orgId, query }) {
  const result = await searchVault({ orgId, query, limit: 5 });
  const items = result?.results || [];
  if (!items.length) return 'No matching insights yet.';
  const lines = items.map((item) => {
    const title = item.title || `${item.type || 'entry'} insight`;
    const snippet = (item.summary || item.content || '').slice(0, 200);
    return `• ${title}: ${snippet}`;
  });
  return `Vault search results:\n${lines.join('\n')}`;
}

async function executeIntent({ orgId, uid, text, intent }) {
  switch (intent.intent) {
    case 'create_task':
      return createTask({ orgId, uid, data: intent.data, requestText: text });
    case 'update_task':
      return updateTask({ orgId, uid, data: intent.data, requestText: text });
    case 'get_tasks':
      return {
        ok: true,
        type: 'get_tasks',
        message: summarizeTasksResponse(intent.data?.tasks || []),
      };
    case 'get_status':
      return {
        ok: true,
        type: 'get_status',
        message: 'Pulling the latest project status for you.',
      };
    default:
      return {
        ok: true,
        type: 'unknown',
        message: '',
      };
  }
}

function buildFallbackResponse({ text, intentResult, actionResult, contextSummary }) {
  if (actionResult?.message) return actionResult.message;
  if (!contextSummary) return `I heard: "${text}".`;
  return `Based on recent activity, here is what I found:\n${contextSummary}`;
}

async function buildAssistantReply({ text, intentResult, actionResult, contextSummary }) {
  if (!OPENAI_API_KEY) {
    return buildFallbackResponse({ text, intentResult, actionResult, contextSummary });
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are PlanCraft Teams assistant. Respond concisely (under 120 words), clarify uncertainties, and suggest next steps. Use bullet lists when listing multiple items.',
    },
    {
      role: 'user',
      content: `User request: ${text}
Detected intent: ${intentResult.intent}
Intent data: ${JSON.stringify(intentResult.data || {})}
Action result: ${actionResult?.message || 'No direct action performed.'}
Context:
${contextSummary || 'No additional context available.'}`,
    },
  ];

  try {
    const completion = await callOpenAI(messages);
    const reply = completion?.choices?.[0]?.message?.content?.trim();
    if (reply) return reply;
  } catch (err) {
    console.error('[assistantService] reply generation failed', err);
  }
  return buildFallbackResponse({ text, intentResult, actionResult, contextSummary });
}

export async function analyzeAssistantIntent(text) {
  return parseIntent(text);
}

export async function runAssistant({
  orgId,
  user,
  text,
  options = {},
}) {
  if (!text || !text.trim()) {
    return {
      intent: { intent: 'unknown', data: {}, confidence: 0 },
      action: { ok: false, message: 'No input received.' },
      response: 'Could you repeat that?',
      speech: null,
      latencyMs: 0,
      context: {},
    };
  }

  const startedAt = Date.now();
  const intentResult = await parseIntent(text);
  const context = await buildAssistantContext({ orgId, query: text });

  if (intentResult.intent === 'get_tasks' || intentResult.intent === 'get_status') {
    intentResult.data = { ...intentResult.data, tasks: context.tasks };
  }

  const actionResult = await executeIntent({
    orgId,
    uid: user?.uid || null,
    text,
    intent: intentResult,
  });

  if (intentResult.intent === 'get_status' && actionResult.ok) {
    const statusSummary = summarizeTasksResponse(context.tasks || []);
    actionResult.message = `${statusSummary}\n\nMeetings:\n${context.meetings
      .map((meeting) => `• ${meeting.title || 'Meeting'} — ${meeting.summary || ''}`)
      .join('\n')}`;
  }

  if (intentResult.intent === 'unknown' && context.summary) {
    actionResult.message = context.summary.slice(0, 800);
  }

  if (intentResult.intent === 'get_tasks' && actionResult.ok && !actionResult.message) {
    actionResult.message = summarizeTasksResponse(context.tasks || []);
  }

  if (intentResult.intent === 'search_vault' && actionResult.ok) {
    actionResult.message = await summarizeVaultSearch({ orgId, query: text });
  }

  const responseText = await buildAssistantReply({
    text,
    intentResult,
    actionResult,
    contextSummary: context.summary,
  });

  let speech = null;
  if (options?.speak) {
    try {
      speech = await textToSpeech(responseText, { voiceId: options.voiceId });
    } catch (err) {
      console.error('[assistantService] TTS failed', err);
    }
  }

  return {
    intent: intentResult,
    action: actionResult,
    response: responseText,
    speech,
    speechVolume: speech ? ASSISTANT_SPEECH_VOLUME : null,
    latencyMs: Date.now() - startedAt,
    context: {
      tasks: (context.tasks || []).length,
      meetings: (context.meetings || []).length,
      chats: (context.chats || []).length,
    },
  };
}

export default {
  analyzeAssistantIntent,
  runAssistant,
};
