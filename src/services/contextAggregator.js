import { db } from '../../server/firebaseAdmin.js';
import { searchVault } from './vaultSearchService.js';

const DEFAULT_TASK_LIMIT = Number(process.env.ASSISTANT_TASK_CONTEXT_LIMIT || 5);
const DEFAULT_MEETING_LIMIT = Number(process.env.ASSISTANT_MEETING_CONTEXT_LIMIT || 3);
const DEFAULT_CHAT_CONTEXT_LIMIT = Number(process.env.ASSISTANT_CHAT_CONTEXT_LIMIT || 5);

function docToData(doc) {
  return { id: doc.id, ...doc.data() };
}

function summarizeTasks(tasks = []) {
  if (!tasks.length) return '';
  const lines = tasks.map((task) => {
    const status = task.status || 'todo';
    const title = task.title || '(untitled task)';
    const assignees = Array.isArray(task.assignees) && task.assignees.length ? ` — ${task.assignees.join(', ')}` : '';
    return `- [${status}] ${title}${assignees}`;
  });
  return `Recent tasks:\n${lines.join('\n')}`;
}

function summarizeMeetings(meetings = []) {
  if (!meetings.length) return '';
  const lines = meetings.map((meeting) => {
    const title = meeting.title || 'Meeting';
    const summary = meeting.summary || meeting.notes || '';
    return `- ${title}${summary ? `: ${summary.slice(0, 160)}` : ''}`;
  });
  return `Recent meetings:\n${lines.join('\n')}`;
}

function summarizeChatInsights(insights = []) {
  if (!insights.length) return '';
  const lines = insights.map((item) => {
    const title = item.title || 'Chat insight';
    const summary = item.summary || item.content || '';
    return `- ${title}: ${summary.slice(0, 160)}`;
  });
  return `Chat highlights:\n${lines.join('\n')}`;
}

export async function buildAssistantContext({ orgId, query = '' } = {}) {
  if (!orgId) return { summary: '', tasks: [], meetings: [], chats: [], vault: [] };

  const taskLimit = DEFAULT_TASK_LIMIT;
  const meetingLimit = DEFAULT_MEETING_LIMIT;
  const chatLimit = DEFAULT_CHAT_CONTEXT_LIMIT;

  const [tasksSnap, meetingsSnap, chatInsightsSnap] = await Promise.all([
    db.collection(`orgs/${orgId}/tasks`).orderBy('updatedAt', 'desc').limit(taskLimit).get(),
    db.collection(`orgs/${orgId}/meetings`).orderBy('updatedAt', 'desc').limit(meetingLimit).get(),
    db.collection(`orgs/${orgId}/vault`).where('type', '==', 'chat').orderBy('createdAt', 'desc').limit(chatLimit).get(),
  ]);

  const tasks = tasksSnap.docs.map(docToData);
  const meetings = meetingsSnap.docs.map(docToData);
  const chats = chatInsightsSnap.docs.map(docToData);

  let vaultResults = [];
  if (query && query.trim()) {
    try {
      const searched = await searchVault({ orgId, query, limit: 5 });
      vaultResults = searched?.results || [];
    } catch (err) {
      console.error('[contextAggregator] vault search failed', err);
    }
  }

  const summaryParts = [
    summarizeTasks(tasks),
    summarizeMeetings(meetings),
    summarizeChatInsights(chats),
  ].filter(Boolean);

  return {
    summary: summaryParts.join('\n\n'),
    tasks,
    meetings,
    chats,
    vault: vaultResults,
  };
}

export default {
  buildAssistantContext,
};
