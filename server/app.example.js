// Minimal Express app for Teams APIs (staging-ready example)
import express from 'express';
import cors from 'cors';
import admin, { initFirebaseAdmin } from './firebaseAdmin.js';

import orgRouter from '../src/api/orgs/orgRouter.js';
import memberRouter from '../src/api/orgs/memberRouter.js';
import projectRouter from '../src/api/orgs/projectRouter.js';
import boardRouter from '../src/api/orgs/boardRouter.js';
import taskRouter from '../src/api/orgs/taskRouter.js';
import meetingRouter from '../src/api/orgs/meetingRouter.js';
import automationRouter from '../src/api/orgs/automationRouter.js';
import '../src/services/automationRules.example.js';

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
app.use(express.json());

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

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'Server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Teams API listening on :${port}`));

export default app;
