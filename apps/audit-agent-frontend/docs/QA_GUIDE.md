# QA Guide — Sprint 14 Stabilization

> Use this matrix for structured testing during Phase 1 & Phase 2. Record pass/fail notes and link evidence (screenshots, videos, logs).

---

## 1. Environment Setup

- ✅ Deploy current `teams-dev` build to staging.
- ✅ Seed sample org + admin + member accounts.
- ✅ Ensure Firebase keys (Auth, FCM), OpenAI key, Socket.IO gateway active.

---

## 2. Regression Matrix

| Flow | Steps | Expected Result | Status | Evidence |
|------|-------|-----------------|--------|----------|
| Chat ↔ Vault ↔ Assistant | 1. Send chat message. <br>2. Trigger AI summary. <br>3. Confirm vault entry & feed highlight. | Vault entry created, feed updates, assistant toast. | ☐ | |
| Meeting → Transcript → Tasks | 1. Upload meeting recording. <br>2. Wait for transcription. <br>3. Verify tasks preview + creation. | Transcript + AI summary + tasks generated. | ☐ | |
| Template Save/Clone | 1. Save project as template. <br>2. Instantiate new project. <br>3. Check adaptive suggestion list. | Template saved, new project seeded, suggestion ranking updates. | ☐ | |
| Notifications | 1. Trigger chat/task changes. <br>2. Verify toast + sidebar badge + FCM push. | Real-time toast + badge + push notification. | ☐ | |
| Admin Analytics | 1. Load admin dashboard. <br>2. Adjust ranges/limits. <br>3. Inspect AI summary. | Charts update, AI summary present, no 403. | ☐ | |
| Invite Flow | 1. Send invite. <br>2. Accept via join route. | Invite preview + join success. | ☐ | |
| Theming Toggle | 1. Switch light/dark. <br>2. Navigate all modules. | Theme persists + consistent palette. | ☐ | |
| Mobile Responsiveness | 1. View on 375px, 768px, 1024px. | Layout adapts, no overflow. | ☐ | |
| Voice Mic | 1. Record quick voice task. | Transcript appears, task created. | ☐ | |

Add/delete rows as needed.

---

## 3. API Verification Checklist

| Endpoint Group | Checks | Status | Notes |
|----------------|--------|--------|-------|
| `/api/orgs/*` | Auth guard, list/create/update/delete responses, error handling. | ☐ | |
| `/api/orgs/:orgId/templates` | Admin-only write, member read, payload validation. | ☐ | |
| `/api/orgs/:orgId/analytics` | Range filter, data structure. | ☐ | |
| `/api/admin/analytics` | Admin-only, range + limit params. | ☐ | |
| `/api/notifications` | Test broadcast/test endpoints. | ☐ | |
| `/api/tasks` (team) | Permissions, query params. | ☐ | |
| `/api/invites` | Public invite preview/accept. | ☐ | |

Document discrepancies in `qa/REGRESSION_LOG.md`.

---

## 4. Performance & Lighthouse

- Run Lighthouse (mobile + desktop). Target scores ≥ 90.
- Capture results and store under `phase-3/lighthouse-*.json`.
- Verify lazy-loaded routes (Network tab → ensure chunk splitting).

---

## 5. Security Review

- Firestore rules coverage (members, templates, notifications, analytics).
- Token/Invite flow negative tests (expired, revoked, reused).
- Admin endpoints (403 for non-admin).
- Verify environment secrets (OpenAI, Firebase) not exposed in client bundle.

Record findings in `phase-3/security-review.md`.

---

## 6. Smoke Tests Pre-Release

| Area | Action | Status |
|------|--------|--------|
| Build | `pnpm lint --filter teams-api` | ☐ |
| Build | `pnpm lint --filter audit-agent-frontend` | ☐ |
| Build | `pnpm build --filter audit-agent-frontend` | ☐ |
| PWA | Install prompt/Offline ready | ☐ |
| Notifications | FCM push from staging | ☐ |

Attach logs under `phase-3/build-logs/`.

---

## 7. Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| QA Lead | | | |
| Backend | | | |
| Frontend | | | |
| Product | | | |

---

_Update this guide as new test cases are discovered. Keep links to evidence current for audit/readiness reviews._ 
