# Deploy Checklist — PlanCraft Teams v1.0

> Execute in order before flipping `TEAMS_PUBLIC = true`. Check each item and capture evidence (links/screenshots/logs).

---

## 1. Pre-Deploy Validation

- [ ] Regression log reviewed (`qa/REGRESSION_LOG.md`) — all critical items resolved or waived.
- [ ] QA guide completed (`QA_GUIDE.md`) — attach test evidence.
- [ ] Release notes finalised (`RELEASE_NOTES_v1.md`).
- [ ] Environment variables audited (Firebase, OpenAI, Socket.IO, Mixpanel).

---

## 2. Build & Package

- [ ] `corepack enable && corepack prepare pnpm@latest --activate`
- [ ] `pnpm lint --filter teams-api`
- [ ] `pnpm lint --filter audit-agent-frontend`
- [ ] `pnpm build --filter teams-api` (if applicable)
- [ ] `pnpm build --filter audit-agent-frontend`
- [ ] Bundle size snapshot captured (e.g. `pnpm run analyze` or Vite report).

Attach logs in `phase-3/build-logs/`.

---

## 3. Backend Deploy (Render / Server)

- [ ] Update `.env` with final secrets (Firebase service account, OpenAI, Mixpanel, etc.).
- [ ] `render.yaml` reviewed for new routes (notifications, templates, admin analytics).
- [ ] Trigger deployment → wait for green status.
- [ ] Run smoke test: `curl https://<api>/healthz` and `/api/ping`.
- [ ] Verify Firestore rules + indexes deployed (checks vs repo `firestore.rules`, `indexes.json`).

---

## 4. Frontend Deploy (Vercel / Hosting)

- [ ] Confirm `firebase-messaging-sw.js` served from root (FCM requirement).
- [ ] Build output contains lazy-loaded chunks for Vault/Feed/Admin.
- [ ] Deploy branch to Vercel (or hosting target).
- [ ] Validate environment (API base URL, FCM sender ID, theme defaults).
- [ ] Post-deploy smoke test:
  - `/login`, `/dashboard`, `/team/:orgId`, `/admin`.
  - Invite join route `/join?token=...`.
  - PWA install prompt appears (if flagged).

---

## 5. Post-Deploy QA

- [ ] Sign in as owner/admin/member → verify navigation + theme toggle.
- [ ] Send invite → accept via join flow.
- [ ] Trigger notification (chat/task) → confirm FCM + toast + badge.
- [ ] Save template + instantiate new project.
- [ ] Admin analytics summary loads with AI digest.
- [ ] Lighthouse run (production URL) ≥ 90.

Logs/screenshots stored under `phase-3/post-deploy/`.

---

## 6. Toggle & Announcement

- [ ] Flip `TEAMS_PUBLIC = true` (or relevant feature flag).
- [ ] Update waitlist email content / marketing site.
- [ ] Notify internal stakeholders (Slack/Teams) with release summary.

---

## 7. Sign-offs

| Role | Name | Date | Notes |
|------|------|------|-------|
| Backend Lead | | | |
| Frontend Lead | | | |
| QA Lead | | | |
| Product | | | |

---

_Keep this checklist updated as processes change. Archive alongside release notes for audit history._ 
