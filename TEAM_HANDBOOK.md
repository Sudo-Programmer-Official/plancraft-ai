# Team Handbook — Voice-Driven Sprints 4–6

This handbook captures the key workflows, endpoints, and operational notes for the voice-centric releases (Sprints 4–6) of PlanCraftAI Teams. See `TEAM_CHAT.md` for a focused guide on the Sprint 7 chat rollout.

---

## 1. System Overview

- **Mode switching**: Personal vs Team contexts via `useOrgStore`. Team routes live under `/team/:orgId/*`.
- **Data layout**: `orgs/{orgId}/projects/{projectId}/tasks/{taskId}` with `updates/{updateId}` subcollections for progress notes. Reflections (optional) live under `orgs/{orgId}/reflections/{reflectionId}`.
- **Voice loop**: Frontend `useVoiceCommand` composable streams audio to `/api/voice/*`, backend intent + query services respond with structured JSON and optional ElevenLabs audio (data URLs).
- **Pulse engine**: `/api/orgs/:orgId/projects/:projectId/pulse/weekly` aggregates tasks + reflections, calls OpenAI for summary, and can synthesise audio with `textToSpeech`.
- **Meeting automation**: `/api/orgs/:orgId/meetings/:meetingId/recordings` uploads audio, auto-transcribes via OpenAI, and pipes action items into project tasks.

---

## 2. Backend Services

### 2.1 Express middlewares

- **Request correlation**: All requests receive/emit `x-request-id` with JSON logs (`request.start`, `request.finish`, `request.error`).
- **Auth**: Firebase Admin verifies ID tokens in `authMiddleware` before hitting routers.
- **Voice limiter**: `createRateLimiter()` protects `/api/voice/*` — defaults to 20 req/min per uid/IP. Override via `VOICE_RATE_LIMIT_WINDOW_MS` and `VOICE_RATE_LIMIT_MAX`.

### 2.2 Core routers

| Router | Path | Purpose |
| --- | --- | --- |
| `orgRouter` | `/api/orgs` | Org CRUD + membership seeding |
| `memberRouter` | `/api/orgs/:orgId/members` | RBAC management |
| `projectRouter` | `/api/orgs/:orgId/projects` | Project CRUD |
| `teamTaskRouter` | `/api/tasks` (`teamId` + `projectId` query) | Project-scoped task CRUD |
| `voiceRouter` | `/api/voice/command`, `/api/voice/query` | Voice tasking + workspace Q&A |
| `pulseRouter` | `/api/orgs/:orgId/projects/:projectId/pulse/*` | Weekly stats + AI coach |
| `rtcRouter` | `/api/orgs/:orgId/rtc/*` | WebRTC signaling (offer/answer/ICE, room lifecycle) |

### 2.3 Services

- `voiceCommandService`: Intent detection (heuristics + OpenAI fallback), task creation/update, instant TTS replies.
- `teamPulseService`: Gathers weekly stats, builds summaries, produces coach responses and optional audio.
- `textToSpeech`: ElevenLabs integration; returns data URLs when configured, otherwise falls back silently.
- `transcriptionService`: Uploads/downloads meeting audio from Storage and forwards to OpenAI Whisper for transcripts.
- `chatGateway`: Socket.IO server for room membership, presence, and message broadcasts.

---

## 3. Frontend Modules

- **Command Palette** (`CommandPalette.vue`): global ⌘/Ctrl + J launcher with mic support, hitting `/api/voice/*` from the current team/project context.
- **Team Pulse View** (`TeamPulse.vue`): summary cards, contributors, sentiment sparkline, badges, and AI coach experience.
- **Live Meeting Room** (`TeamMeetingRoom.vue`): WebRTC video, chat, reactions, recording, and screen share controls.
- **Team Chat Workspace** (`TeamChat.vue` + chat components): multi-room real-time chat with presence, pinning, and attachments.
- **Stores**:
  - `teamPulseStore.ts`: handles weekly pulse data, coach responses, and error state.
  - `teamRtcStore.ts`: tracks local/remote streams, chat log, reactions, and connection status for meetings.
  - `teamChatStore.ts`: manages chat rooms, Socket.IO connection, presence, and history.
  - Existing stores (`orgStore`, `projectStore`, `teamTaskStore`, `meetingStore`) maintain selected context and data caches.
- **Voice compositions**:
  - `useVoiceCommand.ts`: wraps `recordAndSendToBackend`, dispatches to voice command/query endpoints, and keeps last result for UI playback.

---

## 4. Environment & Secrets

| Variable | Description | Notes |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Firebase Admin credentials | Required for backend |
| `CORS_ORIGIN` | Allowed frontend origin(s) | Comma-separate for multiple |
| `OPENAI_API_KEY` | Used by intent + pulse services | Optional but enables richer summaries |
| `OPENAI_MODEL`/`OPENAI_PULSE_MODEL` | Model override for coach/pulse | Defaults to `gpt-4o-mini` |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | Enables TTS playback | Optional; fallback returns `null` |
| `VOICE_RATE_LIMIT_WINDOW_MS` | Rate-limiter window (ms) | Default `60000` |
| `VOICE_RATE_LIMIT_MAX` | Requests per window | Default `20` |
| `OPENAI_TRANSCRIBE_MODEL` | Whisper model for meeting recordings | Default `whisper-1` |
| `FIREBASE_STORAGE_BUCKET` | Override default bucket for recordings | Optional (uses project default) |
| `SOCKET_IO_PATH` / `VITE_SOCKET_IO_PATH` | Socket.IO path for chat gateway | Default `/ws/chat` |

Remember to surface `x-request-id` in any upstream gateway logs for traceability.

---

## 5. Deployment Checklist

1. **Firestore**
   - Deploy `firestore.rules` and `indexes.json` (new indexes: `tasks.assignedTo+status`, `updates.createdAt`).
2. **Backend**
   - Ensure Node 18+ runtime (native `fetch`, `FormData`, Socket.IO).
   - Set env vars above; restart service after updating.
   - Install/update dependencies (express, cors, firebase-admin, socket.io).
   - Verify `FIREBASE_STORAGE_BUCKET` or default bucket accessible for meeting recordings.
3. **Frontend**
   - Set `VITE_ENABLE_TEAMS=true` and `VITE_TEAMS_API_BASE_URL` to the deployed Teams API.
   - Rebuild to ship new Team Pulse route.
4. **Smoke tests**
   - Create/claim task via `/api/tasks`.
   - Hit `/api/orgs/:orgId/projects/:projectId/pulse/weekly` (expect stats + summary).
   - Upload meeting recording → ensure transcript + tasks appear and `/meetings/:id/recordings` returns `status: completed`.
   - Join `/team/:orgId/chat` in two browsers → confirm real-time messages, presence, typing, pinning, attachment link.
   - Run voice command through palette (e.g., “Add task ship sprint pulse”).
   - Confirm rate limiting by rapidly hitting `/api/voice/command` (>20 req/min).

---

## 6. Troubleshooting

- **429 Too Many Requests**: Increase `VOICE_RATE_LIMIT_MAX` cautiously or investigate clients spamming voice endpoints.
- **Missing audio playback**: Ensure ElevenLabs credentials and voice ID are set; otherwise summaries fallback to text-only.
- **Empty sentiment graph**: Encourage teams to log reflections; absence indicates no data in `orgs/{orgId}/reflections`.
- **OpenAI failures**: Logs surface as `[teamPulse] ... error`. The system automatically falls back to deterministic text, so consider queueing retries if richer output is needed.

---

## 7. Next Steps

- Wire reflections capture for teams to populate sentiment trends consistently.
- Layer in webhook notifications (Slack/Email) for weekly pulse reports.
- Extend `teamPulseService` to archive snapshots (e.g., `orgs/{orgId}/pulseLogs/{weekId}`) for historical comparisons.

---

Questions or hand-off clarifications: ping the CodeX channel in Notion or drop a comment in the `teams-dev` PR thread.
