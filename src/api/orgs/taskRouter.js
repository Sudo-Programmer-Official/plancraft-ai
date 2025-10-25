import express from 'express';
import { db } from '../../../server/firebaseAdmin.js';
import withOrgAuth from './middlewares/withOrgAuth.js';
import { notifyTaskEvent } from '../../services/notifierService.js';

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

// List tasks (filterable)
router.get('/', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { projectId, boardId, status, assignee } = req.query;

    let ref = db.collection(`orgs/${orgId}/tasks`).orderBy('createdAt', 'desc');
    if (projectId) ref = ref.where('projectId', '==', projectId);
    if (boardId) ref = ref.where('boardId', '==', boardId);
    if (status) ref = ref.where('status', '==', status);
    if (assignee) ref = ref.where('assignees', 'array-contains', assignee);

    const snap = await ref.limit(200).get();
    const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(tasks);
  } catch (err) {
    console.error('GET /api/orgs/:orgId/tasks error', err);
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const { orgId } = req.params;
    const {
      title,
      description = '',
      status = 'todo',
      priority = 'medium',
      projectId = null,
      boardId = null,
      column = null,
      assignees = [],
      reporterUid = req.user?.uid || null,
      due = null,
      effort = null,
      source = 'manual',
    } = req.body || {};

    if (!title) return res.status(400).json({ error: 'Missing task title' });

    const now = new Date();
    const data = {
      title,
      description,
      status,
      priority,
      projectId,
      boardId,
      column,
      assignees,
      reporterUid,
      due,
      effort,
      source,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection(`orgs/${orgId}/tasks`).add(data);
    res.json({ id: ref.id, ...data });

    notifyTaskEvent({
      orgId,
      taskId: ref.id,
      title: `${req.user?.name || 'A teammate'} created a task`,
      body: title,
      performerUid: req.user?.uid || null,
    }).catch((err) => console.warn('[notify] task.create failed:', err));
  } catch (err) {
    console.error('POST /api/orgs/:orgId/tasks error', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.patch('/:taskId', async (req, res) => {
  try {
    const { orgId, taskId } = req.params;
    const updates = { ...req.body, updatedAt: new Date() };
    const ref = db.doc(`orgs/${orgId}/tasks/${taskId}`);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Task not found' });

    await ref.update(updates);
    const updated = { id: taskId, ...snap.data(), ...updates };
    res.json(updated);

    const taskTitle = updated.title || snap.get('title') || 'Task';
    const status = updates.status || snap.get('status') || null;

    notifyTaskEvent({
      orgId,
      taskId,
      title: `${req.user?.name || 'Task update'}`,
      body: status ? `${taskTitle} → ${status}` : `${taskTitle} updated`,
      performerUid: req.user?.uid || null,
    }).catch((err) => console.warn('[notify] task.update failed:', err));
  } catch (err) {
    console.error('PATCH /api/orgs/:orgId/tasks/:taskId error', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:taskId', async (req, res) => {
  try {
    const { orgId, taskId } = req.params;
    await db.doc(`orgs/${orgId}/tasks/${taskId}`).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/orgs/:orgId/tasks/:taskId error', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
