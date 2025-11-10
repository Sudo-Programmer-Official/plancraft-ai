🧩 Phase 3 – “Marketing Command Center” inside PlanCraft

Continue from the existing codebase (PlanCraft monorepo + `marketing-agent` from previous phases).

Goal of this phase:
Create a **Marketing Command Center** inside the PlanCraft admin UI that talks to the `marketing-agent` and gives me:
- Live cross-channel analytics
- Control over campaign frequency & channels
- A manual review queue for AI-generated posts
- Visibility into logs & errors

We already use:
- Backend: `apps/backend-node` (Express, Firebase Admin, cron jobs, etc.)
- Frontend: `apps/audit-agent-frontend` (Vue 3, Pinia, Element Plus, existing Admin layout)

Please follow the existing patterns for auth (`requireAuth`, `requiresAdmin`, etc.).


# 1️⃣ Backend – Marketing API Bridge

Create a new router in `apps/backend-node/routes/marketingRoutes.js` that exposes admin-only endpoints, and either:
- talks directly to the `marketing-agent` HTTP API, OR
- reads Firestore collections populated by the marketing-agent (e.g. `marketing_campaigns`, `marketing_stats`, `marketing_logs`).

Use whichever is easiest given current code, but keep the shape clean and versionable.

## 1.1 Routes

Implement:

### GET /api/marketing/summary
Admin-only.
Returns high-level aggregated stats per platform and period, e.g.:

```json
{
  "from": "2025-11-01",
  "to": "2025-11-09",
  "platforms": [
    {
      "name": "linkedin",
      "posts": 12,
      "impressions": 5400,
      "clicks": 280,
      "ctr": 0.0519,
      "replies": 24
    },
    {
      "name": "twitter",
      "posts": 20,
      "impressions": 8900,
      "clicks": 410,
      "ctr": 0.046,
      "replies": 31
    }
  ]
}

Read from whatever data store the marketing-agent already writes to (e.g. marketing_stats collection).

GET /api/marketing/campaigns

Admin-only. Supports optional query status=pending|active|paused.

Returns list of campaigns or scheduled posts, for example:

[
  {
    "id": "cmp_123",
    "platform": "linkedin",
    "topic": "founder productivity",
    "status": "pending_approval",
    "scheduledAt": "2025-11-10T08:00:00Z",
    "preview": {
      "headline": "How I stopped dropping meetings",
      "body": "...",
      "hashtags": ["#founder", "#productivity"]
    },
    "createdAt": "...",
    "autoReplyEnabled": true
  }
]

PATCH /api/marketing/campaigns/:id

Admin-only.

Allow fields:
	•	status → "approved" | "rejected" | "paused" | "active"
	•	scheduledAt (ISO string) – optional reschedule
	•	platforms (optional) – to toggle specific platforms on/off for a campaign
	•	notes → admin comment

Propagate status changes to the marketing-agent (e.g. mark AI-generated post as approved, or cancel a scheduled job).

GET /api/marketing/settings

Admin-only. Returns global config currently in use by marketing-agent:

{
  "postFrequencies": {
    "linkedin": "daily",
    "twitter": "twice_daily",
    "email": "weekly",
    "whatsapp": "manual"
  },
  "autoReplyEnabled": true,
  "aiPostApprovalRequired": true,
  "defaultTone": "casual"
}

POST /api/marketing/settings

Admin-only. Accepts updates to the above config (validate keys & values). Persist in Firestore, e.g. marketing_config/global, and ensure marketing-agent reads this config (or that we pass it via an internal API if it already has a config loader).

GET /api/marketing/logs

Admin-only, paginated (?page=1&pageSize=50):

Returns latest log entries, e.g.:

{
  "items": [
    {
      "id": "log_123",
      "timestamp": "2025-11-09T06:17:22Z",
      "level": "info",
      "source": "linkedin",
      "message": "Posted campaign cmp_123",
      "meta": { "postId": "lnkd_abc" }
    }
  ],
  "page": 1,
  "pageSize": 50,
  "hasMore": true
}

Backed by marketing_logs or similar.

1.2 Auth & wiring
	•	Protect all routes with requireAuth + admin check (same logic as other admin routes).
	•	Mount router in apps/backend-node/index.js, e.g.:

import marketingRoutes from './routes/marketingRoutes.js'
app.use('/api/marketing', marketingRoutes)

Use a [MarketingAdmin] prefix for logs for easier filtering.

2️⃣ Frontend – Admin Marketing Dashboard

Create a new admin view in apps/audit-agent-frontend/src/views/admin/AdminMarketing.vue.

2.1 Routing
	•	Add a new child route under the /admin group in src/router/index.js:

{
  path: 'marketing',
  name: 'AdminMarketing',
  component: () => import('@/views/admin/AdminMarketing.vue')
}

	•	Add a nav item in the Admin sidebar/menu similar to other admin sections (e.g. “Marketing”).

2.2 Layout

Use the existing admin card/layout patterns (Element Plus + the existing App/AdminLayout).

The page should have 3 main sections:

A. Top Summary Cards

Row of cards showing high-level metrics:
	•	Total posts (last 7 days)
	•	Total clicks / CTR
	•	Top-performing platform
	•	AI auto-reply status (ON/OFF)

Data from GET /api/marketing/summary.

B. Campaigns & Approval Queue (Tabs)

Use tabs:
	1.	“Pending approval”
	•	Table of AI-generated posts waiting for manual approval:
	•	Columns: Platform, Topic, Scheduled At, Preview (headline/body snippet), Created At, Actions.
	•	Row actions:
	•	Approve → PATCH /api/marketing/campaigns/:id { status: "approved" }
	•	Reject → PATCH … { status: "rejected" }
	•	Edit & Approve:
	•	Clicking opens a drawer or dialog with full text (headline + body + hashtags).
	•	Allow editing text in-place.
	•	On Save → send PATCH with updated preview fields and status: "approved".
	2.	“Upcoming & Active”
	•	Table of scheduled posts:
	•	Columns: Platform(s), Scheduled At, Topic, Status, Last Run / Next Run.
	•	Actions: Pause / Resume / Reschedule.
	3.	“History” (optional but ideal)
	•	List of recently published posts with performance snippet (clicks, CTR).

C. Settings Panel

On the right (or as a separate tab/section), show “Marketing Settings”:
	•	Multi-select switches per platform:
	•	LinkedIn: OFF / Low (3x week) / Daily / Aggressive (2x daily)
	•	Twitter: OFF / Daily / 3x daily
	•	Email: OFF / Weekly / Monthly
	•	WhatsApp: OFF / Manual / Experiments (if we add later)
	•	Toggles:
	•	“Require manual approval for AI-generated posts” (maps to aiPostApprovalRequired)
	•	“Enable auto-replies to comments/messages” (autoReplyEnabled)
	•	Tone select:
	•	Default tone: professional | casual | playful | motivational

When admin clicks “Save Settings”, POST to /api/marketing/settings and show a success toast.

Use existing notification/alert style from other admin pages.

2.3 API Client

In apps/audit-agent-frontend/src/services, add marketingService.js with:

import api from './api'

export async function fetchMarketingSummary() {
  const { data } = await api.get('/marketing/summary')
  return data
}

export async function fetchMarketingCampaigns(params) {
  const { data } = await api.get('/marketing/campaigns', { params })
  return data
}

export async function updateMarketingCampaign(id, payload) {
  const { data } = await api.patch(`/marketing/campaigns/${id}`, payload)
  return data
}

export async function fetchMarketingSettings() {
  const { data } = await api.get('/marketing/settings')
  return data
}

export async function saveMarketingSettings(payload) {
  const { data } = await api.post('/marketing/settings', payload)
  return data
}

export async function fetchMarketingLogs(params) {
  const { data } = await api.get('/marketing/logs', { params })
  return data
}

Use this service in AdminMarketing.vue.

2.4 Logs Panel (Optional but great)

At the bottom or in a separate tab called “Logs”:
	•	Data table showing source, level, message, timestamp.
	•	Basic filters: platform dropdown, level dropdown (info/error/warn).
	•	Pagination controls using page / pageSize.

This will help debug cross-posting in production.

2.5 UX Details
	•	Respect mobile layout: tables should scroll horizontally on smaller screens.
	•	Use consistent typography & card spacing with the rest of Admin pages.
	•	Show empty states with small helper text:
	•	“No pending campaigns yet — AI posts will show here when generated.”
	•	“No logs yet — once your marketing bot starts posting, logs will appear.”

3️⃣ Wiring to the Marketing-Agent

If the marketing-agent lives as a separate service:
	•	Either call it directly from marketingRoutes.js using axios with an internal URL (e.g. process.env.MARKETING_AGENT_URL),
	•	OR have both share Firestore collections so /api/marketing/* just reads/writes those collections.

Key collections (adjust names to match existing ones):
	•	marketing_stats    – per-platform metrics
	•	marketing_campaigns – campaigns/scheduled posts
	•	marketing_logs     – logs
	•	marketing_config   – global config (frequencies, toggles)

Keep field names stable so future phases (like AB testing creatives) can reuse them.

Add clear log prefixes:
	•	[MarketingAdmin] summary fetched
	•	[MarketingAdmin] settings updated
	•	[MarketingAdmin] campaign status updated

4️⃣ Acceptance Checklist
	•	/api/marketing/summary returns real aggregated data.
	•	/api/marketing/campaigns supports status filter and returns pending + active campaigns.
	•	/api/marketing/settings GET/POST works and persists config.
	•	Admin can:
	•	View pending AI posts
	•	Edit text and approve/reject them
	•	Adjust per-platform frequency + toggles
	•	AdminMarketing.vue uses the new API and fits visually with other admin views.
	•	Logs view shows latest marketing logs and paginates.

---

When Codex finishes this, you’ll have a **live marketing control room inside PlanCraft**:

- You can see what the bot is doing on LinkedIn/Twitter/etc.
- You can approve or tweak AI content before it goes out.
- You can dial channels up/down without touching code.

If you want, next step after this can be a **Phase 4 prompt** to let your planner / TalkToPlanner *ask* the marketing engine to “announce this new feature” or “draft a founder update” directly from inside the app.