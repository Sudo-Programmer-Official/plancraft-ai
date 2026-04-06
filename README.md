# PlanCraftAI

PlanCraftAI is a voice-first productivity platform for individuals and teams. It turns spoken or typed input into structured tasks, reminders, journal entries, goals, and workspace actions across web, PWA, and packaged mobile apps.

## What the application includes

- Voice planning and conversational "Talk to Planner" flows
- Daily, weekly, monthly, and timeline planning views
- Journal, evening reflection, reports, and meeting prep
- Goals, habits, reminders, and notification delivery
- Google Calendar integration and GPT linking flows
- Workspaces with invites, roles, and shared planning
- Creator and leader surfaces backed by separate services
- Capacitor-based iOS and Android shells

## Monorepo layout

| Path | Purpose |
| --- | --- |
| `apps/audit-agent-frontend` | Main Vue 3 application, PWA, marketing pages, authenticated app surfaces |
| `apps/backend-node` | Express API gateway for auth, tasks, reminders, billing, journals, workspaces, AI, and integrations |
| `mobile` | Capacitor wrapper, native Android/iOS projects, Fastlane release tooling |
| `services/goals-service` | Goal CRUD, milestone suggestions, reflections, and task linking |
| `services/habit-service` | Habit tracking, streaks, insights, and coaching |
| `services/ai-nlp-service` | AI generation endpoints for creator and growth workflows |
| `services/creator-service` | Creator planning, editorial workflows, repurposing, publishing prep |
| `services/growth-service` | Outreach, contacts, leader workflows, and campaign support |
| `services/posting-service` | Social auth, scheduling, and publishing |
| `shared/*` | Shared components, utilities, LLM helpers, and API clients |
| `docs` | Setup, architecture, API, deployment, and product notes |

## Stack

- Frontend: Vue 3, Vite, Tailwind CSS v4, Element Plus, Pinia, Firebase Web SDK
- Backend: Node.js, Express, Firebase Admin, OpenAI, Stripe, Twilio, Web Push
- Mobile: Capacitor 8, Fastlane, native iOS and Android projects
- Data and auth: Firestore, Firebase Auth, Firebase Cloud Messaging

## Requirements

- Node.js 20+ for frontend and backend development
- Node.js 22+ if you work in `mobile/`
- `pnpm` for workspace installs, or `npm` inside individual packages
- Firebase project credentials
- OpenAI API key
- Optional provider credentials for Google Calendar, Apple sign-in, Twilio, Stripe, LinkedIn, Meta, X, and similar integrations

## Quick start

### Workspace install

```bash
pnpm install
```

If you prefer `npm`, install dependencies inside each app or service you plan to run. `mobile/` is managed separately from the pnpm workspace, so install it with `cd mobile && npm install` when needed.

### Core local stack

Run these in separate terminals:

```bash
pnpm --filter audit-agent-frontend dev
pnpm --filter backend-node dev
pnpm --filter goals-service dev
```

Expected local endpoints:

- Frontend: `http://localhost:5173`
- Backend gateway: `http://localhost:4000`
- Goals service: `http://localhost:4502` when `GOALS_SERVICE_PORT=4502`

### Optional local services

These power creator, leader, habits, and social publishing flows:

```bash
pnpm --filter habit-service dev
pnpm --filter ai-nlp-service dev
pnpm --filter creator-service dev
pnpm --filter growth-service dev
pnpm --filter posting-service dev
```

Notes:

- `habit-service` defaults to port `8081`.
- `ai-nlp-service`, `creator-service`, `growth-service`, and `posting-service` default to port `8080`. If you run more than one locally, assign unique `PORT` values in each service environment.
- The frontend can point to these services through `VITE_*_API_BASE` variables or a local reverse proxy.

## Environment setup

### Frontend

Create `apps/audit-agent-frontend/.env` with the API targets you need:

```env
VITE_API_BASE_ROOT=http://localhost:4000/api
VITE_API_BASE_URL=http://localhost:4000/api/ai
VITE_GOALS_API_BASE=http://localhost:4502/api/goals
```

Firebase config can be overridden with `VITE_FIREBASE_*` variables. The app currently includes safe defaults for the existing project, but you should set your own values for a different Firebase environment.

Useful optional variables:

- `VITE_SITE_URL`
- `VITE_VAPID_PUBLIC_KEY`
- `VITE_LINKEDIN_PARTNER_ID`
- `VITE_CREATOR_API_BASE`
- `VITE_POSTING_API_BASE`
- `VITE_NLP_API_BASE`
- `VITE_GROWTH_API_BASE`

### Backend

Create `apps/backend-node/.env` and set at least:

```env
PORT=4000
ALLOW_DEV_ANY_ORIGIN=1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
GOALS_SERVICE_URL=http://localhost:4502/api/goals
APP_JWT_SECRET=replace-me
GPT_ACTION_CLIENT_ID=plancraft-gpt
GPT_ACTION_CLIENT_SECRET=replace-me
```

Add Firebase Admin credentials plus any integration credentials you need for reminders, billing, calendar sync, or mobile auth.

### Goals service

Create `services/goals-service/.env`:

```env
GOALS_SERVICE_PORT=4502
GOALS_SERVICE_ALLOWED_ORIGINS=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT=
GOALS_FIREBASE_CREDENTIAL_PATH=../backend-node/firebase-service-account.json
OPENAI_API_KEY=sk-...
GOALS_TASK_SERVICE_URL=http://localhost:4000/api/tasks/create
```

For the optional services, start from each folder's `.env.example` and service `README.md`.

## Render deploy notes

Do not deploy this repo on Render from `/` with build command `yarn`.

The monorepo root is a `pnpm` workspace:
- [package.json](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/package.json)
- [pnpm-workspace.yaml](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/pnpm-workspace.yaml)

If Render tries to run `yarn` at the root, it will fail on the workspace package manager check before it installs the service you actually want.

Use app-level Render services instead:

### Backend service

- Root Directory: `apps/backend-node`
- Build Command: `npm install`
- Start Command: `npm start`

This works because [apps/backend-node/package.json](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/apps/backend-node/package.json) is a standalone Node service with its own `package-lock.json`.

### Frontend service

- Root Directory: `apps/audit-agent-frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

If you intentionally deploy from the repo root, use `pnpm`, not `yarn`:

```bash
corepack enable
pnpm install
```

## Mobile app

The mobile shell lives in `mobile/` and packages the frontend build with Capacitor.

- App ID: `com.sudoprogrammer.plancraftai`
- App name: `PlanCraftAI`
- Web bundle path: `apps/audit-agent-frontend/dist`

Typical workflow:

```bash
pnpm --filter audit-agent-frontend build
cd mobile
npm install
npx cap sync
```

Useful mobile scripts:

```bash
npm run ios:splash
npm run ios:testflight
```

See `docs/mobile-deployment.md` for release steps and signing notes.

## Key docs

- `docs/setup.md` - local setup and environment notes
- `docs/system-overview.md` - current application architecture snapshot
- `docs/architecture.md` - frontend/backend flow summary
- `docs/api.md` - backend API reference
- `docs/mobile-deployment.md` - iOS and Android release workflow
- `docs/app-store-listing.md` - App Store metadata and positioning

## Development notes

- The frontend Vite dev server proxies `/api` to `http://localhost:4000`.
- Creator and posting flows can also be routed through `/creator-api` and `/posting-api` or direct `VITE_*_API_BASE` values.
- Some older package names and content files still contain legacy naming, but the active product name and mobile bundle are `PlanCraftAI`.
