import admin, { db } from '../../server/firebaseAdmin.js';
import { generateAIDigest } from './aiDigestService.js';

const RANGE_WINDOW_DAYS = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
  '60d': 60,
};

function startDateForRange(range = '7d') {
  const days = RANGE_WINDOW_DAYS[range] || RANGE_WINDOW_DAYS['7d'];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

function bucketKey(date) {
  return date.toISOString().slice(0, 10);
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function toSeries(map) {
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, value]) => ({ date, value }));
}

export async function getOrgAnalytics({ orgId, range = '7d' }) {
  if (!orgId) throw new Error('Missing orgId');
  const since = startDateForRange(range);

  const [tasksSnap, meetingsSnap, vaultSnap] = await Promise.all([
    db.collection(`orgs/${orgId}/tasks`).where('createdAt', '>=', since).orderBy('createdAt', 'desc').limit(500).get(),
    db.collection(`orgs/${orgId}/meetings`).where('createdAt', '>=', since).orderBy('createdAt', 'desc').limit(200).get(),
    db.collection(`orgs/${orgId}/vault`).where('createdAt', '>=', since).orderBy('createdAt', 'desc').limit(400).get(),
  ]);

  let completedTasks = 0;
  const taskSeries = new Map();
  const completionSeries = new Map();
  const assigneeHeatmap = new Map();

  tasksSnap.forEach((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.() || data.createdAt || new Date();
    increment(taskSeries, bucketKey(createdAt));
    if (data.status === 'done' || data.status === 'completed') {
      completedTasks += 1;
      increment(completionSeries, bucketKey(createdAt));
    }
    if (Array.isArray(data.assignees)) {
      data.assignees.forEach((uid) => increment(assigneeHeatmap, uid || 'unassigned'));
    }
  });

  const meetingSeries = new Map();
  meetingsSnap.forEach((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.() || data.createdAt || new Date();
    increment(meetingSeries, bucketKey(createdAt));
  });

  let assistantEvents = 0;
  let chatInsights = 0;
  const assistantSeries = new Map();
  const feedPreview = [];

  vaultSnap.forEach((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate?.() || data.createdAt || new Date();
    if (feedPreview.length < 6) {
      feedPreview.push({
        id: doc.id,
        type: data.type,
        title: data.title || data.summary || 'Vault entry',
        createdAt,
      });
    }
    if (data.type === 'assistant') {
      assistantEvents += 1;
      increment(assistantSeries, bucketKey(createdAt));
    }
    if (data.type === 'chat') {
      chatInsights += 1;
    }
  });

  return {
    range,
    since: since.toISOString(),
    totals: {
      tasksCreated: tasksSnap.size,
      tasksCompleted: completedTasks,
      meetingsCreated: meetingsSnap.size,
      assistantEvents,
      chatInsights,
    },
    series: {
      tasksCreated: toSeries(taskSeries),
      tasksCompleted: toSeries(completionSeries),
      meetingsCreated: toSeries(meetingSeries),
      assistantEvents: toSeries(assistantSeries),
    },
    topAssignees: Array.from(assigneeHeatmap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uid, count]) => ({ uid, count })),
    recentHighlights: feedPreview,
  };
}

export async function recordTemplateUsage({ orgId, templateId, type = 'general', industry = 'general' }) {
  if (!orgId || !templateId) return;
  try {
    const ref = db.doc(`orgs/${orgId}/analytics/templateUsage/${templateId}`);
    await ref.set(
      {
        templateId,
        type,
        industry,
        usageCount: admin.firestore.FieldValue.increment(1),
        lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn('[analyticsService] Failed to record template usage', err);
  }
}

const POSITIVE_WORDS = ['great', 'good', 'proud', 'happy', 'win', 'progress', 'confident'];
const NEGATIVE_WORDS = ['stuck', 'bad', 'sad', 'blocked', 'frustrated', 'angry', 'tired'];

function sentimentScore(text = '') {
  const lower = text.toLowerCase();
  const positives = POSITIVE_WORDS.reduce((acc, word) => (lower.includes(word) ? acc + 1 : acc), 0);
  const negatives = NEGATIVE_WORDS.reduce((acc, word) => (lower.includes(word) ? acc + 1 : acc), 0);
  if (positives === negatives) return 0;
  return positives > negatives ? 1 : -1;
}

async function computeOrgSentimentAverage(orgId, since) {
  try {
    const snap = await db
      .collection(`orgs/${orgId}/reflections`)
      .where('createdAt', '>=', since)
      .limit(200)
      .get();
    if (snap.empty) return 0;
    let total = 0;
    let count = 0;
    snap.forEach((doc) => {
      const data = doc.data() || {};
      const text = data.text || data.summary || '';
      total += sentimentScore(text);
      count += 1;
    });
    return count ? Number((total / count).toFixed(2)) : 0;
  } catch (err) {
    console.warn('[analyticsService] sentiment aggregation failed', err);
    return 0;
  }
}

export async function getCrossOrgAnalytics({ range = '30d', limit = 10 } = {}) {
  const since = startDateForRange(range);
  const windowDays = RANGE_WINDOW_DAYS[range] || RANGE_WINDOW_DAYS['30d'];

  const orgSnap = await db.collection('orgs').orderBy('createdAt', 'desc').limit(limit).get();
  const orgEntries = await Promise.all(
    orgSnap.docs.map(async (doc) => {
      const orgId = doc.id;
      const orgName = doc.get('name') || 'Workspace';
      const analytics = await getOrgAnalytics({ orgId, range });
      const sentiment = await computeOrgSentimentAverage(orgId, since);
      const completionRate = analytics.totals.tasksCreated
        ? Number(((analytics.totals.tasksCompleted / analytics.totals.tasksCreated) * 100).toFixed(1))
        : 0;
      const velocity = Number((analytics.totals.tasksCompleted / Math.max(1, windowDays)).toFixed(2));

      return {
        orgId,
        name: orgName,
        createdAt: doc.get('createdAt') || null,
        totals: analytics.totals,
        velocity,
        completionRate,
        sentiment,
        assistantEvents: analytics.totals.assistantEvents || 0,
        meetings: analytics.totals.meetingsCreated || 0,
        highlights: analytics.recentHighlights?.slice(0, 3) || [],
        trend: analytics.series?.tasksCompleted || [],
      };
    }),
  );

  const rankings = {
    velocity: [...orgEntries]
      .sort((a, b) => b.velocity - a.velocity)
      .map(({ orgId, name, velocity }) => ({ orgId, name, velocity })),
    sentiment: [...orgEntries]
      .sort((a, b) => b.sentiment - a.sentiment)
      .map(({ orgId, name, sentiment }) => ({ orgId, name, sentiment })),
    completion: [...orgEntries]
      .sort((a, b) => b.completionRate - a.completionRate)
      .map(({ orgId, name, completionRate }) => ({ orgId, name, completionRate })),
  };

  const digestItems = orgEntries.map((entry) => ({
    type: 'org',
    summary: `${entry.name}: velocity ${entry.velocity} tasks/day, completion ${entry.completionRate}%, sentiment ${entry.sentiment}.`,
  }));

  let aiSummary = '';
  if (digestItems.length) {
    try {
      aiSummary = await generateAIDigest(digestItems, 'weekly');
    } catch (err) {
      console.warn('[analyticsService] AI digest generation failed', err);
      aiSummary = '';
    }
  }

  return {
    range,
    since: since.toISOString(),
    orgs: orgEntries,
    rankings: {
      velocity: rankings.velocity.slice(0, 5),
      sentiment: rankings.sentiment.slice(0, 5),
      completion: rankings.completion.slice(0, 5),
    },
    summary: aiSummary,
  };
}

export default {
  getOrgAnalytics,
  recordTemplateUsage,
  getCrossOrgAnalytics,
};
