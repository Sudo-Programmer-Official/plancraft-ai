import { db } from '../../server/firebaseAdmin.js';

function normalize(text = '') {
  return String(text || '').toLowerCase();
}

export async function searchOrgInsights({ orgId, query, limit = 20 }) {
  const needle = normalize(query);
  if (!needle) return { results: [] };

  const results = [];

  // Search chat messages (latest 50 per room)
  const roomsSnap = await db.collection(`orgs/${orgId}/chatRooms`).limit(20).get();
  const roomIds = roomsSnap.docs.map((doc) => doc.id);
  for (const roomId of roomIds) {
    const msgSnap = await db
      .collection(`orgs/${orgId}/chatRooms/${roomId}/messages`)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    msgSnap.forEach((doc) => {
      const data = doc.data();
      if (normalize(data.text).includes(needle)) {
        results.push({
          type: 'chat',
          roomId,
          id: doc.id,
          text: data.text,
          createdAt: data.createdAt,
          senderName: data.senderName || data.senderUid || 'User',
        });
      }
    });
  }

  // Search tasks
  const taskSnap = await db.collection(`orgs/${orgId}/tasks`).orderBy('createdAt', 'desc').limit(100).get();
  taskSnap.forEach((doc) => {
    const data = doc.data();
    if (normalize(data.title).includes(needle) || normalize(data.description).includes(needle)) {
      results.push({
        type: 'task',
        id: doc.id,
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        createdAt: data.createdAt,
      });
    }
  });

  // Search meeting transcripts
  const meetingSnap = await db.collection(`orgs/${orgId}/meetings`).orderBy('createdAt', 'desc').limit(50).get();
  meetingSnap.forEach((doc) => {
    const data = doc.data();
    if (normalize(data.summary).includes(needle) || normalize(data.transcript).includes(needle)) {
      results.push({
        type: 'meeting',
        id: doc.id,
        title: data.title,
        summary: data.summary,
        createdAt: data.createdAt,
      });
    }
  });

  return {
    results: results.slice(0, limit),
  };
}

export default searchOrgInsights;
