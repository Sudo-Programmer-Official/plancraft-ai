// import express from 'express';
// import { db } from '../../../server/firebaseAdmin.js';
// import withOrgAuth from './middlewares/withOrgAuth.js';
// import { voiceToTasks } from '../../services/voiceOrchestrator.js';

// const router = express.Router({ mergeParams: true });

// router.use(withOrgAuth);

// router.get('/logs', async (req, res) => {
//   try {
//     const { orgId } = req.params;
//     const { limit: rawLimit, cursor, event, status, ruleId } = req.query;

//     let limit = parseInt(rawLimit, 10);
//     if (Number.isNaN(limit) || limit <= 0) limit = 20;
//     limit = Math.min(limit, 50);

//     let ref = db.collection(`orgs/${orgId}/automationLogs`).orderBy('createdAt', 'desc');
//     if (event) ref = ref.where('event', '==', event);
//     if (status) ref = ref.where('status', '==', status);
//     if (ruleId) ref = ref.where('ruleId', '==', ruleId);

//     if (cursor) {
//       const cursorRef = await db.doc(`orgs/${orgId}/automationLogs/${cursor}`).get();
//       if (cursorRef.exists) {
//         ref = ref.startAfter(cursorRef);
//       }
//     }

//     const snap = await ref.limit(limit).get();
//     const logs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
//     const last = snap.docs[snap.docs.length - 1];
//     res.json({ items: logs, nextCursor: last ? last.id : null });
//   } catch (err) {
//     console.error('GET /api/orgs/:orgId/automation/logs error', err);
//     res.status(500).json({ error: 'Failed to load automation logs' });
//   }
// });

// router.post('/rules/dry-run', async (req, res) => {
//   try {
//     const { orgId } = req.params;
//     const { event = 'meeting.transcript_ready', payload = {} } = req.body || {};

//     if (event !== 'meeting.transcript_ready') {
//       return res.status(400).json({ error: 'Unsupported event for dry-run' });
//     }

//     const { transcript, summary } = payload;
//     if (!transcript && !summary) {
//       return res.status(400).json({ error: 'Transcript or summary required' });
//     }

//     const tasks = await voiceToTasks({ transcript, summary, orgId });
//     res.json({ tasks });
//   } catch (err) {
//     console.error('POST /api/orgs/:orgId/automation/rules/dry-run error', err);
//     res.status(500).json({ error: 'Dry-run failed' });
//   }
// });

// export default router;

import express from "express";
import { db } from "../../../server/firebaseAdmin.js";
import withOrgAuth from "./middlewares/withOrgAuth.js";
import { voiceToTasks } from "../../services/voiceOrchestrator.js";

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

/* ──────────────────────────────────────────────
 * GET /api/orgs/:orgId/automation/logs
 * List automation logs with filters and pagination
 * ────────────────────────────────────────────── */
router.get("/logs", async (req, res) => {
  try {
    const { orgId } = req.params;
    const { limit: rawLimit, cursor, event, status, ruleId } = req.query;

    // Clamp limit between 1–50
    let limit = parseInt(rawLimit, 10);
    if (Number.isNaN(limit) || limit <= 0) limit = 20;
    limit = Math.min(limit, 50);

    let ref = db
      .collection(`orgs/${orgId}/automationLogs`)
      .orderBy("createdAt", "desc");

    if (event) ref = ref.where("event", "==", event);
    if (status) ref = ref.where("status", "==", status);
    if (ruleId) ref = ref.where("ruleId", "==", ruleId);

    if (cursor) {
      const cursorDoc = await db
        .doc(`orgs/${orgId}/automationLogs/${cursor}`)
        .get();
      if (cursorDoc.exists) {
        ref = ref.startAfter(cursorDoc);
      }
    }

    const snap = await ref.limit(limit).get();
    const logs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const nextCursor =
      snap.size === limit ? snap.docs[snap.docs.length - 1].id : null;

    res.json({ items: logs, nextCursor });
  } catch (err) {
    console.error("❌ GET /api/orgs/:orgId/automation/logs error:", err);
    res.status(500).json({ error: "Failed to load automation logs" });
  }
});

/* ──────────────────────────────────────────────
 * POST /api/orgs/:orgId/automation/rules/dry-run
 * Simulate an automation rule (AI dry-run)
 * ────────────────────────────────────────────── */
router.post("/rules/dry-run", async (req, res) => {
  try {
    const { orgId } = req.params;
    const { event = "meeting.transcript_ready", payload = {} } = req.body || {};

    if (event !== "meeting.transcript_ready") {
      return res.status(400).json({ error: "Unsupported event for dry-run" });
    }

    const { transcript, summary } = payload;
    if (!transcript && !summary) {
      return res
        .status(400)
        .json({ error: "Transcript or summary required for dry-run" });
    }

    const tasks = await voiceToTasks({ transcript, summary, orgId });

    res.status(201).json({ ok: true, event, generatedTasks: tasks });
  } catch (err) {
    console.error(
      "❌ POST /api/orgs/:orgId/automation/rules/dry-run error:",
      err
    );
    res.status(500).json({ error: "Dry-run failed" });
  }
});

export default router;