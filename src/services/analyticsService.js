import { db } from '../../server/firebaseAdmin.js';

const RANGE_WINDOW_DAYS = {
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
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

export default {
  getOrgAnalytics,
};
