# Marketing Agent

PlanCraftAI's marketing automation microservice for orchestrating Reddit, LinkedIn, Twitter/X, Facebook, WhatsApp, and Email campaigns with BullMQ scheduling and Firebase analytics.

## Features
- Express API with `/api/post`, `/api/campaign`, `/api/stats`, `/api/test`, and `/api/whatsapp/webhook`.
- Channel modules with per-platform `postMessage`, `sendCampaign`, and `trackEngagement` helpers.
- BullMQ queue + worker to randomize post timing (Redis-backed).
- Firebase Admin logging to `marketing_logs`, `campaigns`, and `engagement_stats`.
- Template-driven posts/messages/emails stored under `src/templates`.

## Getting Started
1. Install dependencies (from repo root if using pnpm workspaces):
   ```bash
   cd apps/marketing-agent
   pnpm install
   ```
2. Create `apps/marketing-agent/.env`:
   ```env
   PORT=4003
   MARKETING_AGENT_API_KEY=local-dev-key
   REDIS_URL=redis://localhost:6379
   FIREBASE_PROJECT_ID=
   FIREBASE_CLIENT_EMAIL=
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"

   REDDIT_CLIENT_ID=
   REDDIT_SECRET=
   REDDIT_REFRESH_TOKEN=
   REDDIT_USER_AGENT=PlanCraftAIAgent/1.0

   LINKEDIN_ACCESS_TOKEN=
   TWITTER_API_KEY=
   TWITTER_SECRET=
   TWITTER_BEARER=
   FACEBOOK_PAGE_ACCESS_TOKEN=
   FACEBOOK_PAGE_ID=
   WHATSAPP_TOKEN=
   WHATSAPP_PHONE_ID=
   SENDGRID_API_KEY=
   EMAIL_FROM=marketing@plancraftai.com
   ```
3. Run the service:
   ```bash
   pnpm dev
   ```

## API Overview
- `POST /api/post` – Immediate or scheduled post. Accepts `{ platform, message, mediaUrl, targetGroups, flair, tags, subreddit, scheduleAt? }`.
- `POST /api/campaign` – Persist campaign definition and queue jobs `{ name, description, steps: [{ platform, message, delayMs? }] }`.
- `GET /api/stats` – Returns latest marketing logs + per-platform summary.
- `POST /api/test` – Simulates posts for every platform (log-only).
- `POST /api/whatsapp/webhook` – Placeholder to receive WhatsApp replies/events.

All routes (except the webhook) expect the `x-api-key` header to match `MARKETING_AGENT_API_KEY` when defined.

## Development Notes
- Queue + worker start automatically with the server (BullMQ + Redis).
- Reddit posting uses Snoowrap; ensure credentials are present before calling `/api/post` for the `reddit` platform.
- Other channels currently run in safe “dry-run” mode that logs intent + simulated engagement stats.
- Engagement data is generated in `analytics/engagementTracker.js` and persisted for dashboards.

## Scripts
- `pnpm dev` – nodemon-powered watch mode.
- `pnpm start` – production start.
- `pnpm test` – smoke start for CI (placeholder).
