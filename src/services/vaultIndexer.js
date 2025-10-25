import admin, { db } from '../../server/firebaseAdmin.js';
import { embedText } from './vaultSearchService.js';

const MAX_TASKS = Number(process.env.VAULT_MAX_TASKS || 300);
const MAX_MEETINGS = Number(process.env.VAULT_MAX_MEETINGS || 150);
const MAX_CHAT_INSIGHTS = Number(process.env.VAULT_MAX_CHAT_INSIGHTS || 300);

function vaultCollection(orgId) {
  return db.collection(`orgs/${orgId}/vault`);
}

async function deleteExistingVault(orgId) {
  const snap = await vaultCollection(orgId).get();
  const deletions = [];
  snap.forEach((doc) => {
    deletions.push(doc.ref.delete());
  });
  if (deletions.length) await Promise.all(deletions);
  return deletions.length;
}

const SAFE_CONTENT_LIMIT = Number(process.env.VAULT_CONTENT_LIMIT || 4000);

function trimPayload(text = '', limit = SAFE_CONTENT_LIMIT) {
  const normalized = (text || '').toString().trim();
  if (!limit || normalized.length <= limit) return normalized;
  return normalized.slice(0, limit);
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createVaultItem({
  orgId,
  type,
  sourceId,
  title,
  content,
  summary,
  metadata,
  createdAt,
  updatedAt,
  createdBy,
}) {
  const trimmedContent = (content || '').trim();
  const trimmedSummary = (summary || '').trim();
  const embedSource = trimPayload(trimmedSummary || trimmedContent || title || '', 1500);
  const embedding = await embedText(embedSource);

  const data = {
    type,
    sourceId,
    title: title || null,
    content: trimPayload(trimmedContent),
    summary: trimPayload(trimmedSummary, 1000),
    metadata: metadata || {},
    embedding: embedding || [],
    createdAt: toDate(createdAt) || new Date(),
    updatedAt: toDate(updatedAt) || toDate(createdAt) || new Date(),
    createdBy: createdBy || null,
    searchText: trimPayload([title, trimmedSummary, trimmedContent].filter(Boolean).join('\n'), 2000),
  };

  const ref = await vaultCollection(orgId).add(data);
  return { id: ref.id, ...data };
}

async function indexTasks({ orgId }) {
  const tasksSnap = await db
    .collection(`orgs/${orgId}/tasks`)
    .orderBy('createdAt', 'desc')
    .limit(MAX_TASKS)
    .get();

  let count = 0;
  for (const doc of tasksSnap.docs) {
    const task = doc.data();
    try {
      await createVaultItem({
        orgId,
        type: 'task',
        sourceId: doc.id,
        title: task.title,
        content: task.description || '',
        summary: `Task ${task.status || 'pending'}${task.projectId ? ` in project ${task.projectId}` : ''}`,
        metadata: {
          status: task.status || null,
          projectId: task.projectId || null,
          assignees: task.assignees || [],
          priority: task.priority || null,
          reporterUid: task.reporterUid || null,
        },
        createdAt: task.createdAt || new Date(),
        updatedAt: task.updatedAt || task.createdAt || new Date(),
        createdBy: task.reporterUid || null,
      });
      count += 1;
    } catch (err) {
      console.error('[vaultIndexer] Failed to index task', { orgId, taskId: doc.id, err });
    }
  }
  return count;
}

async function indexMeetings({ orgId }) {
  const meetingSnap = await db
    .collection(`orgs/${orgId}/meetings`)
    .orderBy('createdAt', 'desc')
    .limit(MAX_MEETINGS)
    .get();

  let count = 0;
  for (const doc of meetingSnap.docs) {
    const meeting = doc.data();
    const transcript = meeting.transcript || '';
    const summary = meeting.summary || '';
    if (!transcript && !summary && !meeting.title) continue;
    try {
      await createVaultItem({
        orgId,
        type: 'meeting',
        sourceId: doc.id,
        title: meeting.title || 'Meeting',
        content: transcript,
        summary,
        metadata: {
          attendees: meeting.attendees || [],
          projectId: meeting.projectId || null,
          lastRecordingId: meeting.lastRecordingId || null,
        },
        createdAt: meeting.createdAt || new Date(),
        updatedAt: meeting.updatedAt || meeting.createdAt || new Date(),
        createdBy: meeting.createdBy || null,
      });
      count += 1;
    } catch (err) {
      console.error('[vaultIndexer] Failed to index meeting', { orgId, meetingId: doc.id, err });
    }
  }
  return count;
}

async function indexChatInsights({ orgId }) {
  const roomsSnap = await db.collection(`orgs/${orgId}/chatRooms`).orderBy('updatedAt', 'desc').limit(100).get();
  let count = 0;
  for (const roomDoc of roomsSnap.docs) {
    const roomId = roomDoc.id;
    const insightsSnap = await db
      .collection(`orgs/${orgId}/chatRooms/${roomId}/insights`)
      .orderBy('createdAt', 'desc')
      .limit(MAX_CHAT_INSIGHTS)
      .get();

    for (const insightDoc of insightsSnap.docs) {
      const insight = insightDoc.data();
      const summary = insight.summary || '';
      const bullets = Array.isArray(insight.bullets) ? insight.bullets.join('\n') : '';
      try {
        await createVaultItem({
          orgId,
          type: 'chat',
          sourceId: `${roomId}:${insightDoc.id}`,
          title: `Chat summary (${roomDoc.data()?.name || roomId})`,
          content: bullets,
          summary,
          metadata: {
            roomId,
            bullets: insight.bullets || [],
            roomName: roomDoc.data()?.name || null,
          },
          createdAt: insight.createdAt || new Date(),
          updatedAt: insight.createdAt || new Date(),
          createdBy: insight.createdBy || insight.authorUid || null,
        });
        count += 1;
      } catch (err) {
        console.error('[vaultIndexer] Failed to index chat insight', {
          orgId,
          roomId,
          insightId: insightDoc.id,
          err,
        });
      }
    }
  }
  return count;
}

export async function rebuildVault({ orgId }) {
  if (!orgId) throw new Error('Missing orgId');
  const deleted = await deleteExistingVault(orgId);
  const [taskCount, meetingCount, chatCount] = await Promise.all([
    indexTasks({ orgId }),
    indexMeetings({ orgId }),
    indexChatInsights({ orgId }),
  ]);

  return {
    deleted,
    taskCount,
    meetingCount,
    chatCount,
  };
}

export default {
  rebuildVault,
};
