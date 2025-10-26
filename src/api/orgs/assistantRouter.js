// import express from 'express';
// import { db } from '../../../server/firebaseAdmin.js';
// import withOrgAuth from './middlewares/withOrgAuth.js';
// import { analyzeAssistantIntent, runAssistant } from '../../services/assistantService.js';

// const router = express.Router({ mergeParams: true });

// const RATE_WINDOW = Number(process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS || 60_000);
// const RATE_MAX = Number(process.env.ASSISTANT_RATE_LIMIT_MAX || 30);

// function createRateLimiter({ windowMs, max }) {
//   const buckets = new Map();
//   return (req, res, next) => {
//     const key = req.user?.uid || req.ip || 'anonymous';
//     const now = Date.now();
//     const entry = buckets.get(key) || { count: 0, resetAt: now + windowMs };
//     if (now > entry.resetAt) {
//       entry.count = 0;
//       entry.resetAt = now + windowMs;
//     }
//     entry.count += 1;
//     buckets.set(key, entry);
//     if (entry.count > max) {
//       const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
//       res.set('Retry-After', retryAfterSec);
//       return res.status(429).json({ error: 'Assistant rate limit exceeded. Try again shortly.' });
//     }
//     next();
//   };
// }

// const assistantLimiter = createRateLimiter({ windowMs: RATE_WINDOW, max: RATE_MAX });

// const featureCache = new Map(); // Map<orgId, { enabled: boolean, expires: number }>
// const FEATURE_TTL = 5 * 60 * 1000;

// async function isAssistantEnabled(orgId) {
//   if (!orgId) return false;
//   const cached = featureCache.get(orgId);
//   if (cached && cached.expires > Date.now()) return cached.enabled;

//   try {
//     const doc = await db.doc(`orgs/${orgId}`).get();
//     const defaultEnabled = process.env.ASSISTANT_FEATURE_DEFAULT === 'true';
//     let enabled = defaultEnabled;
//     if (doc.exists) {
//       const settings = doc.get('settings');
//       if (settings && typeof settings.assistantEnabled === 'boolean') {
//         enabled = settings.assistantEnabled;
//       }
//     }
//     featureCache.set(orgId, { enabled, expires: Date.now() + FEATURE_TTL });
//     return enabled;
//   } catch (err) {
//     console.error('[assistantRouter] failed to read org settings', err);
//     return false;
//   }
// }

// async function requireAssistantEnabled(req, res, next) {
//   try {
//     const { orgId } = req.params;
//     const enabled = await isAssistantEnabled(orgId);
//     if (!enabled) {
//       return res.status(403).json({ error: 'Assistant is disabled for this organization.' });
//     }
//     return next();
//   } catch (err) {
//     return next(err);
//   }
// }

// router.use(withOrgAuth);
// router.use(assistantLimiter);
// router.use(requireAssistantEnabled);

// router.post('/test-intent', async (req, res) => {
//   try {
//     const text = String(req.body?.text || req.body?.query || '').trim();
//     if (!text) return res.status(400).json({ error: 'Missing text input' });
//     const intent = await analyzeAssistantIntent(text);
//     console.log(
//       JSON.stringify({
//         level: 'info',
//         msg: 'assistant.intent',
//         orgId: req.params.orgId,
//         uid: req.user?.uid || null,
//         intent: intent?.intent || 'unknown',
//         requestId: req.requestId,
//       }),
//     );
//     res.json({ intent });
//   } catch (err) {
//     console.error('POST /assistant/test-intent error', err);
//     res.status(500).json({ error: 'Failed to analyze intent' });
//   }
// });

// router.post('/run', async (req, res) => {
//   const startedAt = Date.now();
//   try {
//     const text = String(req.body?.text || req.body?.query || '').trim();
//     if (!text) return res.status(400).json({ error: 'Missing assistant input' });

//     const speak = !!req.body?.speak;
//     const voiceId = typeof req.body?.voiceId === 'string' ? req.body.voiceId : null;
//     const result = await runAssistant({
//       orgId: req.params.orgId,
//       user: req.user,
//       text,
//       options: { speak, voiceId },
//     });

//     console.log(
//       JSON.stringify({
//         level: 'info',
//         msg: 'assistant.run',
//         orgId: req.params.orgId,
//         uid: req.user?.uid || null,
//         intent: result.intent?.intent || 'unknown',
//         durationMs: Date.now() - startedAt,
//         requestId: req.requestId,
//       }),
//     );

//     res.json({
//       ...result,
//       requestId: req.requestId,
//       durationMs: Date.now() - startedAt,
//     });
//   } catch (err) {
//     console.error('POST /assistant/run error', err);
//     res.status(500).json({ error: 'Failed to process assistant request' });
//   }
// });

// export default router;

import express from "express";
import { db } from "../../../server/firebaseAdmin.js";
import withOrgAuth from "./middlewares/withOrgAuth.js";
import {
  analyzeAssistantIntent,
  runAssistant,
} from "../../services/assistantService.js";

const router = express.Router({ mergeParams: true });

/* ──────────────────────────────────────────────
 * CONFIG
 * ────────────────────────────────────────────── */
const RATE_WINDOW = Number(process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_MAX = Number(process.env.ASSISTANT_RATE_LIMIT_MAX || 30);
const FEATURE_TTL = 5 * 60 * 1000; // 5 minutes cache

/* ──────────────────────────────────────────────
 * RATE LIMITER
 * ────────────────────────────────────────────── */
function createRateLimiter({ windowMs, max }) {
  const buckets = new Map();

  // optional cleanup interval to avoid memory growth
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets.entries()) {
      if (entry.resetAt < now) buckets.delete(key);
    }
  }, windowMs * 2).unref();

  return (req, res, next) => {
    const key = req.user?.uid || req.ip || "anonymous";
    const now = Date.now();
    const entry = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    buckets.set(key, entry);

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", retryAfterSec);
      return res
        .status(429)
        .json({ error: "Assistant rate limit exceeded. Try again shortly." });
    }

    next();
  };
}

const assistantLimiter = createRateLimiter({
  windowMs: RATE_WINDOW,
  max: RATE_MAX,
});

/* ──────────────────────────────────────────────
 * FEATURE FLAG CACHING
 * ────────────────────────────────────────────── */
const featureCache = new Map(); // Map<orgId, { enabled: boolean, expires: number }>

async function isAssistantEnabled(orgId) {
  if (!orgId) return false;

  const cached = featureCache.get(orgId);
  if (cached && cached.expires > Date.now()) return cached.enabled;

  try {
    const doc = await db.doc(`orgs/${orgId}`).get();
    const defaultEnabled = process.env.ASSISTANT_FEATURE_DEFAULT === "true";
    let enabled = defaultEnabled;

    if (doc.exists) {
      const settings = doc.get("settings");
      if (settings && typeof settings.assistantEnabled === "boolean") {
        enabled = settings.assistantEnabled;
      }
    }

    featureCache.set(orgId, { enabled, expires: Date.now() + FEATURE_TTL });
    return enabled;
  } catch (err) {
    console.error("[assistantRouter] Failed to read org settings", err);
    return false;
  }
}

async function requireAssistantEnabled(req, res, next) {
  try {
    const { orgId } = req.params;
    const enabled = await isAssistantEnabled(orgId);
    if (!enabled) {
      return res
        .status(403)
        .json({ error: "Assistant is disabled for this organization." });
    }
    next();
  } catch (err) {
    next(err);
  }
}

/* ──────────────────────────────────────────────
 * ROUTE MIDDLEWARE
 * ────────────────────────────────────────────── */
router.use(withOrgAuth);
router.use(assistantLimiter);
router.use(requireAssistantEnabled);

/* ──────────────────────────────────────────────
 * POST /api/orgs/:orgId/assistant/test-intent
 * ────────────────────────────────────────────── */
router.post("/test-intent", async (req, res) => {
  try {
    const text = String(req.body?.text || req.body?.query || "").trim();
    if (!text) return res.status(400).json({ error: "Missing text input" });

    const intent = await analyzeAssistantIntent(text);

    console.log(
      JSON.stringify({
        level: "info",
        msg: "assistant.intent",
        orgId: req.params.orgId,
        uid: req.user?.uid || null,
        intent: intent?.intent || "unknown",
        requestId: req.requestId,
      })
    );

    res.json({ intent });
  } catch (err) {
    console.error("❌ POST /assistant/test-intent error:", err);
    res.status(500).json({ error: "Failed to analyze intent" });
  }
});

/* ──────────────────────────────────────────────
 * POST /api/orgs/:orgId/assistant/run
 * Run full AI assistant pipeline
 * ────────────────────────────────────────────── */
router.post("/run", async (req, res) => {
  const startedAt = Date.now();
  try {
    const text = String(req.body?.text || req.body?.query || "").trim();
    if (!text) return res.status(400).json({ error: "Missing assistant input" });

    const speak = !!req.body?.speak;
    const voiceId =
      typeof req.body?.voiceId === "string" ? req.body.voiceId : null;

    const result = await runAssistant({
      orgId: req.params.orgId,
      user: req.user,
      text,
      options: { speak, voiceId },
    });

    const duration = Date.now() - startedAt;

    console.log(
      JSON.stringify({
        level: "info",
        msg: "assistant.run",
        orgId: req.params.orgId,
        uid: req.user?.uid || null,
        intent: result.intent?.intent || "unknown",
        durationMs: duration,
        requestId: req.requestId,
      })
    );

    res.json({
      ...result,
      requestId: req.requestId,
      durationMs: duration,
    });
  } catch (err) {
    console.error("❌ POST /assistant/run error:", err);
    res.status(500).json({ error: "Failed to process assistant request" });
  }
});

export default router;