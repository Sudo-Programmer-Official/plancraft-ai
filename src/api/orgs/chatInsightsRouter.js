import express from 'express';
import admin, { db } from '../../../server/firebaseAdmin.js';
import withOrgAuth from './middlewares/withOrgAuth.js';
import { summarizeChat } from '../../services/aiSummarizer.js';
import { suggestReplies } from '../../services/aiReplyService.js';
import { searchOrgInsights } from '../../services/insightSearchService.js';
import { voiceToTasks } from '../../services/voiceOrchestrator.js';

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

function messagesCollection(orgId, roomId) {
  return db.collection(`orgs/${orgId}/chatRooms/${roomId}/messages`);
}

function insightsCollection(orgId, roomId) {
  return db.collection(`orgs/${orgId}/chatRooms/${roomId}/insights`);
}

async function fetchTranscript({ orgId, roomId, limit = 80 }) {
  const snap = await messagesCollection(orgId, roomId).orderBy('createdAt', 'desc').limit(limit).get();
  const messages = snap.docs.map((doc) => doc.data()).reverse();
  const transcript = messages.map((msg) => `${msg.senderName || msg.senderUid || 'User'}: ${msg.text || ''}`).join('\n');
  return { messages, transcript };
}

async function createTasksFromSummary({ orgId, projectId, summary, tasks = [], uid, roomId }) {
  if (!projectId || !tasks.length) return [];
  const now = new Date();
  const created = [];
  const col = db.collection(`orgs/${orgId}/projects/${projectId}/tasks`);
  for (const task of tasks) {
    const data = {
      title: task.title || 'Follow up from chat',
      description: task.description || summary || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      assignedTo: Array.isArray(task.assignees) ? task.assignees[0] || null : task.assignedTo || null,
      assignees: Array.isArray(task.assignees) ? task.assignees : [],
      dueDate: task.due ? new Date(task.due) : null,
      source: 'chat',
      metadata: { roomId },
      createdAt: now,
      updatedAt: now,
      createdBy: uid || null,
    };
    const ref = await col.add(data);
    created.push({ id: ref.id, ...data });
  }
  return created;
}

router.post('/rooms/:roomId/summary', async (req, res) => {
  try {
    const { orgId, roomId } = req.params;
    const { projectId = null, createTasks = false } = req.body || {};
    const { messages, transcript } = await fetchTranscript({ orgId, roomId });
    const summaryResult = await summarizeChat({ transcript, orgId, roomId });

    let tasks = [];
    if (summaryResult?.summary) {
      const aiTasks = await voiceToTasks({ transcript: summaryResult.summary, summary: summaryResult.summary, orgId });
      if (createTasks && projectId) {
        tasks = await createTasksFromSummary({
          orgId,
          projectId,
          summary: summaryResult.summary,
          tasks: aiTasks,
          uid: req.user?.uid || null,
          roomId,
        });
      } else {
        tasks = aiTasks;
      }
    }

    const insight = {
      summary: summaryResult.summary,
      bullets: summaryResult.bullets || [],
      model: summaryResult.model || null,
      createdAt: new Date(),
      createdBy: req.user?.uid || null,
      tasksSuggested: tasks.map((task) => ({ id: task.id || null, title: task.title, projectId: task.projectId || projectId || null })),
    };

    await insightsCollection(orgId, roomId).add(insight);

    res.json({ ...insight, tasks, transcript });
  } catch (err) {
    console.error('POST /chat/summary error', err);
    res.status(500).json({ error: 'Failed to summarize chat' });
  }
});

router.post('/rooms/:roomId/reply', async (req, res) => {
  try {
    const { orgId, roomId } = req.params;
    const { tone = 'friendly' } = req.body || {};
    const { transcript } = await fetchTranscript({ orgId, roomId, limit: 40 });
    const result = await suggestReplies({ transcript, tone });
    res.json(result);
  } catch (err) {
    console.error('POST /chat/reply error', err);
    res.status(500).json({ error: 'Failed to generate reply suggestions' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { q } = req.query;
    const result = await searchOrgInsights({ orgId, query: String(q || ''), limit: Number(req.query.limit || 20) });
    res.json(result);
  } catch (err) {
    console.error('GET /chat/search error', err);
    res.status(500).json({ error: 'Failed to search org insights' });
  }
});

router.post('/coach', async (req, res) => {
  try {
    const { orgId, roomId } = req.params;
    const { persona = 'mentor' } = req.body || {};
    const { transcript } = await fetchTranscript({ orgId, roomId, limit: 50 });

    const personaPrompt = {
      mentor: 'experienced mentor offering constructive guidance',
      friend: 'supportive friend providing encouraging advice',
      zen: 'calm mindfulness coach focusing on wellness',
    }[persona] || 'experienced mentor offering constructive guidance';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.json({
        message: 'Keep collaborating calmly—focus on your next actionable step together.',
        persona,
        model: null,
      });
    }

    const endpoint = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.OPENAI_COACH_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const prompt = `You are ${personaPrompt}. Review the following team chat snippet and provide a short encouragement with one concrete suggestion.
\nSnippet:\n"""
${transcript.slice(-4000)}
"""`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You provide concise, positive coaching messages.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[chat coach] OpenAI error', response.status, text);
      return res.json({
        message: 'Great work staying aligned. Pick one focus item and drive it to done today.',
        persona,
        model: null,
      });
    }

    const json = await response.json();
    const message = json?.choices?.[0]?.message?.content?.trim() || 'Keep up the momentum!';
    res.json({ message, persona, model });
  } catch (err) {
    console.error('POST /chat/coach error', err);
    res.status(500).json({ error: 'Failed to generate coach message' });
  }
});

export default router;
