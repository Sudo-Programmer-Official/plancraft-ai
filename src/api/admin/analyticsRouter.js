// import express from 'express'
// import { db } from '../../../server/firebaseAdmin.js'
// import { getCrossOrgAnalytics } from '../../services/analyticsService.js'

// const router = express.Router()

// async function ensurePlatformAdmin(req, res, next) {
//   try {
//     const uid = req.user?.uid
//     if (!uid) return res.status(401).json({ error: 'Unauthenticated' })
//     const userSnap = await db.doc(`users/${uid}`).get()
//     const role = userSnap.get('role') || 'user'
//     if (role !== 'admin') {
//       return res.status(403).json({ error: 'Admin access required' })
//     }
//     req.adminProfile = { uid, ...userSnap.data() }
//     next()
//   } catch (err) {
//     console.error('ensurePlatformAdmin error', err)
//     res.status(500).json({ error: 'Admin auth check failed' })
//   }
// }

// router.use(ensurePlatformAdmin)

// router.get('/', async (req, res) => {
//   try {
//     const range = typeof req.query.range === 'string' ? req.query.range : '30d'
//     const limit = Number(req.query.limit || 10)
//     const analytics = await getCrossOrgAnalytics({ range, limit: Number.isFinite(limit) ? limit : 10 })
//     res.json(analytics)
//   } catch (err) {
//     console.error('GET /api/admin/analytics error', err)
//     res.status(500).json({ error: 'Failed to load cross-org analytics' })
//   }
// })

// export default router

import express from "express";
import { db } from "../../../server/firebaseAdmin.js";
import { getCrossOrgAnalytics } from "../../services/analyticsService.js";

const router = express.Router();

/* ──────────────────────────────────────────────
 * Admin Auth Middleware
 * Ensures the user is a platform-level admin
 * ────────────────────────────────────────────── */
const adminCache = new Map(); // Optional caching to reduce reads
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function ensurePlatformAdmin(req, res, next) {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    const cached = adminCache.get(uid);
    if (cached && cached.expires > Date.now()) {
      req.adminProfile = cached.data;
      return next();
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const role = String(userSnap.get("role") || "user").toLowerCase();
    if (role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const profile = { uid, ...userSnap.data() };
    req.adminProfile = profile;

    adminCache.set(uid, { data: profile, expires: Date.now() + CACHE_TTL });

    next();
  } catch (err) {
    console.error("❌ ensurePlatformAdmin error:", err);
    res.status(500).json({ error: "Admin auth check failed" });
  }
}

router.use(ensurePlatformAdmin);

/* ──────────────────────────────────────────────
 * GET /api/admin/analytics
 * Returns platform-wide analytics summary
 * ────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const rawRange = typeof req.query.range === "string" ? req.query.range : "30d";
    const range = rawRange.trim().toLowerCase() || "30d";

    const rawLimit = Number(req.query.limit || 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;

    const analytics = await getCrossOrgAnalytics({ range, limit });
    res.json(analytics);
  } catch (err) {
    console.error("❌ GET /api/admin/analytics error:", err);
    res.status(500).json({ error: "Failed to load cross-org analytics" });
  }
});

export default router;
