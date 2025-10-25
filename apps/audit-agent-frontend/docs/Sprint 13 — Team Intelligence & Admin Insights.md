🧭 Sprint 13 — Team Intelligence & Admin Insights

Handoff Summary (Phases 1–3)

⸻

✅ Phase 1 — Realtime Notifications

Deliverables
	•	FCM push integration via firebase-messaging-sw.js, auto-registering after auth.
	•	Pinia notificationStore drives sidebar badges + toast stack.
	•	notifierService.js triggers updates from chat, tasks, vault, and meetings.
	•	Cross-channel fallback: Web Push auto-activates when FCM unavailable.

QA checklist

Scenario	Expected Result
Chat/task/meeting event	Instant toast + sidebar badge
Notifications blocked	Web Push fallback works
/api/notifications/test	Valid token → FCM payload visible


⸻

✅ Phase 2 — Templates & Project Cloning

Backend
	•	templatesRouter.js – Org-scoped CRUD endpoints.
	•	projectCloneService.js – Deep clone with tasks, metadata, members.
	•	aiSuggestService.js – Adaptive template suggestions.
	•	analyticsService.js – Tracks template usage counts.
	•	Firestore rules + indexes updated for admin-only writes.

Frontend
	•	TemplateModal.vue – Save / Start-from-template UX.
	•	templateService.js, projectStore.ts – CRUD helpers + usage refresh.
	•	TeamProjects.vue – Integrated “Start from Template” button.

Verification

Check	Result
Admin saves project → appears in modal	✅
Clone reproduces tasks + metadata	✅
Non-admins can use but not save templates	✅
Suggestions reorder after clones	✅
Notification fires on create/clone	✅


⸻

🚀 Phase 3 — Cross-Org Insights & Admin Dashboard

🎯 Objective

Provide a central analytics view comparing teams/orgs with AI-generated benchmark summaries and trend charts.

⸻

📊 Implementation Plan

ID	Task	Description	Target Modules	ETA
S13.3.1	Extend analytics service	Aggregate usage, velocity, sentiment per org	src/services/analyticsService.js	0.5 d
S13.3.2	Build Admin Dashboard	Charts, filters, cross-org comparisons	src/views/AdminDashboard.vue	1 d
S13.3.3	AI Benchmark Summaries	Digest analytics data into text insights	src/services/aiDigestService.js, OrgAnalytics.vue	0.5 d

Deliverable

“Central analytics dashboard comparing all orgs with AI-generated highlights.”

⸻

🔐 Acceptance Criteria

Category	Criteria
🔔 Notifications	Deliver instantly (from Phase 1)
📁 Templates	Save + clone works flawlessly (Phase 2 regression)
🧠 Adaptive AI	Suggestions adjust per usage
📊 Dashboard	Admin view with filters + charts + digest
✅ Code Quality	Lint/tests pass; no regressions


⸻

🧠 Technical Architecture Flow

Firestore → analyticsService.js → aiDigestService.js → AdminDashboard.vue
           ↑ cache layer (org comparisons)
           │
           └─ AI summarization → "Your org's productivity rose 8 %"

Frontend
	•	analyticsStore.ts fetches + caches metrics.
	•	AdminDashboard.vue renders charts (Org Comparison, Sentiment Radar, Velocity Trend).
	•	DigestHighlights.vue shows AI summary banner.

⸻

🧾 QA Checklist (pre-merge)
	•	Verify /api/admin/analytics role guard.
	•	Dashboard charts render < 2 s per query.
	•	Mixpanel events: dashboard_viewed, metric_filtered, ai_digest_generated.
	•	Lint/test run:

corepack enable && corepack prepare pnpm@latest --activate
pnpm lint --filter teams-api
pnpm lint --filter audit-agent-frontend



⸻

📘 Deliverables to Attach
	•	/docs/TEAM_ASSISTANT.md (updated)
	•	/docs/TEAM_VAULT.md
	•	/docs/S13_PHASE3_PLAN.md
	•	/docs/ADMIN_DASHBOARD.md (new, after merge)

⸻

✅ Next Step

Hand this packet to CodeX to begin Phase 3 – Cross-Org Insights & Admin Dashboard.