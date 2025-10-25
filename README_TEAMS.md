# PlanCraftAI — Teams (Sprints 4–6 Blueprint)

This folder contains the Teams mode stack (multi-tenant orgs + RBAC) behind a feature flag. Recent releases (Sprints 4–6) add the voice-aware pulse system, meeting recordings with auto tasks, and production hardening.

## What’s New (Sprints 4–6)

- **Security**: Hardened Firestore rules for nested project tasks & task update streams, plus new composite indexes.
- **Observability**: Structured JSON logging with `x-request-id` propagation on every request.
- **Rate limiting**: Built-in guardrail for `/api/voice/*` with configurable window + cap (`VOICE_RATE_LIMIT_WINDOW_MS`, `VOICE_RATE_LIMIT_MAX`).
- **Team Pulse API**: `GET /api/orgs/:orgId/projects/:projectId/pulse/weekly` delivers stats, AI summary, and optional ElevenLabs audio recap.
- **Coach API**: `POST /api/orgs/:orgId/projects/:projectId/pulse/coach` turns summaries into motivational nudges (with voice playback when configured).
- **Frontend Pulse view**: `/team/:orgId/pulse` showcases weekly cards, sentiment sparkline, monthly badges, and the AI coach loop.
- **Meetings automation**: `/api/orgs/:orgId/meetings/:meetingId/recordings` uploads audio, transcribes via OpenAI, and pipes action items directly into project tasks with updated UI in `TeamMeetingRoom.vue` and `TeamMeetingDetail.vue`.

## Deliverables Included

- `CONTEXT_FOR_CODEX.md` — vision + principles for Codex and devs
- `TEAM_CHAT.md` — chat gateway setup & smoke tests
- `firestore.rules` — safe RBAC base (org/member access)
- `indexes.json` — indexes for members/tasks lookups
- `src/api/orgs/orgRouter.js` — org creation + membership listing
- `src/api/orgs/memberRouter.js` — list/add/update/remove members
- `src/api/orgs/middlewares/withOrgAuth.js` — membership/role gate
- `src/api/orgs/projectRouter.js` — project CRUD scoped to orgs
- `src/api/orgs/boardRouter.js` — board CRUD + filters
- `src/api/orgs/taskRouter.js` — task CRUD + filters
- `src/api/orgs/meetingRouter.js` — meeting ingest + transcript hooks
- `src/api/orgs/automationRouter.js` — automation logs API
- `src/api/orgs/chatRouter.js` — chat room REST helpers (history, pinning, uploads)
- `frontend/src/layouts/TeamLayout.vue` — shell layout
- `frontend/src/components/OrgSwitcher.vue` — switcher wired to store/API
- `frontend/src/components/NavBarWithOrgSwitcher.vue` — nav drop-in for demos
- `frontend/src/stores/orgStore.ts` — org context store
- `frontend/src/stores/projectStore.ts` — project data store
- `frontend/src/stores/taskStore.ts` — task data store
- `frontend/src/stores/meetingStore.ts` — meeting ingest state
- `frontend/src/stores/automationStore.ts` — automation log state (stub)
- `frontend/src/stores/teamPulseStore.ts` — pulse + coach state
- `frontend/src/stores/teamChatStore.ts` — chat websocket + history state
- `frontend/src/stores/teamRtcStore.ts` — WebRTC session state (streams, chat, reactions)
- `frontend/src/views/TeamProjects.vue` — team projects view skeleton
- `frontend/src/views/TeamBoards.vue` — boards placeholder
- `frontend/src/views/TeamTasks.vue` — tasks placeholder
- `frontend/src/views/TeamPulse.vue` — weekly pulse, sentiment, coach loop
- `frontend/src/views/TeamChat.vue` — real-time chat workspace
- `frontend/src/views/TeamMeetings.vue` — meetings UI
- `frontend/src/views/TeamMeetingRoom.vue` — live meeting room (WebRTC + chat)
- `frontend/src/views/TeamAutomations.vue` — automation activity UI
- `frontend/src/views/TeamMeetingDetail.vue` — transcript preview + commit flow
- `src/services/automationEngine.js` — event bus for rules
- `src/services/voiceOrchestrator.js` — voice → tasks stub
- `src/services/teamPulseService.js` — weekly pulse stats + AI summary helper
- `src/services/transcriptionService.js` — OpenAI transcription helper for meeting recordings
- `src/services/automationRules.example.js` — sample rule wiring
- `scripts/cron/pruneAutomationLogs.example.js` — retention helper
- `.env.example` — `VITE_ENABLE_TEAMS` flag

## Goals (Phase 1)

- Introduce multi‑tenant Team Mode with org creation, membership, and switching
- Keep personal mode intact (existing dashboards continue to work)
- Enforce org‑scoped data and role‑based access

## Firestore Setup

1) Rules
- File: `firestore.rules`
- Deploy: `firebase deploy --only firestore:rules`

2) Indexes
- File: `indexes.json`
- Deploy: `firebase deploy --only firestore:indexes`

Schema (subset):
- `orgs/{orgId}`: `{ name, slug, ownerUid, plan, createdAt, settings }`
- `orgs/{orgId}/members/{uid}`: `{ uid, role, name, email, joinedAt }`
- `orgs/{orgId}/projects/{projectId}`: `{ name, key, status, leadUid, createdAt, updatedAt }`
- `orgs/{orgId}/boards/{boardId}`: `{ name, type, projectId, columns, createdAt }`
- `orgs/{orgId}/tasks/{taskId}`: `{ title, status, assignees, projectId, boardId, createdAt }`
- `orgs/{orgId}/meetings/{meetingId}`: `{ title, startAt, attendees, transcriptReady, createdAt }`
- `users/{uid}`: `{ name, email, photoUrl, memberships: [{ orgId, role }], lastOrgId }` (future use)

## Backend (Express) Integration

1) Initialize Firebase Admin once (example):
```
import admin from 'firebase-admin'
admin.initializeApp({ /* service account or default creds */ })
```

2) Ensure auth middleware sets `req.user.uid` from your auth layer (e.g., Firebase Auth ID token).

3) Mount routers:
```
import express from 'express'
import orgRouter from './src/api/orgs/orgRouter.js'
import memberRouter from './src/api/orgs/memberRouter.js'
import projectRouter from './src/api/orgs/projectRouter.js'
import boardRouter from './src/api/orgs/boardRouter.js'
import taskRouter from './src/api/orgs/taskRouter.js'
import meetingRouter from './src/api/orgs/meetingRouter.js'
import automationRouter from './src/api/orgs/automationRouter.js'
import teamTaskRouter from './src/api/teams/taskRouter.js'
import projectTaskProxyRouter from './src/api/teams/projectTaskProxyRouter.js'
import pulseRouter from './src/api/teams/pulseRouter.js'
import voiceRouter from './src/api/voice/voiceRouter.js'
import rtcRouter from './src/api/teams/rtcRouter.js'
import './src/services/automationRules.example.js' // optional: register automation handlers

const app = express()
app.use(express.json())

// authMiddleware should populate req.user
app.use('/api/orgs', authMiddleware, orgRouter)
app.use('/api/orgs', authMiddleware, memberRouter)
app.use('/api/orgs/:orgId/projects', authMiddleware, projectRouter)
app.use('/api/orgs/:orgId/boards', authMiddleware, boardRouter)
app.use('/api/orgs/:orgId/tasks', authMiddleware, taskRouter)
app.use('/api/orgs/:orgId/meetings', authMiddleware, meetingRouter)
app.use('/api/orgs/:orgId/automation', authMiddleware, automationRouter)
app.use('/api/tasks', authMiddleware, teamTaskRouter)
app.use('/api/orgs/:orgId/projects/:projectId/tasks', authMiddleware, projectTaskProxyRouter)
app.use('/api/orgs/:orgId', authMiddleware, pulseRouter)
app.use('/api/orgs/:orgId/rtc', authMiddleware, rtcRouter)

const voiceLimiter = createRateLimiter({
  windowMs: Number(process.env.VOICE_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.VOICE_RATE_LIMIT_MAX || 20),
})
app.use('/api/voice', authMiddleware, voiceLimiter, voiceRouter)
```

Key environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `VOICE_RATE_LIMIT_WINDOW_MS` | Rate-limit window for `/api/voice/*` | `60000` |
| `VOICE_RATE_LIMIT_MAX` | Maximum requests per window (per uid/IP) | `20` |
| `OPENAI_PULSE_MODEL` | Optional override for weekly pulse & coach prompts | `OPENAI_MODEL` / `gpt-4o-mini` |
| `OPENAI_TRANSCRIBE_MODEL` | Whisper model for meeting recordings | `whisper-1` |
| `VITE_RTC_ICE_SERVERS` | Frontend override for ICE servers array | Defaults to public STUN list |
| `FIREBASE_STORAGE_BUCKET` | Optional override for Storage uploads | Uses default service-account bucket |
| `SOCKET_IO_PATH` / `VITE_SOCKET_IO_PATH` | Path for chat WebSocket gateway | Defaults to `/ws/chat` |

Routes included:
- `POST /api/orgs` → create org, seed owner membership
- `GET /api/orgs` → list orgs for current user
- `GET /api/orgs/:orgId/members` → list members
- `POST /api/orgs/:orgId/members` → add member (admin/owner)
- `PATCH /api/orgs/:orgId/members/:uid` → update role (admin/owner)
- `DELETE /api/orgs/:orgId/members/:uid` → remove member (admin/owner; cannot remove owner)
- `GET /api/orgs/:orgId/projects` → list projects
- `POST /api/orgs/:orgId/projects` → create project
- `PATCH /api/orgs/:orgId/projects/:projectId` → update project
- `DELETE /api/orgs/:orgId/projects/:projectId` → remove project
- `GET /api/orgs/:orgId/boards` → list boards (optional project filter)
- `POST /api/orgs/:orgId/boards` → create board
- `PATCH /api/orgs/:orgId/boards/:boardId` → update board
- `DELETE /api/orgs/:orgId/boards/:boardId` → remove board
- `GET /api/orgs/:orgId/tasks` → list tasks (filter by project/board/status/assignee)
- `POST /api/orgs/:orgId/tasks` → create task
- `PATCH /api/orgs/:orgId/tasks/:taskId` → update task
- `DELETE /api/orgs/:orgId/tasks/:taskId` → delete task
- `GET /api/orgs/:orgId/projects/:projectId/tasks` → same as above (REST alias)
- `POST /api/orgs/:orgId/projects/:projectId/tasks` → same as above (alias)
- `GET /api/orgs/:orgId/chat/rooms` → list chat rooms (recent first)
- `POST /api/orgs/:orgId/chat/rooms` → create room
- `GET /api/orgs/:orgId/chat/rooms/:roomId/messages` → fetch history (cursor-based)
- `POST /api/orgs/:orgId/chat/rooms/:roomId/messages` → send message (REST fallback)
- `POST /api/orgs/:orgId/chat/rooms/:roomId/uploads` → upload attachment (base64 → Storage)
- `POST /api/orgs/:orgId/chat/rooms/:roomId/pin` → toggle pinned message
- WebSocket gateway: connect to `SOCKET_IO_PATH` (Socket.IO) with `{ token, orgId }` auth for real-time chat + presence
- `GET /api/orgs/:orgId/projects/:projectId/pulse/weekly` → weekly stats, AI summary, optional audio recap (`?audio=true`)
- `POST /api/orgs/:orgId/projects/:projectId/pulse/coach` → generate spoken AI nudge (input: `{ prompt?, summary? }`)
- `POST /api/orgs/:orgId/rtc/offer` → store WebRTC offer (room bootstrap)
- `POST /api/orgs/:orgId/rtc/answer` → store answer for a room
- `POST /api/orgs/:orgId/rtc/ice` → append ICE candidate (`role` = `offer` | `answer`)
- `GET /api/orgs/:orgId/rtc/room/{roomId}` → fetch full room state (offer/answer/candidates)
- `DELETE /api/orgs/:orgId/rtc/room/{roomId}` → clear room document
- `GET /api/orgs/:orgId/meetings` → list meetings (latest 50)
- `POST /api/orgs/:orgId/meetings/ingest` → create meeting entry (calendar/voice)
- `POST /api/orgs/:orgId/meetings/:meetingId/recordings` → upload recording (base64) + auto-transcribe + create tasks
- `POST /api/orgs/:orgId/meetings/:meetingId/transcript` → attach transcript & trigger automations
  - Add `?dryRun=true` to fetch generated tasks without writing or firing automations
- `GET /api/orgs/:orgId/automation/logs` → list recent automation events
- Supports query params: `limit`, `cursor`, `event`, `status`, `ruleId`
- Response shape: `{ items: AutomationLog[], nextCursor: string | null }`
- `POST /api/orgs/:orgId/automation/rules/dry-run` → run automation without writes (currently supports meeting transcripts)
  ```
  POST /api/orgs/org123/automation/rules/dry-run
  { "event": "meeting.transcript_ready", "payload": { "transcript": "..." } }
  → { "tasks": [...] }
  ```

### Minimal example server

- File: `server/app.example.js`
- Package manifest: `package-teams.example.json`

Steps:
1. Copy environment variables to `.env` or export in shell:
   - `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 of service account JSON)
   - `CORS_ORIGIN` (e.g., `http://localhost:5173`)
   - `PORT` (optional, defaults to 3000)
2. Install deps using the example package:
   - `npm install` with dependencies listed in `package-teams.example.json` (express, cors, firebase-admin, socket.io)
3. Start server:
   - `node server/app.example.js`
4. Health check:
   - `GET http://localhost:3000/healthz` → `ok`

## Frontend (Vue) Integration

1) Feature flag
- `.env` → `VITE_ENABLE_TEAMS=true`
- Access via `import.meta.env.VITE_ENABLE_TEAMS`

2) Org Switcher
- Component: `frontend/src/components/OrgSwitcher.vue`
- Now wired to store and API to load memberships, switch active org, and create teams.

3) Routes
- Add a team route pointing to the Team layout shell:
```
{ path: '/team/:orgId', component: () => import('frontend/src/layouts/TeamLayout.vue') }
```

Or install from the example helper:
```
import installTeamRoutes from 'frontend/src/router/teamRoutes.example'
installTeamRoutes(router)
```

4) Store enhancement (example fields)
- Implemented Pinia store: `frontend/src/stores/orgStore.ts`
  - `activeContext: 'personal' | 'team'`
  - `activeOrgId: string | null`
  - `orgs: Org[]` with `fetchOrgs()` and `createOrg(name)`
  - `setOrg(orgId)` and `clearOrg()`

5) API helper
- File: `frontend/src/lib/api.ts`
- Provides `apiGet`, `apiPost`, and `setAuthTokenProvider(fn)`
- Reads `VITE_API_BASE_URL` (optional). Defaults to same origin.

Auth token provider:
```
import { setAuthTokenProvider } from 'frontend/src/lib/api'
import { getAuth } from 'firebase/auth'

setAuthTokenProvider(async () => {
  const user = getAuth().currentUser
  return user ? user.getIdToken() : null
})
```

6) Optional UI drop-ins
- NavBar with Org switcher: `frontend/src/components/NavBarWithOrgSwitcher.vue`
  - Usage in your `App.vue`:
  ```vue
  <template>
    <NavBarWithOrgSwitcher />
    <router-view />
  </template>
  <script setup>
  import NavBarWithOrgSwitcher from './components/NavBarWithOrgSwitcher.vue'
  </script>
  ```
- Meeting detail (transcript preview) lives at `/team/:orgId/meetings/:meetingId`
- Automations tab supports filters + infinite scroll via `useAutomationStore`

- Main bootstrap helper: `frontend/src/main.example.ts`
  - Use `boot(App, router)` to register Pinia + Router and mount.
 - Example:
  ```ts
  import App from './App.vue'
  import router from './router'
  import { boot } from './main.example'
  boot(App, router)
  ```

## Sprint 2 — Projects • Boards • Tasks

1) Firestore
- Collections: `orgs/{orgId}/projects`, `orgs/{orgId}/boards`, `orgs/{orgId}/tasks`
- Deploy updated `firestore.rules` and `indexes.json`

2) Backend APIs
- Routers: `projectRouter.js`, `boardRouter.js`, `taskRouter.js`
- Mount under `/api/orgs/:orgId/...`
- Optional: add `/api/orgs/:orgId/voice/ingest` stub for LLM hooks

3) Frontend Stores & Views
- Stores: `projectStore.ts`, `taskStore.ts`
- Views: `TeamProjects.vue` (wired), `TeamBoards.vue` + `TeamTasks.vue` placeholders
- Router helper now registers child routes under `/team/:orgId`

Sprint 3 adds:
- Stores: `meetingStore.ts`, `automationStore.ts`
- Views: `TeamMeetings.vue`, `TeamMeetingDetail.vue`, `TeamMeetingRoom.vue`, `TeamAutomations.vue`
- Automations tab supports filters (event/rule/status) + infinite scroll
- Meeting detail page previews generated tasks prior to commit

4) Demo Flow Checklist
- Enable `VITE_ENABLE_TEAMS=true`
- Start example server & frontend
- Create team → create project → verify Firestore entries
- Confirm task list endpoint returns data (via REST client)

5) Ready for Sprint 3
- Hook voice/meeting ingestion into task creation
- Add automation rules to auto-route tasks onto boards

## Sprint 3 — Meetings • Voice • Automations

1) Meeting ingestion
- Router: `src/api/orgs/meetingRouter.js`
- Endpoints support meeting metadata and transcript uploads

2) Automation engine
- Core bus: `src/services/automationEngine.js`
- Example rule wiring: `src/services/automationRules.example.js`
- Stub LLM orchestrator: `src/services/voiceOrchestrator.js`
- Logging: `orgs/{orgId}/automationLogs` collection + `GET /automation/logs`

3) How it flows
- `POST /meetings/ingest` ⇒ event `meeting.ingested`
- `POST /meetings/:id/transcript` ⇒ event `meeting.transcript_ready`
- Example rule consumes transcript event → calls `voiceToTasks()` → writes to `tasks`
- Logs stored in `orgs/{orgId}/automationLogs` (filterable, paginated via API)
- `POST /meetings/:id/recordings` (Sprint 6) accepts base64 audio, uploads to Storage, autotranscribes via OpenAI, and creates project tasks automatically.

4) Customize
- Replace stub orchestrator with real LLM call (OpenAI/Vertex/etc.)
- Register additional rules via `registerAutomation(event, handler)`
- Add background worker (Cloud Functions/Cloud Run) for async processing if desired
- Configure `.env` with `OPENAI_API_KEY`, optional `OPENAI_MODEL`, `OPENAI_API_BASE`
- Optional: run `node scripts/cron/pruneAutomationLogs.example.js` via cron (set `AUTOMATION_LOG_RETENTION_DAYS`)

5) Next (Sprint 4)
- Billing + Stripe seats
- Org-level integrations (Slack notifications, Google sync)
- Automation rule builder UI

## Ops Checklist

- Deploy updated security rules and indexes (`firebase deploy --only firestore:{rules,indexes}`)
- Set environment variables in staging/prod:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (optional, default `gpt-4o-mini`)
  - `OPENAI_API_BASE` (optional)
  - `AUTOMATION_MODE` (e.g., `sync`)
  - `AUTOMATION_LOG_RETENTION_DAYS` (if using cron cleanup)
- Schedule retention job
  - e.g., Cloud Scheduler → `node scripts/cron/pruneAutomationLogs.example.js`
- Monitor `/api/orgs/:orgId/automation/logs` for handler health and validation failures

## Migration Path (Safe Rollout)

1) Deploy with `VITE_ENABLE_TEAMS=false` → No change for users
2) Flip flag on staging → `/team` routes appear for internal testing
3) (Optional) Auto‑create personal org per user to seed RBAC
   - Script: `scripts/seed/seedPersonalOrg.example.js`
   - Usage: `node scripts/seed/seedPersonalOrg.example.js <uid> [name]`
4) Test invite flows and role gates

## Notes & Next Steps

- Phase 2: Projects + Tasks under each org, Kanban UI, voiceToTasks hook
- Phase 3: Meeting ingestion → actions pipeline
- Phase 4: Stripe seat billing

This scaffold ships a secure foundation (RBAC + multi‑tenancy) without touching your existing personal mode. Hook up your auth middleware, mount routes, and wire the Org Switcher to start end‑to‑end testing.
