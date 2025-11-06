# PlanCraftAI Application Snapshot

_Last updated: 2025-11-05_

This snapshot captures how the current PlanCraftAI stack fits together so future features can build on the right layers without rediscovering wiring.

---

## 1. High-Level Architecture

- **Frontend** (`apps/audit-agent-frontend/`)
  - Vue 3 + Element Plus UI.
  - Auth + realtime data via Firebase client SDK.
  - REST calls to the Node backend through `@/services/api`.
  - Core feature surfaces:
    - Dashboard, Daily/Weekly/Monthly planners.
    - Talk-to-Planner conversational UI.
    - Task planner dialog with voice capture + AI helpers.
    - Notifications prompt & opt-in UX.

- **Backend** (`apps/backend-node/`)
  - Express server.
  - Uses Firebase Admin SDK for data.
  - Integrations for WhatsApp (Twilio), email, PWA push, SMS, voice calls.
  - AI orchestration via OpenAI (`openaiService`).
  - Scheduler/worker loop handles reminders.

- **Shared Services / Utilities**
  - `notificationService`: channel resolution & multi-channel dispatch.
  - `reminderService`: lifecycle from creation → queueing → delivery.
  - `taskService`: task CRUD, reminder auto-scheduling, notifications.
  - `plannerAssistantService`: builds user context, interprets intents, executes actions (task CRUD, reminder actions).
  - Time utilities (`timezone.js`, `time_context.js`, `time_parser.js`).

---

## 2. Core Functionalities

### 2.1 Voice Capture

- **Frontend**
  - `VoiceRecorder.vue` wraps `MediaRecorder` and streams audio to backend.
  - Used in Talk-to-Planner (`TalkToPlanner.vue`) and Task Planner dialog.
  - Transcript callback handled via `recordAndSendToBackend` (see `@/utils/backendRecorder`).

- **Backend**
  - `/api/voice` route (see `services/voiceHandler.js`) forwards audio to OpenAI Whisper or equivalent speech-to-text provider.
  - Transcription returned to caller; UI injects into input fields or auto-sends when flagged final.

**Extension tips:** Reuse `recordAndSendToBackend` for any new voice-enabled form. Hook into the same “transcribed” event pattern to populate inputs or auto-submit.

### 2.2 Talk-to-Planner (Conversational Agent)

- **Frontend View:** `TalkToPlanner.vue`
  - Maintains chat history, sends user message + trimmed history to backend via `queryPlannerAssistant`.
  - Displays assistant reply, executed action results, suggestion chips.
  - Dispatches `tasks:refresh-request` when task-affecting actions complete.

- **API Flow:** `POST /api/talk/chat` (see `routes/talkToPlannerRoutes.js`)
  1. Build user context via `plannerAssistantService.buildUserContext`.
  2. Compose system prompt describing supported actions + JSON schema.
  3. Call `chatWithFallback` (OpenAI).
  4. Parse actions from response (`extractActionsFromText`).
  5. If model returned no actions, derive fallback actions from detected intent (`buildFallbackActionsFromIntent`, e.g., “mark all complete”).
  6. Execute actions (`executePlannerActions` delegates to task/reminder services).
  7. Refresh context if actions mutated data; respond with updated summary + action results.

- **Supported Actions:** `create_task`, `update_task`, `complete_task`, `schedule_reminder`, `get_tasks`, `get_reminders`.
  - Implemented in `plannerAssistantService.js`, leveraging `taskService`, `reminderService`, and Firestore calls directly.

**Extension tips:** When adding new planner capabilities:
  - Extend the schema list + fallback builder.
  - Add execution branch inside `executePlannerActions`.
  - Update front-end result renderer if returning new payload shapes.

### 2.3 Task Planning & Date Scheduling

- **TaskPlannerDialog.vue**
  - Handles manual task creation/edit.
  - Voice transcription injects into task notes.
  - AI helper: `/api/ai/split-tasks` -> `aiService.generateTasksFromText`.
  - Reminder time extraction: `extractReminderTime` (client) hits `/api/ai/extract-time` or uses local relative-time fallback.
  - Uses `toUtcIso` / `toLocalDateKey` to persist Firestore-friendly fields.

- **Client AI Time Parsing**
  - `aiService.extractReminderTime`:
    1. Build temporal context (`buildTimeContext`).
    2. Detect common “in N minutes/hours” phrases locally (fast path).
    3. Otherwise call backend `extract-time`.

- **Backend AI Time Parsing** (`openaiService.extractReminderTime`)
  - Converts natural language into absolute UTC ISO using timezone context.
  - Ensures JSON-only response and normalizes to UTC.

- **Task Persistence**
  - `firebaseService.addTaskToFirebase` / `updateTaskInFirebase`.
  - Auto notification scheduling via `syncTaskNotification` (taskService schedule + multi-channel alert).

**Extension tips:** Reuse `extractReminderTime` + `buildTimeContext` for any new feature needing user-relative scheduling. For batched creation, rely on `normalizeTemporalTasks`.

### 2.4 Notifications & Reminder Delivery

- **Channel Preference Resolution:** `notificationService.resolveUserChannels`.
  - Reads Firestore user prefs (`userPrefService.getUserPrefs`).
  - Applies env feature flags (ENABLE_WHATSAPP, etc.).
  - Falls back sensibly (e.g., PWA if all off).

- **Task Notifications:** `notifyTaskCreated` invoked from `taskService.createTask`.
  - Payload includes WhatsApp template, email subject/body, PWA push data.

- **Reminder Lifecycle:**
  1. `reminderService.createReminderFromText` stores reminder doc, uses `queueReminder`.
  2. `queueReminder` schedules `setTimeout`, reloading doc before firing to avoid duplicates.
  3. `sendReminder` builds channel payloads, calls `notifyReminderDue`.
  4. `notifyReminderDue` iterates channels -> WhatsApp/email/PWA/SMS/voice.
  5. Worker (`processReminderBatches`) ensures near-term reminders fire even if process restarted.

- **Backend Integrations:**
  - WhatsApp / SMS / Voice: Twilio (`twilioService.js`).
  - Email: provider via `integrations/emailProvider`.
  - PWA: Firebase messaging service worker.

**Extension tips:** To add new channel:
  - Implement provider in `integrations`.
  - Wire into `sendViaChannel` + env flag map.
  - Update preference schema + frontend toggles if user should control it.

### 2.5 Scheduling & Time Utilities

- `timezone.js` → `formatLocalTime` used for reminders to display friendly strings.
- `timeSequencer.js` (frontend/backend) handles time block suggestions.
- `time_context.js` centralizes context for AI prompts.
- `aiService` front-end fallback ensures quick, local adjustments for relative times.

---

## 3. Data Stores & Collections

- `tasks` (Firestore): Task documents with fields like `title`, `date`, `reminderTime`, `channels`, `metadata`, `userId`, `createdAt`, `updatedAt`.
- `reminders`: Tracking scheduled reminders. Fields include `scheduledTime`, `channels`, `taskId`, `status`, `sentAt`.
- `users`: Profile + `preferences.notifications`.
- `user_notification_prefs`: Overrides for channel flags.
- `reports`, `journalEntries`: Used for context in planner assistant.

---

## 4. Event / Refresh Flow

- Talk-to-Planner emits `tasks:refresh-request` so any mounted view using `useTasks` reloads data.
- `NotificationBanner` listens for Firestore updates to announcements.
- Reminder worker updates `sentAt` on reminder documents to prevent repeats.

---

## 5. Adding New Features Safely

1. **Leverage existing services:** e.g., use `executePlannerActions` pattern for new planner actions.
2. **Maintain timezone correctness:** prefer `dayjs.tz` helpers (`toUtcIso`, `formatLocalTime`) instead of raw `Date`.
3. **Channel-aware notifications:** route through `notificationService` so user prefs + env flags apply.
4. **Sync UI via events or composables:** trigger refresh events when backend mutates key data.
5. **Document prompts and actions:** when adjusting AI prompts, keep schemas & fallbacks aligned to avoid silent no-op actions.

---

## 6. Quick Reference (Key Files)

| Capability | Frontend | Backend |
| --- | --- | --- |
| Talk-to-Planner UI | `src/views/TalkToPlanner.vue` | `routes/talkToPlannerRoutes.js`, `plannerAssistantService.js` |
| Task Planner dialog | `src/components/TaskPlannerDialog.vue` | `taskService.js`, `aiRoutes.js` |
| Voice transcription | `VoiceRecorder.vue`, `utils/backendRecorder.js` | `services/voiceHandler.js` |
| Time extraction | `services/aiService.js`, `services/time_context.js` | `services/openaiService.js` (`extractReminderTime`) |
| Reminders | `services/reminderService.js` | `services/reminderService.js`, `notificationService.js` |
| Notifications | `components/NotificationPrompt.vue`, `pushService.js` | `notificationService.js`, channel integrations |

---

Future contributors can treat this document as the living map of “who calls what.” When adding or refactoring features, link back here or update sections so the next person inherits an accurate snapshot. 
