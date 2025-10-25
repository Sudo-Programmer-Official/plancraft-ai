import express from 'express';
import withOrgAuth from '../orgs/middlewares/withOrgAuth.js';
import {
  getWeeklyPulse,
  getWeeklyPulseWithAudio,
  coachResponse,
} from '../../services/teamPulseService.js';

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

router.get('/projects/:projectId/pulse/weekly', async (req, res) => {
  try {
    const { orgId, projectId } = req.params;
    const includeAudio = (req.query.audio || '').toString().toLowerCase() === 'true';

    const data = includeAudio
      ? await getWeeklyPulseWithAudio({ orgId, projectId })
      : await getWeeklyPulse({ orgId, projectId });

    res.json(data);
  } catch (err) {
    console.error('GET /pulse/weekly error', err);
    res.status(500).json({ error: 'Failed to load weekly pulse' });
  }
});

router.post('/projects/:projectId/pulse/coach', async (req, res) => {
  try {
    const { orgId, projectId } = req.params;
    const { prompt, summary } = req.body || {};

    const response = await coachResponse({ orgId, projectId, prompt, summary });
    res.json(response);
  } catch (err) {
    console.error('POST /pulse/coach error', err);
    res.status(500).json({ error: 'Failed to generate coach response' });
  }
});

export default router;
