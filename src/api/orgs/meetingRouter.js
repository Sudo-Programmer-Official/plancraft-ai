import express from 'express';
import { randomUUID } from 'crypto';
import admin, { db } from '../../../server/firebaseAdmin.js';
import withOrgAuth from './middlewares/withOrgAuth.js';
import { scheduleAutomation } from '../../services/automationEngine.js';
import { voiceToTasks } from '../../services/voiceOrchestrator.js';
import { transcribeAudioBuffer } from '../../services/transcriptionService.js';

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

function decodeBase64Audio({ data, mimeType }) {
  if (!data) return null;
  let base64 = data;
  let detectedMime = mimeType;
  if (data.startsWith('data:')) {
    const [, meta, payload] = data.match(/^data:(.*?);base64,(.*)$/) || [];
    if (!payload) return null;
    base64 = payload;
    if (!mimeType && meta) detectedMime = meta;
  }
  try {
    const buffer = Buffer.from(base64, 'base64');
    return { buffer, mimeType: detectedMime || 'audio/webm' };
  } catch (err) {
    console.error('Failed to decode base64 audio', err);
    return null;
  }
}

function inferExtension(mimeType = 'audio/webm') {
  const normalized = mimeType.split(';')[0];
  const map = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
  };
  return map[normalized] || 'webm';
}

async function createTasksFromTranscript({ orgId, projectId, tasks = [], uid, meetingId, recordingId }) {
  if (!projectId || !tasks.length) return [];
  const now = new Date();
  const created = [];
  const col = db.collection(`orgs/${orgId}/projects/${projectId}/tasks`);
  for (const task of tasks) {
    const data = {
      title: task.title || 'Untitled task',
      description: task.description || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      assignedTo: Array.isArray(task.assignees) ? task.assignees[0] || null : task.assignedTo || null,
      assignees: Array.isArray(task.assignees) ? task.assignees : task.assignees ? [task.assignees] : [],
      progress: task.progress ?? null,
      dueDate: task.due ? new Date(task.due) : null,
      source: 'meeting',
      metadata: {
        meetingId,
        recordingId: recordingId || null,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: uid || null,
    };
    const ref = await col.add(data);
    created.push({ id: ref.id, ...data });
  }
  return created;
}

// Ingest meeting metadata (calendar sync or manual)
router.post('/ingest', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { externalId, title, startAt, endAt, attendees = [], notes = '', projectId = null } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Missing meeting title' });

    const now = new Date();
    const meeting = {
      title,
      externalId: externalId || null,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      attendees,
      notes,
      projectId: projectId || null,
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

router.post('/:meetingId/recordings', async (req, res) => {
  try {
    const { orgId, meetingId } = req.params;
    const { audio, projectId = null, autoTranscribe = true, prompt = '' } = req.body || {};
    if (!audio?.data) return res.status(400).json({ error: 'Missing audio payload' });

    const decoded = decodeBase64Audio({ data: audio.data, mimeType: audio.mimeType });
    if (!decoded) return res.status(400).json({ error: 'Invalid audio data' });

    const meetingRef = db.doc(`orgs/${orgId}/meetings/${meetingId}`);
    const meetingSnap = await meetingRef.get();
    if (!meetingSnap.exists) return res.status(404).json({ error: 'Meeting not found' });

    const recordingId = randomUUID();
    const ext = inferExtension(decoded.mimeType);
    const filePath = `orgs/${orgId}/meetings/${meetingId}/recordings/${recordingId}.${ext}`;

    try {
      await admin.storage().bucket().file(filePath).save(decoded.buffer, {
        contentType: decoded.mimeType || 'audio/webm',
        metadata: { meetingId, orgId },
      });
    } catch (err) {
      console.error('Failed to upload recording', err);
      return res.status(500).json({ error: 'Failed to store recording' });
    }

    const recordingMeta = {
      recordingId,
      path: filePath,
      mimeType: decoded.mimeType,
      projectId: projectId || meetingSnap.get('projectId') || null,
      status: autoTranscribe ? 'processing' : 'uploaded',
      createdAt: new Date(),
      createdBy: req.user?.uid || null,
    };

    const recordingRef = db.doc(`orgs/${orgId}/meetings/${meetingId}/recordings/${recordingId}`);
    await recordingRef.set(recordingMeta);

    let transcriptText = '';
    let summary = null;
    let createdTasks = [];

    if (autoTranscribe) {
      const transcription = await transcribeAudioBuffer({ buffer: decoded.buffer, mimeType: decoded.mimeType, prompt });
      transcriptText = transcription?.text || '';
      summary = transcription?.summary || null;

      const tasks = await voiceToTasks({ transcript: transcriptText, summary, orgId });
      const targetProjectId = projectId || meetingSnap.get('projectId') || null;
      createdTasks = await createTasksFromTranscript({
        orgId,
        projectId: targetProjectId,
        tasks,
        uid: req.user?.uid || null,
        meetingId,
        recordingId,
      });

      const updates = {
        transcript: transcriptText || null,
        summary: summary || null,
        transcriptReady: !!transcriptText,
        transcriptAt: transcriptText ? new Date() : null,
        updatedAt: new Date(),
        generatedTaskPreview: tasks.map((task) => ({
          title: task.title,
          status: task.status,
          priority: task.priority,
        })),
        lastRecordingId: recordingId,
      };

      await meetingRef.set(updates, { merge: true });

      await recordingRef.set(
        {
          status: transcriptText ? 'completed' : 'uploaded',
          transcriptChars: transcriptText.length,
          summary,
          completedAt: transcriptText ? new Date() : null,
        },
        { merge: true },
      );

      if (transcriptText) {
        scheduleAutomation({
          orgId,
          event: 'meeting.transcript_ready',
          payload: { meetingId, transcript: transcriptText, summary, tasks, recordingId },
        });
      }
    }

    res.json({
      recordingId,
      path: filePath,
      transcript: transcriptText,
      summary,
      tasks: createdTasks,
      status: autoTranscribe ? (transcriptText ? 'completed' : 'processing') : 'uploaded',
    });
  } catch (err) {
    console.error('POST /api/orgs/:orgId/meetings/:meetingId/recordings error', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to process recording' });
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
