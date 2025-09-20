## Setup and Run

This repo contains a Vue 3 frontend and an Express backend.

### Requirements
- Node 18+ (recommended 20+)
- npm or pnpm
- Firebase project (for Auth + Firestore)
- OpenAI API key

### Frontend (Vue 3)
Path: `apps/audit-agent-frontend`

Install deps and start dev server:
```bash
cd apps/audit-agent-frontend
npm i
npm run dev
# or with pnpm
# pnpm i
# pnpm dev
```

Environment vars (create `.env` in `apps/audit-agent-frontend`):
```env
# Backend API base for AI routes (journal enhance, tasks, split)
VITE_API_BASE_URL=http://localhost:4000/api/ai

# Optional override for transcription endpoint base (maps to /api/transcribe)
# If not set, code derives http://localhost:4000/api from VITE_API_BASE_URL
# VITE_TRANSCRIBE_BASE_URL=http://localhost:4000/api
```

Firebase config lives in `src/firebase/init.js`. Adjust if needed for your own project.

### Backend (Express)
Path: `apps/backend-node`

Install and run:
```bash
cd apps/backend-node
npm i
npm run start   # or npm run dev with nodemon
```

Environment vars (create `.env` in `apps/backend-node`):
```env
NODE_ENV=development

# OpenAI core (enhance/summarize/split)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MODEL_FALLBACKS=gpt-4o,gpt-4.1-mini

# Transcription models (fallback tried in order if access is restricted)
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
OPENAI_TRANSCRIBE_FALLBACKS=gpt-4o-transcribe,whisper-1

# Dev convenience: allow any origin or Vite IPs on port 5173
ALLOW_DEV_ANY_ORIGIN=1
```

The server runs on port 4000 by default (see `apps/backend-node/index.js`).

### Deployment
- Frontend: Firebase Hosting or any static host (Vite build output)
  - Build: `npm run build`
  - Serve: `npm run preview` locally, then deploy to hosting
  - Ensure `VITE_API_BASE_URL` points to your deployed backend, e.g., `https://your-backend.example.com/api/ai`
- Backend: Render, Fly.io, Railway, or any Node host
  - Set all OpenAI envs on the hosting provider
  - If serving behind a domain, the frontend should reference it via `VITE_API_BASE_URL`

### Mobile vs Desktop Speech Notes
- Desktop Chrome/Edge use the Web Speech API (no backend cost for transcription; interim results supported).
- iOS Safari/Android Chrome fall back to `MediaRecorder` + backend `/api/transcribe`.
  - The frontend sends small audio chunks every ~2.5s for live partials, and a final full blob on stop.
  - Backend chooses the first accessible model from `OPENAI_TRANSCRIBE_MODEL` + fallbacks.
  - CORS must allow your frontend origin (IP-based origins during dev are handled via `ALLOW_DEV_ANY_ORIGIN=1`).

