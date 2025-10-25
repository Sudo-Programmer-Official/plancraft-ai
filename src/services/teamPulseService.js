import admin, { db } from '../../server/firebaseAdmin.js';
import { textToSpeech } from './textToSpeech.js';

const OPENAI_ENDPOINT = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_PULSE_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

const COMPLETED_STATUS = ['completed', 'done'];
const ACTIVE_STATUS = ['in_progress', 'pending', 'todo'];

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isCompleted(task) {
  const status = (task.status || '').toLowerCase();
  return COMPLETED_STATUS.includes(status);
}

function isBlocked(task) {
  const status = (task.status || '').toLowerCase();
  return status === 'blocked';
}

function calculateSentimentScore(text = '') {
  const positiveWords = ['great', 'good', 'proud', 'happy', 'win', 'progress', 'confident'];
  const negativeWords = ['stuck', 'bad', 'sad', 'blocked', 'frustrated', 'angry', 'tired'];
  const lower = text.toLowerCase();
  const positives = positiveWords.reduce((acc, word) => (lower.includes(word) ? acc + 1 : acc), 0);
  const negatives = negativeWords.reduce((acc, word) => (lower.includes(word) ? acc + 1 : acc), 0);
  if (positives === negatives) return 0;
  return positives > negatives ? 1 : -1;
}

async function fetchWeeklyContext({ orgId, projectId, since }) {
  const tasksRef = db.collection(`orgs/${orgId}/projects/${projectId}/tasks`);
  const tasksSnap = await tasksRef.where('updatedAt', '>=', since).get();
  const allTasksSnap = await tasksRef.get();

  const weeklyTasks = [];
  const allTasks = [];
  tasksSnap.forEach((doc) => weeklyTasks.push({ id: doc.id, ...doc.data() }));
  allTasksSnap.forEach((doc) => allTasks.push({ id: doc.id, ...doc.data() }));

  let reflections = [];
  try {
    const reflectionsSnap = await db
      .collection(`orgs/${orgId}/reflections`)
      .where('createdAt', '>=', since)
      .get();
    reflections = reflectionsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((reflection) => !projectId || reflection.projectId == null || reflection.projectId === projectId);
  } catch (err) {
    // collection may not exist yet; ignore
  }

  return { weeklyTasks, allTasks, reflections };
}

function buildWeeklyStats({ weeklyTasks, allTasks, reflections }) {
  const now = new Date();
  const total = allTasks.length;
  const completed = allTasks.filter((t) => isCompleted(t)).length;
  const active = allTasks.filter((t) => ACTIVE_STATUS.includes((t.status || '').toLowerCase())).length;
  const blocked = allTasks.filter((t) => isBlocked(t)).length;
  const overdue = allTasks.filter((t) => {
    const due = toDate(t.dueDate);
    return due && due < now && !isCompleted(t);
  }).length;

  const completionRate = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

  const contributorMap = new Map();
  weeklyTasks.forEach((task) => {
    const owner = task.assignedTo || (Array.isArray(task.assignees) ? task.assignees[0] : null);
    if (!owner) return;
    const prev = contributorMap.get(owner) || { owner, completed: 0, updated: 0 };
    if (isCompleted(task)) prev.completed += 1;
    prev.updated += 1;
    contributorMap.set(owner, prev);
  });

  const topContributors = Array.from(contributorMap.values())
    .sort((a, b) => b.completed - a.completed || b.updated - a.updated)
    .slice(0, 5);

  const highlights = weeklyTasks
    .filter((task) => isCompleted(task) || task.progress >= 75)
    .map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      progress: task.progress || null,
      assignedTo: task.assignedTo || null,
      updatedAt: task.updatedAt,
    }))
    .slice(0, 6);

  const sentimentTrend = reflections.map((reflection) => ({
    id: reflection.id,
    createdAt: reflection.createdAt,
    score: calculateSentimentScore(reflection.text || reflection.summary || ''),
  }));

  const sentimentAverage = sentimentTrend.length
    ? Number(
        (
          sentimentTrend.reduce((sum, entry) => sum + entry.score, 0) / sentimentTrend.length
        ).toFixed(2),
      )
    : 0;

  return {
    totals: {
      total,
      completed,
      active,
      blocked,
      overdue,
      completionRate,
    },
    topContributors,
    highlights,
    sentiment: {
      average: sentimentAverage,
      trend: sentimentTrend,
    },
  };
}

async function generateWeeklySummary({ stats, reflections, projectId }) {
  const reflectionSnippets = reflections.slice(0, 5).map((r) => r.text || r.summary || '').join('\n- ');
  const completionRate = stats.totals.completionRate;
  const blocked = stats.totals.blocked;

  if (!process.env.OPENAI_API_KEY) {
    const headline = `Project ${projectId} completed ${completionRate}% of tasks this week.`;
    const blockers = blocked
      ? `There are ${blocked} blockers flagged. Set aside time to unblock them.`
      : 'No active blockers detected. Keep up the momentum!';
    return {
      text: `${headline} ${blockers}`,
      model: null,
      generatedAt: new Date().toISOString(),
    };
  }

  const prompt = `You are an optimistic but honest project coach.
Project ID: ${projectId}
Completion rate: ${completionRate}%
Blocked tasks: ${blocked}
Top contributors: ${stats.topContributors
    .map((c) => `${c.owner} (${c.completed} completed)`)
    .join(', ') || 'none'}
Recent reflection snippets:
- ${reflectionSnippets || 'No reflections submitted this week.'}

Write a short weekly pulse summary (<=120 words) with a positive tone, followed by one actionable nudge.`;

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You produce concise team progress summaries.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[teamPulse] OpenAI weekly summary error', response.status, errorText);
      return {
        text: `Team progress: ${completionRate}% completion. Blockers: ${blocked}. Keep momentum going!`,
        model: null,
        generatedAt: new Date().toISOString(),
      };
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content?.trim();
    return {
      text: content || `Team progress: ${completionRate}% completion.`,
      model: OPENAI_MODEL,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[teamPulse] weekly summary failed', err);
    return {
      text: `Team progress: ${completionRate}% completion.`,
      model: null,
      generatedAt: new Date().toISOString(),
    };
  }
}

function buildMonthlyInsights(reflections, since) {
  const monthStart = new Date(since);
  monthStart.setDate(1);
  const streak = reflections.reduce((max, reflection) => {
    const score = calculateSentimentScore(reflection.text || reflection.summary || '');
    return score > 0 ? max + 1 : max;
  }, 0);

  const positiveDays = reflections.filter(
    (reflection) => calculateSentimentScore(reflection.text || reflection.summary || '') > 0,
  ).length;

  const badges = [];
  if (positiveDays >= 5) badges.push({ id: 'positivity', label: 'Positivity Streak', description: '5+ upbeat reflections logged.' });
  if (streak >= 3) badges.push({ id: 'momentum', label: 'Momentum Maker', description: 'Shared progress three days in a row.' });

  return {
    streak,
    positiveDays,
    badges,
  };
}

export async function getWeeklyPulse({ orgId, projectId }) {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { weeklyTasks, allTasks, reflections } = await fetchWeeklyContext({ orgId, projectId, since });
  const stats = buildWeeklyStats({ weeklyTasks, allTasks, reflections });
  const summary = await generateWeeklySummary({ stats, reflections, projectId });
  const monthly = buildMonthlyInsights(reflections, since);

  return {
    stats,
    summary,
    reflections,
    monthly,
  };
}

export async function getWeeklyPulseWithAudio(options) {
  const pulse = await getWeeklyPulse(options);
  const speechUrl = await textToSpeech(pulse.summary.text || '');
  return {
    ...pulse,
    audio: speechUrl ? { url: speechUrl } : null,
  };
}

export async function coachResponse({ orgId, projectId, prompt, summary }) {
  const basePrompt = `You are PlanCraftAI's friendly productivity coach. Respond with encouragement and a concrete nudge.`;
  const userPrompt = prompt || `Summarize progress for project ${projectId}.`;

  if (!process.env.OPENAI_API_KEY) {
    const text = summary
      ? `Love this momentum: ${summary.substring(0, 120)}... Keep pushing your top priority today!`
      : 'Keep the energy up! Focus on one high-impact task and celebrate the win when it is done.';
    return {
      text,
      speechUrl: await textToSpeech(text),
      model: null,
    };
  }

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: basePrompt },
      {
        role: 'user',
        content: `${userPrompt}\nCurrent weekly summary: ${summary || 'No summary available.'}`,
      },
    ],
    temperature: 0.7,
  };

  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[teamPulse] coach response OpenAI error', response.status, errorText);
      const fallback = 'You are doing great. Lock one focus block today and move your most important task forward.';
      return { text: fallback, speechUrl: await textToSpeech(fallback), model: null };
    }

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content?.trim() ||
      'Keep the momentum going—choose one meaningful win today.';
    return {
      text,
      speechUrl: await textToSpeech(text),
      model: OPENAI_MODEL,
    };
  } catch (err) {
    console.error('[teamPulse] coach response failed', err);
    const fallback = 'Great job pushing forward. Take a mindful break and celebrate progress when you can.';
    return { text: fallback, speechUrl: await textToSpeech(fallback), model: null };
  }
}

export function toPlainStats(pulse) {
  return {
    completionRate: pulse.stats.totals.completionRate,
    blockers: pulse.stats.totals.blocked,
    overdue: pulse.stats.totals.overdue,
    momentum: pulse.monthly.streak,
  };
}
