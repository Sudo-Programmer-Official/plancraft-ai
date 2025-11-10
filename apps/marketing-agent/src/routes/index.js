const express = require('express');
const { randomUUID } = require('crypto');

const channels = require('../channels');
const { requireApiKey } = require('../utils/auth');
const logger = require('../utils/logger');
const { enqueuePostJob, scheduleCampaignJobs } = require('../scheduler');
const { getFirestore } = require('../config');
const { trackMetrics } = require('../analytics/trackMetrics');

const router = express.Router();
const firestore = () => getFirestore();

router.post('/post', requireApiKey, async (req, res) => {
  const {
    platform,
    message,
    mediaUrl,
    targetGroups,
    flair,
    tags,
    subreddit,
    scheduleAt,
  } = req.body;

  if (!platform || !message) {
    return res.status(400).json({ error: 'platform and message are required' });
  }

  const handler = channels[platform];
  if (!handler) {
    return res.status(400).json({ error: `Unsupported platform ${platform}` });
  }

  const payload = { message, mediaUrl, targetGroups, flair, tags, subreddit };

  if (scheduleAt) {
    const delay = Math.max(new Date(scheduleAt).getTime() - Date.now(), 0);
    await enqueuePostJob({ platform, payload, delay });
    return res.json({ status: 'queued', platform });
  }

  try {
    const result = await handler.postMessage(payload);
    return res.json({ status: 'sent', platform, result });
  } catch (err) {
    logger.error('Immediate post failed', { platform, error: err.message });
    return res.status(500).json({ error: 'Failed to deliver post', details: err.message });
  }
});

router.post('/campaign', requireApiKey, async (req, res) => {
  const { name, description, steps = [] } = req.body;
  if (!name || !steps.length) {
    return res.status(400).json({ error: 'name and at least one step are required' });
  }

  const campaignId = randomUUID();
  const payload = {
    id: campaignId,
    name,
    description,
    steps,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };

  await firestore().collection('campaigns').doc(campaignId).set(payload);
  await scheduleCampaignJobs({ campaignId, steps });

  res.json({ status: 'scheduled', campaignId });
});

router.get('/stats', requireApiKey, async (_req, res) => {
  const snapshot = await firestore()
    .collection('marketing_logs')
    .orderBy('timestamp', 'desc')
    .limit(50)
    .get();

  const logs = snapshot.docs.map((doc) => doc.data());
  const summary = logs.reduce((acc, log) => {
    acc[log.platform] = acc[log.platform] || { total: 0, ok: 0, failed: 0 };
    acc[log.platform].total += 1;
    if (log.status === 'success' || log.status === 'queued') {
      acc[log.platform].ok += 1;
    } else {
      acc[log.platform].failed += 1;
    }
    return acc;
  }, {});

  res.json({ logs, summary });
});

router.post('/test', requireApiKey, async (_req, res) => {
  const timestamp = new Date().toISOString();
  const results = await Promise.all(
    Object.keys(channels).map(async (platform) => {
      try {
        await logger.logMarketingEvent({
          platform,
          message: `Test ping @ ${timestamp}`,
          status: 'test',
        });
        const engagement = await trackMetrics(platform, { test: true });
        return { platform, status: 'ok', engagement };
      } catch (err) {
        logger.error('Test log failed', { platform, error: err.message });
        return { platform, status: 'error', error: err.message };
      }
    }),
  );

  res.json({ status: 'complete', results });
});

router.post('/whatsapp/webhook', async (req, res) => {
  logger.info('WhatsApp webhook received', { payload: req.body });
  res.json({ status: 'received' });
});

module.exports = router;
