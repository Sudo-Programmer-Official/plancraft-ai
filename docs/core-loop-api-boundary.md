# Core-Loop API Boundary: Dependency Map & /api/v1 Design

Status: **proposal, no code changed**. Date: 2026-09-30.

Scope: the mobile core loop only: auth → Today → Capture → task CRUD/complete → subtasks / AI help → reminders → push/device registration → Focus → workspace switch → profile.
Out of scope: Journal, Reports, Insights, Playbooks, Habits (except the completion hook), Links, Napkin, Knowledge, admin.

---

## 0. Headline findings

1. **Much of the backend boundary already exists.** Workspaces, Focus, native-push registration, settings/profile and AI help are already called over HTTP. **Tasks and the `users/{uid}` document are the only core-loop data the client still writes to Firestore directly.** So the job is smaller than "22 files": it's `services/firebaseService.js` (task functions) plus about 6 places that write `users/{uid}`.
2. **Task writes are orchestrated by the client and are not atomic.** One "save task" in `firebaseService.js` is: Firestore `addDoc`/`updateDoc` → `POST /tasks/announce` (reminder scheduling) → `POST /reminders/cancel` (on edits) → `POST /habits/log-completion` (on complete) → client-side recurring-task spawn (`ensureRecurringNextTask`, which does another add plus another update). If any step fails, the task and its reminder drift apart. Expo would have to copy all of this. It belongs in one server-side `TaskService` call.
3. **A hybrid path already exists.** On iOS-packaged builds the app creates tasks via `POST /tasks/create`, and reads fall back to `GET /tasks` (`fetchTasksWithApiFallback`). The API path already works in production. It just isn't the default.
4. **The identity resolver is roughly 70% built** (`backend-node/services/authIdentityService.js`, `authIdentities` collection, `/auth/identity/sync`, `/auth/native-session/exchange`). It never silently merges, and it returns 409 on conflict. Section 3 covers the gaps.
5. **Security issues to fix before (or with) slice 1.** These are independent of the migration:
   - **P0: users can make themselves admin or premium.** `firestore.rules` `match /users/{uid}` allows `update: if isUser(uid)` with no field restrictions. `requireAdmin` (backend) and `isAdmin()` (rules) both read `users/{uid}.role`, and `planService` reads `users/{uid}.plan`. Any signed-in user can run `setDoc(doc(db,'users',uid),{role:'admin',plan:'pro'},{merge:true})` from the browser console. The client even writes `plan` itself (`stores/authStore.js:1045`).
   - **P0: any workspace can be taken over via a legacy doc** (found in Slice 1). `users/{uid}/workspaces/{id}` was client-writable. `listUserWorkspaces` migrates those docs for users with no memberships. It overwrote `workspaces/{id}.ownerId` and granted the caller `admin`.
   - *Corrected in Slice 1:* `/api/carryover/*` has no guard of its own, but it is **not exploitable today**. `aiRoutes` (`router.use(requireAuth)`) and `subscriptionRoutes` (`ensureUserMatches`) are mounted at `/api` earlier, and their guards run on every later `/api` request. The protection depends on mount order.
   - P2 (unreachable today for the same reason): `aiRoutes.js:345` and `visionRoutes.js:22` fall back to `req.headers['x-user-id']`. `api.js` sends `x-user-id` / `x-user-email` / `x-user-role` on every request. The server should never read identity from these headers.
   - P2: `testRoutes.js` (`/api/test/notify`, …) is mounted in production.

---

## 1. Dependency map (core loop)

Legend: **FS** = direct Firestore from the client, **API** = already goes through backend-node.

| Journey step | View / component | Store / composable / service | Firebase operation | Data touched | Existing backend | Proposed v1 endpoint |
|---|---|---|---|---|---|---|
| Sign-in (Google/Apple/email/phone) | `LoginView.vue`, `SettingsView.vue` (link) | `stores/authStore.js` (2,785 lines) | `firebase/auth` SDK; **FS** `setDoc users/{uid}` ×8 (lines 1469, 1681, 1741, 2044, 2192, 2291, 2394, 2555) | `users/{uid}` profile fields, `mode`, `lastLoginAt`, `plan` | `/auth/identity/sync`, `/auth/native-session/exchange`, `/auth/refresh`, Apple start/callback, mobile-handoff | `POST /v1/session` (see §3); profile writes → `PATCH /v1/me` |
| Session bootstrap / profile listener | `App.vue`, `layouts/AppLayout.vue` | `authStore.init()` | **FS** `onSnapshot users/{uid}` (1247), `updateDoc users/{uid} {plan}` (1045) | `users/{uid}` | `/settings/profile` (GET) | `GET /v1/me` |
| Profile completion prompt | `AppLayout.vue:881`, `components/ProfileSetup.vue` | none | **FS** `setDoc`/`getDoc users/{uid}` | `users/{uid}.name, profileComplete` | `POST /settings/profile` | `PATCH /v1/me` |
| Guest → account | `utils/guestTasks.js` | none | **FS** `updateDoc users/{uid}`; `addTaskToFirebase` | `users/{uid}`, `tasks` | none | `POST /v1/tasks` (batch import); guest flags server-side |
| Today | `views/TodayHomeView.vue` | `composables/useTasks.js` → `firebaseService.fetchTasksForToday / fetchTasksByDate / fetchUnfinishedTasksBefore / moveTasksToDate` | **FS** `getDocs tasks where workspaceId, date`; `writeBatch` for carry-over | `tasks` | `GET /api/tasks?date=` (fallback today) | `GET /v1/tasks?date=`, `GET /v1/tasks?before=&completed=false`, `POST /v1/tasks:move` |
| Capture | `AppLayout.vue` capture sheet (`useCaptureSheet`), `TaskPlannerDialog.vue`, `TaskDialog.vue` | `aiService.splitTasks / extractTime` → `useTasks.addTask` → `addTaskToFirebase` | **FS** `addDoc tasks` then API `/tasks/announce` | `tasks`, `reminders` | `/split-tasks`, `/extract-time`, `/reminders/text`, `/tasks/create` | `POST /v1/capture/parse` (no write) + `POST /v1/tasks` |
| Task edit | `TaskDialog.vue`, `TaskBoard.vue`, `useTaskEdit.js`, `TodayHomeView.vue` | `updateTaskInFirebase` | **FS** `updateDoc tasks/{id}`; then `/reminders/cancel` + `/tasks/announce` | `tasks`, `reminders` | `/tasks/announce`, `/reminders/cancel` | `PATCH /v1/tasks/:id` (server reschedules reminder) |
| Complete | `TodayHomeView.vue`, `TaskBoard.vue`, `ReminderDueBanner.vue` | `useTasks.toggleComplete` → `updateTaskInFirebase` + `ensureRecurringNextTask` + `/habits/log-completion` | **FS** `updateDoc` ×2, `addDoc` | `tasks`, `habits*`, `reminders` | `PATCH /tasks/:id/completion` (fallback only) | `POST /v1/tasks/:id/complete`, `POST /v1/tasks/:id/reopen` |
| Delete | same | `deleteTaskFromFirebase` | **FS** `deleteDoc` (no reminder cancel!) | `tasks` (+ orphaned `reminders`) | none | `DELETE /v1/tasks/:id` |
| Subtasks | `TaskDialog.vue`, `TaskPlannerDialog.vue` | `addTaskToFirebase({parentTaskId})` | **FS** `addDoc` | `tasks.parentTaskId` | none | `GET/POST /v1/tasks/:id/subtasks` |
| AI help | `TodayHomeView.vue` (Sparkles), `TaskPlannerDialog.vue` | `aiService.splitTasks`, `summarize`; `workspaceAiService.askWorkspaceSummary` | API | none | `/split-tasks`, `/tasks/summarize`, `/talk/chat` | `POST /v1/tasks/:id/ai-help` |
| Reminders (server) | `RemindersOverview.vue`, `AiRemindersView.vue` | `services/reminderService.js` | API (+ `updateTaskInFirebase`) | `reminders` | `/reminders` GET, `/reminders/text`, `/reminders/cancel` | `GET /v1/reminders`, `GET/PUT/DELETE /v1/tasks/:id/reminder` |
| Reminders (local) | `SetupPrompt.vue` | `services/nativeReminderService.js` (432 lines) → `fetchAllTasksForWorkspace`, `getPreferences` | **FS** `getDocs tasks`, `getDoc preferences/{uid}` | `tasks`, `preferences` | none | `GET /v1/reminders?window=` (device syncs its local schedule from this) |
| Push / device | `SettingsView.vue`, `SetupPrompt.vue` | `nativePushService.js`, `pushService.js`, `firebase/messaging.js` | API for native; **FS** `setDoc users/{uid}.fcmToken` (web FCM) | `users/{uid}/nativePushDevices`, `users/{uid}.pushToken` (legacy), `users/{uid}.fcmToken` | `/settings/native-push/register|status|revoke|test`; `/push/register` (nested under `subscriptionRoutes`) | `PUT /v1/devices/:deviceId`, `DELETE /v1/devices/:deviceId`, `POST /v1/devices/:deviceId/test` |
| Focus | `TodayHomeView.vue`, `ReminderDueBanner.vue` | `stores/focusStore.js` → `focusService.js` | API | `focus_sessions` | `POST /focus/sessions` | `POST /v1/focus-sessions` (reuse as is) |
| Workspace switch | `WorkspacesView.vue`, shell | `stores/workspaceStore.js` → `services/workspaceService.js` | API | `workspaces`, `workspace_members` | full CRUD in `workspaceRoutes.js` | `GET /v1/workspaces` (reuse); active workspace moves from `localStorage`/header to an explicit path/query param |
| Preferences | `TaskDialog.vue`, `TaskBoard.vue`, `DashboardView.vue` | `firebaseService.getPreferences` | **FS** `getDoc preferences/{uid}` | `preferences/{uid}` | `/settings/preferences` (reads `users/{uid}.preferences`, a *different* doc) | `GET/PATCH /v1/me/preferences`; merge the two stores |

Not in the core loop but they call the same task functions (they'll pick up the new client for free): `DashboardView`, `MonthlyView`, `WeeklyView`, `MorningView`, `PlannerView`, `TalkToPlanner`, `NapkinView`, `KnowledgePanel`, `ReportsView`.
Journal, links, public notifications and blogs stay on Firestore for now.

---

## 2. Existing backend to reuse (don't duplicate)

| Asset | Reuse as |
|---|---|
| `services/taskService.js` `createTask`, `scheduleTaskReminder`, `advanceRecurringTask` | The core of `/v1/tasks`. The server version of recurring-spawn already exists, so the client's `ensureRecurringNextTask` gets deleted. |
| `routes/taskRoutes.js` `toTaskPayload`, `mapTaskDoc`, `listTasksForScope`, `/completion` handler | Starting point for v1 handlers and the response mapper |
| `middleware/workspace.js` `requireWorkspaceRole` | Workspace authorization for every v1 route |
| `middleware/auth.js` `attachAuth`/`requireAuth` | Keep the Firebase ID token + app-token verification. Add identity resolution (§3). |
| `services/authIdentityService.js` | The identity resolver. Extend it, don't replace it. |
| `services/reminderService.js`, `jobs/*`, `scheduler.js` | Reminder queue and delivery, unchanged |
| `services/workspaceService.js` + routes | Already a clean API. Alias it under `/v1` without rewriting. |
| `routes/focusRoutes.js` | Already correct (it checks task ownership) |
| `settingsRoutes.js` native-push handlers | Logic moves into `/v1/devices` |
| `aiRoutes.js` `/split-tasks`, `/extract-time`, `/tasks/summarize`; `aiProviderRouter.js`; `planService.checkUserPlanUsage` | Behind `/v1/capture/parse` and `/v1/tasks/:id/ai-help` |
| `services/planService.js`, `entitlements.js` | Server-only entitlement checks (once §0.5 is fixed) |

---

## 3. Canonical identity model

### What exists today
- `authIdentities/{provider:providerUid}` → `{ canonicalUserId, sourceUid, provider, providerUid, verified, linkedAt, lastSeenAt }`
- `users/{canonicalUserId}.authProviders.{provider}` mirror
- Only identities verified by the provider are recorded (from Firebase token claims). User-typed phone/email fields can only *block* a login as a collision signal. They never select or merge an account.
- `/auth/native-session/exchange` resolves to the canonical ID and mints a Firebase **custom token for the canonical UID**, so the Firebase UID *is* the canonical ID after the exchange.

### Gaps
1. **Canonicalization only happens on the exchange path** (phone OTP, native email). Google, Apple and web email call `/auth/identity/sync` and **ignore the `uid` it returns** (`authStore.js:1489, 1538, 1703, 2287, 2390, 2535`). If one of those identities ever maps to a different canonical ID, the client keeps running as the source UID.
2. **The server never resolves identity per request.** `attachAuth` trusts `decoded.uid`. The system is correct only because the exchange made the Firebase UID equal the canonical ID.
3. **No explicit link/unlink API.** Linking happens as a side effect of Firebase `linkWithCredential` on the client.
4. The fallback path for the `x-user-id` header (§0.5).

### Proposed model
```
PlanCraftUser   users/{userId}            userId = today's canonical Firebase UID (opaque string)
UserIdentity    authIdentities/{provider:providerUid}
                  { userId, provider: google|apple|password|phone, providerUid,
                    verified: true, linkedAt, lastSeenAt, sourceFirebaseUid }
```
**I recommend against renumbering to `usr_…` IDs.** Every task, reminder, membership and focus session is already keyed by the current UID. Renumbering would be a full data migration with nothing to show for it. What matters is that the ID is *owned by PlanCraft*: a future Cognito (or other) login resolves through `authIdentities` to the same `userId`. The ID's format doesn't matter.

### Rules
| Case | Behavior |
|---|---|
| Sign in, identity unknown | Create `users/{sourceUid}` + identity row. `userId = sourceUid`. |
| Sign in, identity known | `userId = identity.userId`. If it differs from the Firebase UID, return `customToken` so the client re-signs in as `userId` (today's exchange behavior, now applied on **every** provider path). |
| Signed in as A, link identity I (unknown) | Attach I to A. `POST /v1/me/identities`, requires a fresh token for I. |
| Signed in as A, link identity I (owned by B) | **409 `identity_conflict`**. Nothing is merged. The response says which provider conflicted (masked), never B's data. |
| Signed in as A, link, legacy profile field matches another user | 409 (existing legacy-phone check). Never auto-select. |
| Account merge (A + B) | **Not automatic.** A future explicit flow: user proves both identities in one session, then an async server job moves the data. Out of scope for v1. |
| Unlink | Allowed only if ≥1 other verified identity remains. |
| Anonymous guest → real account | Guest UID is linked (Firebase link) so data stays. If the credential is already in use, sign into the existing account and import guest tasks via `POST /v1/tasks:import`. That replaces today's client `guestTasks.js`. |

---

## 4. `/api/v1` contract (minimum core loop)

### Conventions
- Base `/api/v1`. JSON. Mounted alongside legacy routes, which stay untouched.
- **Auth:** `Authorization: Bearer <Firebase ID token>` (or `x-app-token`). Server derives `userId` via resolver. **Never** from body, query, or `x-user-*` headers; `userId` is not accepted in any v1 request.
- **Workspace:** task-scoped routes take `workspaceId` from the task itself (loaded server-side). List/create take `?workspaceId=` / body `workspaceId` explicitly. The server checks membership via `requireWorkspaceRole`. Roles: read = viewer+, write = editor+, delete = admin+ (mirrors current rules).
- **Errors:** `{ "error": { "code": "task_not_found", "message": "...", "details"?: {} } }`. Codes: `unauthenticated` 401, `forbidden` / `workspace_forbidden` 403, `not_found` 404, `identity_conflict` 409, `version_conflict` 409, `validation_failed` 422, `plan_limit_reached` 403 (keeps the existing upgrade banner working), `rate_limited` 429.
- **Idempotency:** `Idempotency-Key` header required on `POST /tasks`, `POST /tasks:import`, `POST /tasks/:id/subtasks`, `POST /focus-sessions`. Stored for 24h per `(userId, key)`. A replay returns the original response. This matters on mobile, where retries happen after timeouts.
- **Concurrency:** tasks carry `version` (int). `PATCH` accepts `If-Match: <version>` and returns 409 `version_conflict` on mismatch. Optional in v1, but web and mobile editing the same task needs it.
- **Pagination:** cursor-based `?limit=50&cursor=…` → `{ items, nextCursor }` on the unbounded lists (`/tasks` without a date, `/reminders`). Single-date lists are unpaginated.
- **Time semantics:**
  - `date`: `YYYY-MM-DD`, the user's calendar day (no TZ).
  - `dueTime`: `HH:mm` wall-clock or null.
  - `timezone`: IANA, **stored per task** at create time (defaults to profile TZ, then the `X-Timezone` header).
  - `reminder.fireAt`: ISO-8601 UTC, **computed by the server** from `date + reminder.time − offsetDays` in `timezone`. Clients never compute `fireAt`.
  - "Today" is always passed explicitly by the client (`?date=`), because only the device knows the user's current day. The server doesn't guess.

### Schemas (zod-style, to live in `packages/contracts`)
```ts
Task = {
  id: string; workspaceId: string; parentTaskId: string | null;
  title: string /*1..160*/; details: string /*≤1000*/;
  category: string; priority: 'low'|'medium'|'high'|null;
  date: YMD | null; dueTime: HHmm | null; timezone: IANA;
  durationMinutes: number | null; order: number;
  completed: boolean; completedAt: ISO | null;
  repeat: { freq:'daily'|'weekly'|'monthly'|'weekdays'; interval:number; byDay?: string[] } | null;
  reminder: Reminder | null;
  subtaskCount: number; subtaskCompletedCount: number;
  source: 'manual'|'capture'|'ai'|'recurring'|'import'|string;
  createdBy: string; createdAt: ISO; updatedAt: ISO; version: number;
}
Reminder = { id: string; time: HHmm; offsetDays: number; channels: ('push'|'email'|'sms'|'whatsapp')[];
             fireAt: ISO; status: 'scheduled'|'sent'|'canceled'|'failed' }
TaskCreate = Pick<Task,'workspaceId'|'title'> & Partial<Pick<Task,'details'|'category'|'priority'|'date'|'dueTime'|'timezone'|'durationMinutes'|'order'|'repeat'|'parentTaskId'>> & { reminder?: { time: HHmm; offsetDays?: number; channels?: Channel[] } | null }
TaskPatch  = Partial<Omit<TaskCreate,'workspaceId'|'parentTaskId'>>   // workspaceId immutable, as in today's rules
```
Legacy fields (`reminderTime`, `scheduledTime`, `channels`, `reminderChannels`, `deliveryChannels`, `timeHint`, `timeRelation`, `timeMeta`, `estimate_minutes`, `repeatMeta`, `metadata`) are **mapped by the server** from stored docs. They are not exposed in v1, and they stay in Firestore for the legacy clients.

### Endpoints
| Method & path | Auth / role | Request | Response | Notes |
|---|---|---|---|---|
| `POST /v1/session` | Firebase token | `{ provider }` | `{ user: Me, customToken?: string }` | Replaces `/auth/identity/sync` + `/native-session/exchange`. Runs on **every** sign-in. 409 `identity_conflict`. |
| `GET /v1/me` | user | none | `Me = { id, name, email, phone, photoUrl, timezone, plan, entitlements, identities: {provider, maskedId, linkedAt}[], defaultWorkspaceId, profileComplete }` | `plan`/`entitlements` computed server-side, read-only |
| `PATCH /v1/me` | user | `{ name?, photoUrl?, timezone?, defaultWorkspaceId? }` | `Me` | Whitelisted fields only |
| `GET/PATCH /v1/me/preferences` | user | notification/reminder prefs | prefs | Unifies `preferences/{uid}` and `users/{uid}.preferences` |
| `POST /v1/me/identities` | user + fresh provider token | `{ provider, idToken }` | `Me` | 409 on conflict |
| `DELETE /v1/me/identities/:provider` | user | none | `Me` | 422 if it would remove the last identity |
| `GET /v1/workspaces` | user | none | `{ items: {id,name,role,plan,isPersonal}[] }` | Alias of existing |
| `GET /v1/workspaces/:id` | viewer+ | none | workspace | Alias of existing |
| `GET /v1/tasks` | viewer+ | `?workspaceId&date` \| `?workspaceId&from&to` \| `?workspaceId&before&completed=false` \| `?workspaceId&cursor&limit`; `includeSubtasks=false` default | `{ items: Task[], nextCursor? }` | Top-level tasks only unless `parentTaskId=` given |
| `POST /v1/tasks` | editor+ | `TaskCreate` + `Idempotency-Key` | `201 Task` | One server transaction: write task, schedule reminder, analytics |
| `GET /v1/tasks/:id` | viewer+ | none | `Task & { subtasks: Task[] }` | |
| `PATCH /v1/tasks/:id` | editor+ | `TaskPatch`, `If-Match?` | `Task` | Server reschedules/cancels the reminder if date/time/tz/reminder changed |
| `DELETE /v1/tasks/:id` | editor+ own task, admin+ any | none | `204` | Cancels reminders; cascades to subtasks (soft-delete, `deletedAt`) |
| `POST /v1/tasks/:id/complete` | editor+ (viewer if assignee, matching today's completion route) | `{ completedAt?: ISO }` + `Idempotency-Key` | `{ task: Task, nextOccurrence: Task \| null }` | Server spawns the recurring task, cancels pending reminders, logs the habit. Idempotent. |
| `POST /v1/tasks/:id/reopen` | editor+ | none | `Task` | |
| `POST /v1/tasks:move` | editor+ | `{ workspaceId, taskIds: string[] ≤100, date: YMD, reason: 'carryover'\|'reschedule' }` | `{ moved: Task[], skipped: {id, reason}[] }` | Replaces `moveTasksToDate` **and** the unauthenticated `/carryover/*` |
| `POST /v1/tasks:import` | editor+ | `{ workspaceId, tasks: TaskCreate[] ≤200 }` + `Idempotency-Key` | `{ created: Task[] }` | Guest → account |
| `GET /v1/tasks/:id/subtasks` | viewer+ | none | `{ items: Task[] }` | Ordered |
| `POST /v1/tasks/:id/subtasks` | editor+ | `{ items: {title, order?}[] ≤20 }` + `Idempotency-Key` | `{ items: Task[] }` | Inherits workspace/date/tz from parent. Max depth 1. |
| `POST /v1/tasks/:id/ai-help` | editor+ | `{ action: 'get_started'\|'break_down'\|'plan', apply?: boolean }` | `{ suggestion: { steps?: {title, minutes?}[], firstStep?: string, plan?: string }, created?: Task[] }` | Uses `aiProviderRouter` + `checkUserPlanUsage`. `apply=true` creates subtasks in the same call. 403 `plan_limit_reached`. |
| `POST /v1/capture/parse` | user | `{ text?, audioUrl?, attachments?, workspaceId, date: YMD, timezone }` | `{ drafts: TaskCreate[] }` | Wraps `/split-tasks` + `/extract-time`. **Writes nothing.** The client confirms, then calls `POST /v1/tasks`. |
| `GET /v1/reminders` | user | `?workspaceId&from&to` (ISO), `cursor` | `{ items: (Reminder & {taskId, taskTitle})[], nextCursor? }` | Devices use `from=now&to=now+7d` to rebuild their local notification schedule |
| `PUT /v1/tasks/:id/reminder` | editor+ | `{ time, offsetDays?, channels? }` | `Reminder` | Convenience. Same logic as PATCH. |
| `DELETE /v1/tasks/:id/reminder` | editor+ | none | `204` | |
| `PUT /v1/devices/:deviceId` | user | `{ platform:'ios'\|'android'\|'web', pushProvider:'apns'\|'fcm'\|'expo'\|'webpush', pushToken, permission:'granted'\|'denied'\|'provisional', appVersion, locale, timezone }` | `Device` | Upsert, idempotent by design. Replaces `native-push/register`, `/push/register`, `messaging.js` `fcmToken`. Writes legacy `users/{uid}.pushToken` until senders migrate. |
| `DELETE /v1/devices/:deviceId` | user | none | `204` | On logout |
| `POST /v1/devices/:deviceId/test` | user | none | `{ delivered: boolean, provider }` | |
| `POST /v1/focus-sessions` | editor+ on task | existing `normalizeFocusSession` body + `Idempotency-Key` | `FocusSession` | Alias of `/focus/sessions` |

The `expo` push provider is included so that when Expo arrives, the notification worker only needs another sender, not a new data model.

---

## 5. Shared packages (deliberately minimal)

```
packages/
  contracts/   zod schemas + inferred TS types from §4, error codes. Zero runtime deps beyond zod.
  api-client/  typed fetch wrapper: base URL, token provider injected by caller, Idempotency-Key helper,
               error normalization. No Vue, no Pinia, no Firebase SDK import.
  date-utils/  YMD/HHmm parsing and formatting, "today in tz". Pure functions.
```
Not shared, and server-only: task-creation rules, recurrence, reminder `fireAt` computation, authorization, identity resolution, entitlements, AI routing.
The Vue app is JS. It can consume `api-client` as ESM without converting anything to TS. `backend-node` validates requests with the same `contracts` schemas.

---

## 6. Incremental implementation sequence

The web and Capacitor app keep working at every step. Legacy routes are never changed in place.

**Slice 0: security (independent, ship first)**
- Lock `users/{uid}` rules: clients may update only whitelisted fields (`name`, `photoURL`, `timezone`, `profileComplete`, `lastLoginAt`, …). `role`, `plan`, `planLimits`, `authProviders`, `canonicalUserId`, `entitlements*` become server-only. Remove the client `plan` write in `authStore.js:1045`.
- Add `requireAuth` + `ensureUserMatches` to `carryoverRoutes.js`.
- Remove the `x-user-id` fallbacks in `aiRoutes.js:345` and `visionRoutes.js:22`. Gate `testRoutes` behind `NODE_ENV !== 'production'` or admin.
- Check first: grep for any client code that legitimately writes `role`/`plan`, and run the Firestore rules emulator tests.

**Slice 1: identity**
- `POST /v1/session` (wraps `resolveVerifiedAuthIdentity` + custom-token minting). Resolution moves into `requireAuth` via a cached `firebaseUid → userId` lookup.
- `authStore`: every provider path calls `/v1/session` and honors `customToken`. `GET/PATCH /v1/me` replaces the 8 direct `setDoc users/{uid}` calls and the `onSnapshot` (poll on focus/resume, or keep a read-only listener).
- Acceptance: Google + phone + Apple on the same person produce one `userId`. A conflicting link gets a 409 and changes no data.

**Slice 2: tasks**
- `/v1/tasks*` + `contracts` + `api-client`.
- Swap the internals of `firebaseService.js` task functions to call v1, **keeping their signatures**, so all ~25 callers are untouched. Delete client orchestration (`syncTaskNotification`, `ensureRecurringNextTask`, the reminder-cancel and habit-log calls).
- Put this behind a feature flag (`featureFlagsService`) so it can be switched back per user.
- Once the flag is fully rolled out, tighten Firestore rules: `tasks` create/update/delete → server-only, read kept temporarily.

**Slice 3: reminders + devices**
- `/v1/reminders`, `/v1/devices`. `nativeReminderService` rebuilds its local schedule from `GET /v1/reminders` instead of reading `tasks` + `preferences` from Firestore. `messaging.js` stops writing `fcmToken`.

**Slice 4: workspaces, profile/preferences, focus, AI help, capture**
- Mostly aliasing existing routes under `/v1`, plus `ai-help` and `capture/parse`. Merge the two preference stores.

**Slice 5: Vue core loop fully on the API**
- Remove the remaining core-loop Firestore imports. Firestore rules for `tasks` and `users` become read-only or server-only.
- **This is the gate for starting `apps/mobile` (Expo).** Expo consumes only `packages/api-client` and never imports `firebase/firestore`; its Firebase dependency is Auth only.

---

## 7. Open questions for review

1. **Real-time updates.** The web uses `dispatchTaskRefresh` events and polling, not Firestore listeners, for tasks. Is polling on focus/resume acceptable for v1, or do we need SSE/WebSocket for multi-device live updates?
2. **Offline.** The Firestore SDK gave the web an offline cache for free. Does the mobile v1 need offline capture? If yes, add a client outbox keyed by `Idempotency-Key`. The contract already supports it.
3. **Legacy personal tasks** (no `workspaceId`, readable via `isLegacyPersonalTask`): migrate them into each user's personal workspace before slice 2, or expose them read-only?
4. **Role for completing.** Should viewers be able to complete tasks assigned to them? The current `/completion` route allows viewer+, while the rules require editor+.
