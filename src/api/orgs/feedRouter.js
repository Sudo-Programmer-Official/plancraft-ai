import express from 'express';
import withOrgAuth from './middlewares/withOrgAuth.js';
import { getOrgFeed, generateOrgDigest } from '../../services/feedService.js';

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

/**
 * GET  /api/orgs/:orgId/feed
 * Returns latest aggregated Vault events (tasks, meetings, chats)
 */
router.get('/', async (req, res) => {
  try {
    const { orgId } = req.params;
    const filter = typeof req.query.filter === 'string' ? req.query.filter : 'all';
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    const result = await getOrgFeed(orgId, { filter, cursor });
    res.json(result);
  } catch (err) {
    console.error('GET /api/orgs/:orgId/feed error', err);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

/**
 * GET  /api/orgs/:orgId/feed/digest
 * Generates AI weekly digest summary
 */
router.get('/digest', async (req, res) => {
  try {
    const { orgId } = req.params;
    const period = typeof req.query.period === 'string' ? req.query.period : 'weekly';
    const digest = await generateOrgDigest(orgId, period);
    res.json(digest);
  } catch (err) {
    console.error('GET /api/orgs/:orgId/feed/digest error', err);
    res.status(500).json({ error: 'Failed to generate digest' });
  }
});

export default router;
