// import express from 'express';
// import withOrgAuth from './middlewares/withOrgAuth.js';
// import { getOrgAnalytics } from '../../services/analyticsService.js';

// const router = express.Router({ mergeParams: true });

// router.use(withOrgAuth);

// router.get('/', async (req, res) => {
//   try {
//     const { orgId } = req.params;
//     const range = typeof req.query.range === 'string' ? req.query.range : '7d';
//     const analytics = await getOrgAnalytics({ orgId, range });
//     res.json(analytics);
//   } catch (err) {
//     console.error('GET /api/orgs/:orgId/analytics error', err);
//     res.status(500).json({ error: 'Failed to load analytics' });
//   }
// });

// export default router;
import express from "express";
import withOrgAuth from "./middlewares/withOrgAuth.js";
import { getOrgAnalytics } from "../../services/analyticsService.js";

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

/* ──────────────────────────────────────────────
 * GET /api/orgs/:orgId/analytics
 * Fetch organization analytics over a given range
 * ────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const { orgId } = req.params;
    const rawRange = typeof req.query.range === "string" ? req.query.range : "7d";
    const range = rawRange.toLowerCase().trim() || "7d";

    const analytics = await getOrgAnalytics({ orgId, range });

    res.json(analytics);
  } catch (err) {
    console.error("❌ GET /api/orgs/:orgId/analytics error:", err);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
