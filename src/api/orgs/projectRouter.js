import express from 'express';
import { db } from '../../../server/firebaseAdmin.js';
import withOrgAuth from './middlewares/withOrgAuth.js';

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

// Load all projects for an org
router.get('/', async (req, res) => {
  try {
    const { orgId } = req.params;
    const snap = await db.collection(`orgs/${orgId}/projects`).orderBy('createdAt', 'desc').get();
    const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(projects);
  } catch (err) {
    console.error('GET /api/orgs/:orgId/projects error', err);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

// Create a project
router.post('/', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, key, status = 'active', leadUid = null, defaultAssignees = [] } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Missing project name' });

    const now = new Date();
    const data = {
      name,
      key: key || name.slice(0, 3).toUpperCase(),
      status,
      leadUid,
      defaultAssignees,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection(`orgs/${orgId}/projects`).add(data);
    res.json({ id: ref.id, ...data });
  } catch (err) {
    console.error('POST /api/orgs/:orgId/projects error', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update a project
router.patch('/:projectId', async (req, res) => {
  try {
    const { orgId, projectId } = req.params;
    const updates = { ...req.body, updatedAt: new Date() };
    const ref = db.doc(`orgs/${orgId}/projects/${projectId}`);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Project not found' });

    await ref.update(updates);
    res.json({ id: projectId, ...snap.data(), ...updates });
  } catch (err) {
    console.error('PATCH /api/orgs/:orgId/projects/:projectId error', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Archive/delete a project
router.delete('/:projectId', async (req, res) => {
  try {
    const { orgId, projectId } = req.params;
    await db.doc(`orgs/${orgId}/projects/${projectId}`).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/orgs/:orgId/projects/:projectId error', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
