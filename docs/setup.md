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

# Notification channels (set to `true` to enable)
ENABLE_WHATSAPP=true
ENABLE_EMAIL=true
ENABLE_PWA=true
ENABLE_VOICE=true
ENABLE_SMS=true

# Twilio senders (required when voice / WhatsApp are enabled)
TWILIO_WHATSAPP_NUMBER=whatsapp:+15551234567
TWILIO_VOICE_NUMBER=+15557654321

# Long-lived app/GPT tokens (required for GPT Actions + x-app-token auth)
APP_JWT_SECRET=replace-me-with-long-random-string
APP_JWT_TTL_DAYS=30

# GPT Actions client
GPT_ACTION_CLIENT_ID=plancraft-gpt
GPT_ACTION_CLIENT_SECRET=super-secret-client-value
# Optional: allow additional client IDs (comma-separated) so legacy tokens keep working during rotations.
GPT_ACTION_CLIENT_ID_ALIASES=
GPT_LINK_CODE_TTL_MIN=10
GPT_ACCESS_TOKEN_TTL_MIN=30
GPT_REFRESH_TOKEN_TTL_DAYS=30
```

The server runs on port 4000 by default (see `apps/backend-node/index.js`).

## Marketing: LinkedIn Campaign Enhancements

### 1) Current Campaign Overview

Metric | Value | Insights
--- | --- | ---
Spend | $19 | Small test budget, perfect for validation
Impressions | 879 | Healthy reach for a small audience
CPM | $21 | Normal for LinkedIn Consideration
Key Result | 6 website visits | ~$3.11/visit — great for cold traffic
Top Ads | 🧠 Work Smarter, Not Harder; ✨ Designed for Dreamers Who Execute | The second ad got 4 visits despite lower CTR → stronger intent

Traffic cross‑check (Mixpanel): 24 US visitors (Corpus Christi, Tulsa, Council Bluffs, NY) aligned with campaign timing.

### 2) What’s Working
- Aspirational productivity copy resonates with the audience
- Creative matches brand (“Dreamers who Execute”)
- CTR 0.56–1.2% is strong for cold traffic

### 3) Install LinkedIn Insight Tag (per‑session analytics + retargeting)

Add your partner id in the frontend env and Vite will auto‑inject the tag:

1. Set env var in `apps/audit-agent-frontend/.env*`:
```
VITE_LINKEDIN_PARTNER_ID=XXXXXX
```
2. Build/run as usual; `index.html` conditionally loads the tag when this var is set.

This enables audience building (e.g., “Visited but didn’t sign in”).

Optional conversion example (track a click):
```js
// anywhere in the app, after tag loads
window.lintrk && window.lintrk('track', { conversion_id: 'YOUR_CONVERSION_ID' })
```

### 4) Define Conversions in LinkedIn
- Create “Sign‑in Click” and “Upgrade Now” conversions in Campaign Manager.
- You’ll get a `conversion_id` for each → call `lintrk('track', { conversion_id })` on the click handlers.

### 5) Retargeting Playbook
After ~300 impressions:
- Objective: Conversions
- Audience: “Visited PlanCraftAI.com” (Insight Tag)
- Message: “You’ve seen how smart planning looks. Ready to unlock reminders?”
- Budget: $5/day; Expected CPC $1–2; Expected CVR 5–10%

### 6) Next A/B Headlines
1) 🎯 Plan Less. Achieve More — Meet Your AI Partner.
2) 🧩 Your Plans. Our AI. Perfect Sync.
3) 💭 Stop Overthinking. Start Executing with PlanCraftAI.

### 7) Target Narrowing (US)
- Location: United States
- Job functions: Founders, Students, PMs, Researchers
- Interests: Productivity tools, AI assistants, Planning software

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
