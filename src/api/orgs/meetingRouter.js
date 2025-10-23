import express from 'express';
import { db } from '../../../server/firebaseAdmin.js';
import withOrgAuth from './middlewares/withOrgAuth.js';
import { scheduleAutomation } from '../../services/automationEngine.js';
import { voiceToTasks } from '../../services/voiceOrchestrator.js';

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

// Ingest meeting metadata (calendar sync or manual)
router.post('/ingest', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { externalId, title, startAt, endAt, attendees = [], notes = '' } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Missing meeting title' });

    const now = new Date();
    const meeting = {
      title,
      externalId: externalId || null,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      attendees,
      notes,
      transcriptReady: false,
      createdAt: now,
      updatedAt: now,
      createdBy: req.user?.uid || null,
    };

    const ref = await db.collection(`orgs/${orgId}/meetings`).add(meeting);

    // Schedule automation hook (Phase 3 rule: meeting.ingested)
    scheduleAutomation({
      orgId,
      event: 'meeting.ingested',
      payload: { meetingId: ref.id, meeting },
    });

    res.json({ id: ref.id, ...meeting });
  } catch (err) {
    console.error('POST /api/orgs/:orgId/meetings/ingest error', err);
    res.status(500).json({ error: 'Failed to ingest meeting' });
  }
});

// Attach transcript blob or text
router.post('/:meetingId/transcript', async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;
    const { transcript = '', summary = '' } = req.body || {};
    const dryRun = String(req.query.dryRun || 'false').toLowerCase() === 'true';
    if (!transcript && !summary) return res.status(400).json({ error: 'Missing transcript or summary' });

    const meetingRef = db.doc(`orgs/${orgId}/meetings/${meetingId}`);
    const snap = await meetingRef.get();
    if (!snap.exists) return res.status(404).json({ error: 'Meeting not found' });

    const tasks = await voiceToTasks({ transcript, summary, orgId });

    if (dryRun) {
      return res.json({ tasks });
    }

    const updates = {
      transcript: transcript || null,
      summary: summary || null,
      transcriptReady: true,
      transcriptAt: new Date(),
      updatedAt: new Date(),
      generatedTaskPreview: tasks.map((task) => ({
        title: task.title,
        status: task.status,
        priority: task.priority,
      })),
    };

    await meetingRef.update(updates);

    scheduleAutomation({
      orgId,
      event: 'meeting.transcript_ready',
      payload: { meetingId, transcript, summary, tasks },
    });

    res.json({ id: meetingId, ...snap.data(), ...updates, tasks });
  } catch (err) {
    console.error('POST /api/orgs/:orgId/meetings/:meetingId/transcript error', err);
    res.status(500).json({ error: 'Failed to attach transcript' });
  }
});

// Simple listing for audits/testing
router.get('/', async (req, res) => {
  try {
    const { orgId } = req.params;
    const snap = await db.collection(`orgs/${orgId}/meetings`).orderBy('createdAt', 'desc').limit(50).get();
    const meetings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(meetings);
  } catch (err) {
    console.error('GET /api/orgs/:orgId/meetings error', err);
    res.status(500).json({ error: 'Failed to list meetings' });
  }
});

export default router;
