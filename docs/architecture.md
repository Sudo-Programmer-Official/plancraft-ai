## Architecture Overview

This project is a monorepo with a Vue 3 frontend and a Node/Express backend.

- Frontend: `apps/audit-agent-frontend`
  - Vue 3 + Vite + TailwindCSS
  - Element Plus UI library
  - Pinia for state where needed
  - AOS (Animate on Scroll) for landing page animations (lazy-loaded)
  - Firebase SDK for Auth and Firestore
- Backend: `apps/backend-node`
  - Express server with CORS
  - OpenAI SDK for enhancement, task summarization/splitting, and speech transcription
  - Multer memory storage for audio uploads
- Shared infra
  - Firestore (tasks, journalEntries)
  - Router guards for authenticated routes

### High-level Diagram

```mermaid
flowchart LR
  subgraph Client[Frontend (Vue 3)]
    VR[VoiceRecorder]
    MS[MorningSection]
    ES[EveningSection]
    TV[Daily/Weekly/Monthly Views]
  end

  subgraph Server[Backend (Express)]
    TR[/POST /api/transcribe/]
    JE[/POST /api/ai/journal/enhance/]
    TS[/POST /api/ai/tasks/summarize/]
    ST[/POST /api/ai/split-tasks/]
  end

  subgraph Data[Firebase]
    FS[(Firestore)]
  end

  VR -- Mobile chunks --> TR --> VR
  MS -- Generate tasks --> ST
  ES -- Enhance --> JE
  TV <-- fetch/save --> FS
  MS <-- fetch/save --> FS
  ES <-- save entries --> FS
```

### Data Flow
1. Voice input
   - Desktop Chrome/Edge: Web Speech API via `voiceHelper.js` gives interim + final text locally.
   - iOS/Android: `backendRecorder.js` records via `MediaRecorder`, streams chunks to `/api/transcribe`, and emits partial + final transcripts.
2. Enhancement (optional)
   - Evening/Journal send text to `/api/ai/journal/enhance` for a gentle, clearer version.
3. Task generation
   - Morning Planning posts text to `/api/ai/split-tasks`; backend returns inviting, action-verb tasks.
4. Persistence
   - `firebaseService.js` writes tasks/journal entries to Firestore with `userId`, `date`, and `order`.
5. UI updates
   - `useTasks.js` provides shared accessors to load today, or date/range, toggle, persist order, delete.

### Key Frontend Components
- `VoiceRecorder.vue` — orchestrates desktop (Web Speech) vs mobile (MediaRecorder + backend) paths; emits `transcribed`.
- `MorningSection.vue` — planning input + generate tasks via AI split; no enhanced display.
- `EveningSection.vue` — reflection with optional enhancement; saves to Firestore.
- `TaskBoard.vue` — draggable daily list; edit/delete, order persistence.
- `WeeklyView.vue` — week selector and per-day tasks, loads date range.
- `MonthlyView.vue` — calendar grid and tasks filtered by selected date.
- `LandingPage.vue` — calm, animated landing (AOS + Tailwind), dark mode ready.

### Backend Services
- `openaiService.js`
  - `enhanceJournalEntry` — mindful editing of journal text.
  - `summarizeTasks` — quick progress summary and focus.
  - `splitTasks` — convert freeform text to actionable tasks (verb-first, small, inviting).
  - Chat fallback helper uses `OPENAI_MODEL` + fallbacks.
- `transcribeRoutes.js`
  - `POST /api/transcribe` with model fallback list (`OPENAI_TRANSCRIBE_*`) to support projects without `whisper-1` access.

### Firestore Data Model (simplified)
```json
// tasks
{
  "id": "<doc id>",
  "userId": "<uid>",
  "title": "Draft plan for feature",
  "details": "Outline sections",
  "completed": false,
  "date": "YYYY-MM-DD",
  "order": 0,
  "logs": ["..."],
  "createdAt": <serverTimestamp>,
  "updatedAt": <serverTimestamp>
}

// journalEntries
{
  "id": "<doc id>",
  "userId": "<uid>",
  "text": "Enhanced or raw",
  "rawText": "Original (optional)",
  "mood": { "emoji": "😊", "label": "Happy" },
  "type": "evening|journal",
  "date": "locale string",
  "timestamp": 1712345678,
  "createdAt": <serverTimestamp>
}
```

