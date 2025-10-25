// Minimal Express app for Teams APIs (staging-ready example)
import http from 'http';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import admin, { initFirebaseAdmin } from './firebaseAdmin.js';

import orgRouter from '../src/api/orgs/orgRouter.js';
import memberRouter from '../src/api/orgs/memberRouter.js';
import projectRouter from '../src/api/orgs/projectRouter.js';
import boardRouter from '../src/api/orgs/boardRouter.js';
import taskRouter from '../src/api/orgs/taskRouter.js';
import meetingRouter from '../src/api/orgs/meetingRouter.js';
import automationRouter from '../src/api/orgs/automationRouter.js';
import '../src/services/automationRules.example.js';
import teamTaskRouter from '../src/api/teams/taskRouter.js';
import projectTaskProxyRouter from '../src/api/teams/projectTaskProxyRouter.js';
import voiceRouter from '../src/api/voice/voiceRouter.js';
import pulseRouter from '../src/api/teams/pulseRouter.js';
import rtcRouter from '../src/api/teams/rtcRouter.js';
import chatRouter from '../src/api/orgs/chatRouter.js';
import chatInsightsRouter from '../src/api/orgs/chatInsightsRouter.js';
import vaultRouter from '../src/api/orgs/vaultRouter.js';
import feedRouter from '../src/api/orgs/feedRouter.js';
import assistantRouter from '../src/api/orgs/assistantRouter.js';
import analyticsRouter from '../src/api/orgs/analyticsRouter.js';
import initChatGateway from '../src/services/chatGateway.js';

// --- Auth middleware (Firebase ID token) ---
async function authMiddleware(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const m = hdr.match(/^Bearer (.*)$/i);
    if (!m) return res.status(401).json({ error: 'Missing bearer token' });
    const decoded = await admin.auth().verifyIdToken(m[1]);
    req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
    next();
  } catch (err) {
    console.error('Auth error', err);
    res.status(401).json({ error: 'Invalid auth token' });
  }
}

// --- App bootstrap ---
initFirebaseAdmin();
const app = express();

// CORS (limit origins in real environments)
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: process.env.JSON_LIMIT || '25mb' }));

app.use((req, res, next) => {
  const headerId = req.headers['x-request-id'];
  const requestId = typeof headerId === 'string' && headerId.trim() ? headerId.trim() : randomUUID();
  req.requestId = requestId;
  res.set('x-request-id', requestId);

  const start = Date.now();
  const baseLog = {
    level: 'info',
    requestId,
    method: req.method,
    path: req.originalUrl,
  };
  console.log(JSON.stringify({ ...baseLog, msg: 'request.start', ts: new Date().toISOString() }));

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    console.log(
      JSON.stringify({
        ...baseLog,
        msg: 'request.finish',
        status: res.statusCode,
        durationMs,
        ts: new Date().toISOString(),
      }),
    );
  });

  next();
});

app.get('/', (req, res) => res.json({ status: 'ok', service: 'teams-api' }));
app.get('/healthz', (req, res) => res.send('ok'));
app.get('/api/ping', (req, res) => res.json({ pong: true }));

// Teams APIs
app.use('/api/orgs', authMiddleware, orgRouter);
app.use('/api/orgs', authMiddleware, memberRouter);
app.use('/api/orgs/:orgId/projects', authMiddleware, projectRouter);
app.use('/api/orgs/:orgId/boards', authMiddleware, boardRouter);
app.use('/api/orgs/:orgId/tasks', authMiddleware, taskRouter);
app.use('/api/orgs/:orgId/meetings', authMiddleware, meetingRouter);
app.use('/api/orgs/:orgId/automation', authMiddleware, automationRouter);
app.use('/api/orgs/:orgId/chat', authMiddleware, chatRouter);
app.use('/api/orgs/:orgId/chat', authMiddleware, chatInsightsRouter);
app.use('/api/orgs/:orgId/vault', authMiddleware, vaultRouter);
app.use('/api/orgs/:orgId/feed', authMiddleware, feedRouter);
app.use('/api/orgs/:orgId/assistant', authMiddleware, assistantRouter);
app.use('/api/orgs/:orgId/analytics', authMiddleware, analyticsRouter);
app.use('/api/tasks', authMiddleware, teamTaskRouter);
app.use('/api/orgs/:orgId/projects/:projectId/tasks', authMiddleware, projectTaskProxyRouter);

const voiceRateLimitWindow = Number(process.env.VOICE_RATE_LIMIT_WINDOW_MS || 60_000);
const voiceRateLimitMax = Number(process.env.VOICE_RATE_LIMIT_MAX || 20);
const voiceLimiter = createRateLimiter({ windowMs: voiceRateLimitWindow, max: voiceRateLimitMax });
app.use('/api/voice', authMiddleware, voiceLimiter, voiceRouter);
app.use('/api/orgs/:orgId', authMiddleware, pulseRouter);
app.use('/api/orgs/:orgId/rtc', authMiddleware, rtcRouter);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const requestId = req.requestId || randomUUID();
  res.set('x-request-id', requestId);
  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'request.error',
      requestId,
      method: req.method,
      path: req.originalUrl,
      stack: err?.stack,
    }),
  );
  res.status(500).json({ error: 'Server error', requestId });
});

const server = http.createServer(app);
initChatGateway(server);

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Teams API listening on :${port}`));

export default app;
function createRateLimiter({ windowMs = 60_000, max = 20 } = {}) {
  const buckets = new Map();

  return (req, res, next) => {
    const key = req.user?.uid || req.ip || 'anonymous';
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
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }

    next();
  };
}
