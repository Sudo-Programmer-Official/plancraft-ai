import express from 'express';
import admin, { db } from '../../../server/firebaseAdmin.js';

const router = express.Router();

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value != null ? String(value) : null;
}

function extractScope(req) {
  const teamId =
    normalizeParam(req.query.teamId) ??
    normalizeParam(req.body?.teamId) ??
    normalizeParam(req.params?.teamId);

  const projectId =
    normalizeParam(req.query.projectId) ??
    normalizeParam(req.body?.projectId) ??
    normalizeParam(req.params?.projectId);

  return { teamId, projectId };
}

async function ensureTeamAccess(req, res, teamId) {
  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Unauthenticated' });
    return false;
  }

  try {
    const membershipSnap = await db.doc(`orgs/${teamId}/members/${uid}`).get();
    if (!membershipSnap.exists) {
      res.status(403).json({ error: 'Not a team member' });
      return false;
    }
    return true;
  } catch (err) {
    console.error('ensureTeamAccess error', err);
    res.status(500).json({ error: 'Failed to verify membership' });
    return false;
  }
}

function tasksCollection(teamId, projectId) {
  return db.collection(`orgs/${teamId}/projects/${projectId}/tasks`);
}

function normalizeDueDate(value) {
  if (!value) return null;
  if (value instanceof admin.firestore.Timestamp) return value;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return admin.firestore.Timestamp.fromDate(date);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return admin.firestore.Timestamp.fromDate(date);
}

router.get('/', async (req, res) => {
  try {
    const { teamId, projectId } = extractScope(req);
    if (!teamId || !projectId) {
      return res.status(400).json({ error: 'Missing teamId or projectId' });
    }
    const ok = await ensureTeamAccess(req, res, teamId);
    if (!ok) return;

    const status = normalizeParam(req.query.status);
    const assignedTo = normalizeParam(req.query.assignedTo);

    let ref = tasksCollection(teamId, projectId);
    if (status) ref = ref.where('status', '==', status);
    if (assignedTo) ref = ref.where('assignedTo', '==', assignedTo);
    ref = ref.orderBy('createdAt', 'desc');

    const snap = await ref.limit(200).get();
    const tasks = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(tasks);
  } catch (err) {
    console.error('GET /api/tasks error', err);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { teamId, projectId } = extractScope(req);
    if (!teamId || !projectId) {
      return res.status(400).json({ error: 'Missing teamId or projectId' });
    }
    const ok = await ensureTeamAccess(req, res, teamId);
    if (!ok) return;

    const {
      title,
      description = '',
      status = 'pending',
      assignedTo = null,
      dueDate = null,
      voiceNoteUrl = null,
      metadata = {},
      progress = null,
      lastNote = null,
    } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Missing task title' });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const docData = {
      title: title.trim(),
      description: description || '',
      status: status === 'completed' ? 'completed' : 'pending',
      assignedTo: assignedTo || null,
      dueDate: normalizeDueDate(dueDate),
      voiceNoteUrl: voiceNoteUrl || null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      createdAt: now,
      updatedAt: now,
      createdBy: req.user?.uid || null,
      projectId,
      teamId,
      progress: typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : null,
      lastNote: lastNote || null,
      lastUpdateAt: now,
      lastUpdatedBy: req.user?.uid || null,
    };

    const ref = await tasksCollection(teamId, projectId).add(docData);
    const written = await ref.get();
    res.json({ id: ref.id, ...written.data() });
  } catch (err) {
    console.error('POST /api/tasks error', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:taskId', async (req, res) => {
  try {
    const { teamId, projectId } = extractScope(req);
    const { taskId } = req.params;
    if (!teamId || !projectId || !taskId) {
      return res.status(400).json({ error: 'Missing teamId, projectId, or taskId' });
    }
    const ok = await ensureTeamAccess(req, res, teamId);
    if (!ok) return;

    const allowed = [
      'title',
      'description',
      'status',
      'assignedTo',
      'dueDate',
      'voiceNoteUrl',
      'metadata',
      'progress',
      'lastNote',
    ];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    if (updates.status) {
      updates.status = updates.status === 'completed' ? 'completed' : 'pending';
    }
    if (updates.dueDate !== undefined) {
      updates.dueDate = normalizeDueDate(updates.dueDate);
    }
    if (updates.metadata && typeof updates.metadata !== 'object') {
      delete updates.metadata;
    }
    if (updates.progress !== undefined && typeof updates.progress === 'number') {
      updates.progress = Math.min(100, Math.max(0, updates.progress));
    }
    if (updates.lastNote !== undefined && !updates.lastNote) {
      updates.lastNote = null;
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    updates.lastUpdateAt = admin.firestore.FieldValue.serverTimestamp();
    updates.lastUpdatedBy = req.user?.uid || null;
    if (Object.keys(updates).length <= 1) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const ref = tasksCollection(teamId, projectId).doc(taskId);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await ref.update(updates);
    const fresh = await ref.get();

    try {
      const shouldLog =
        Object.prototype.hasOwnProperty.call(updates, 'status') ||
        Object.prototype.hasOwnProperty.call(updates, 'progress') ||
        Object.prototype.hasOwnProperty.call(updates, 'lastNote');
      if (shouldLog) {
        await ref.collection('updates').add({
          status: updates.status ?? fresh.get('status') ?? null,
          progress: updates.progress ?? fresh.get('progress') ?? null,
          note: updates.lastNote ?? null,
          uid: req.user?.uid || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (logErr) {
      console.warn('[teamTaskRouter] failed to record task update log', logErr);
    }

    res.json({ id: taskId, ...fresh.data() });
  } catch (err) {
    console.error('PATCH /api/tasks/:taskId error', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:taskId', async (req, res) => {
  try {
    const { teamId, projectId } = extractScope(req);
    const { taskId } = req.params;
    if (!teamId || !projectId || !taskId) {
      return res.status(400).json({ error: 'Missing teamId, projectId, or taskId' });
    }
    const ok = await ensureTeamAccess(req, res, teamId);
    if (!ok) return;

    await tasksCollection(teamId, projectId).doc(taskId).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/tasks/:taskId error', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
