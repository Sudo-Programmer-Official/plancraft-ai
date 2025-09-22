# 📋 Codex Task Board – PlanCraftAI

## ✅ Completed

* [x] Journal.vue page (textarea, date, save to Firebase)
* [x] Firebase SDK config
* [x] Basic Planner.vue UI

## 🧪 In Progress

* [ ] Auth.vue with Supabase login
* [ ] GPT Formatter (text cleanup + summary)
* [ ] Firebase Admin config (backend)

## 🛠️ To Do – Frontend

### 1. Create `VoiceInput.vue` (Mic, record, transcribe)

**Branch**: `feature/voice-input`
**Codex Prompt**:

> Create `VoiceInput.vue` in Vue 3. Add a mic button that records audio, transcribes voice to text using the Web Speech API, and emits the result to parent. Style with TailwindCSS and Element Plus. Mobile-first.

---

### 2. Create `LogCard.vue` (emoji, date, summary)

**Branch**: `feature/log-card`
**Codex Prompt**:

> Build `LogCard.vue` in Vue 3. Show journal summary with mood emoji, date (top right), and short text. Responsive with TailwindCSS and Element Plus.

---

### 3. Build `Logs.vue` timeline view using cards

**Branch**: `feature/logs-ui`
**Codex Prompt**:

> Create `Logs.vue` page in Vue 3. Display journal logs using `LogCard.vue`, grouped by date. Fetch from Firebase. Add filters for mood/date. Tailwind layout with scrollable timeline.

---

### 4. UI Polish (Tailwind pass + mobile breakpoints)

**Branch**: `feature/ui-polish`
**Codex Prompt**:

> Go through existing pages (Journal.vue, Planner.vue, Auth.vue). Polish UI using Tailwind spacing, colors, responsive breakpoints. Ensure mobile friendliness and visual consistency.

---

### 5. Carry Forward Flow UI (Planner.vue enhancements)

**Branch**: `feature/planner-enhance`
**Codex Prompt**:

> Update `Planner.vue`. Add checkboxes for today’s tasks. If a task is unchecked by EOD, automatically copy it to "Tomorrow". Add section toggles and Tailwind animation.

---

### 6. Settings.vue page (user info, preferences)

**Branch**: `feature/settings-ui`
**Codex Prompt**:

> Build `Settings.vue` in Vue 3. Display user profile info from Firebase Auth. Let user change display name, theme (dark/light), and delete account. Tailwind layout + Element Plus forms.

---

### 7. Add NotFound.vue and Loading.vue (optional)

**Branch**: `feature/404-loading`
**Codex Prompt**:

> Create `NotFound.vue` and `Loading.vue` components in Vue 3. Use simple Tailwind designs. `Loading.vue` should have a spinner and tip; `NotFound.vue` should show 404 text with a "Go Home" button.

---

## 🛠️ To Do – Backend (Node.js + Firebase Admin)

### 8. Set up Express REST API `/logs` routes

**Branch**: `feature/logs-api`
**Codex Prompt**:

> In backend-node, create `/logs` Express route. Support POST (save log), GET (fetch logs by userId). Validate Firebase token via middleware. Use Firebase Admin SDK to access Firestore `logs` collection.

---

### 9. Add Firebase Admin SDK for writes/reads

**Branch**: `feature/firebase-admin`
**Codex Prompt**:

> Configure Firebase Admin SDK in `backend-node`. Add service account JSON, initialize app. Create utility to read/write `logs` and `users` collections.

---

### 10. GPT log formatter endpoint (`POST /format`)

**Branch**: `feature/gpt-formatter-api`
**Codex Prompt**:

> Add Express route `/format`. Accept raw log text, pass to GPT API, return structured reflection (summary, tone, highlights). Use OpenAI SDK. Validate input, handle failures.

---

### 11. API route to fetch logs by date

**Branch**: `feature/logs-by-date`
**Codex Prompt**:

> Extend `/logs` GET API to support `?date=YYYY-MM-DD` filter. Return logs for that user and date. Use Firebase queries. Handle empty results.

---

### 12. Middleware for auth (Firebase token check)

**Branch**: `feature/auth-middleware`
**Codex Prompt**:

> Create Express middleware that verifies Firebase ID token from Authorization header. Attach `userId` to `req.user`. Use Firebase Admin. Apply to all secure routes.

---

### 13. Error handling utils

**Branch**: `feature/error-utils`
**Codex Prompt**:

> Create `utils/errorHandler.js`. Export middleware to catch errors and send JSON response. Format: `{ error: true, message: "..." }`. Use across all routes.

---

## 🧪 Optional / Future

### 14. Mood detection via GPT

**Branch**: `feature/mood-detector`
**Codex Prompt**:

> Create `/detect-mood` route. Send user log to GPT. Return mood label (happy, sad, anxious). Integrate into save log flow.

---

### 15. Voice transcription using Whisper

**Branch**: `feature/whisper-api`
**Codex Prompt**:

> Add `/transcribe` endpoint. Accept audio blob, send to Whisper API, return transcript. Add retry and language support.

---

### 16. Reminder feature (daily check-in)

**Branch**: `feature/reminders`
**Codex Prompt**:

> Create daily check-in scheduler (cron or Firebase function). Notify user if no log is written by evening. Add toggle in Settings.vue.

---

Let me know if you want to **generate the branch commands and task files automatically** next.
