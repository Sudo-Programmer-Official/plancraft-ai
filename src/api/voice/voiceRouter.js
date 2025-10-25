import express from 'express';
import { handleVoiceCommand, handleVoiceQuery } from '../../services/voiceCommandService.js';

const router = express.Router();

router.post('/command', async (req, res) => {
  try {
    const { text, orgId, projectId, uid } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Missing text' });
    if (!orgId || !projectId) return res.status(400).json({ error: 'Missing orgId or projectId' });

    const result = await handleVoiceCommand({ text, orgId, projectId, uid: uid || req.user?.uid });
    res.json(result);
  } catch (err) {
    console.error('POST /api/voice/command error', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to process voice command' });
  }
});

router.post('/query', async (req, res) => {
  try {
    const { text, orgId, projectId } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Missing text' });
    if (!orgId || !projectId) return res.status(400).json({ error: 'Missing orgId or projectId' });

    const result = await handleVoiceQuery({ text, orgId, projectId });
    res.json(result);
  } catch (err) {
    console.error('POST /api/voice/query error', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to process voice query' });
  }
});

export default router;
