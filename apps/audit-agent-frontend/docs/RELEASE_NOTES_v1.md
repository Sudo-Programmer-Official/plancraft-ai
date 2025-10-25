# PlanCraft Teams – Release Notes v1.0

> Draft outline for the public/beta launch note. Fill in metrics & screenshots once QA finalises Phase 1/2 results.

---

## 🚀 Highlights

- **Real-time collaboration** – Chat, voice, meetings, and task automation wired end-to-end.
- **AI-powered insights** – Adaptive templates, coach guidance, org-level analytics.
- **Launch polish** – Notifications (FCM + PWA), responsive UI, unified theming, performance optimisations.

---

## 🆕 New Features

| Area | Description | Status / Notes |
|------|-------------|----------------|
| Notifications | Firebase Cloud Messaging, sidebar badges, in-app toasts | |
| Templates & Cloning | Save/instantiate team templates, adaptive suggestions | |
| Admin Analytics | Cross-org velocity, sentiment, completion dashboard with AI summary | |
| Coach Overlay | First-run guidance with replay + confetti | |

---

## 🔧 Improvements

- Responsive layouts for Vault, Feed, Dashboard, Chat, Meetings, Admin console.
- Unified light/dark theme palette across navigation, modals, toasts, coach overlay, mic button.
- Lazy-loaded heavy routes (Vault, Feed, Admin Dashboard) to reduce bundle size.
- Enhanced micro-interactions: smoother transitions, optional sound cues, refined button styling.

---

## 🐞 Fixes

- [ ] Issue #… – description / resolution snapshot.
- [ ] Issue #… – description / resolution snapshot.
- [ ] …

> _Populate from `qa/REGRESSION_LOG.md` once resolved._

---

## 🧪 QA & Metrics

- Regression suites: Chat ↔ Vault ↔ Assistant, Meetings → Tasks, Templates, Notifications.
- Lighthouse ≥ 90 (mobile + desktop) — attach reports.
- Build & lint pipelines (`pnpm lint`, `pnpm build`) – include timestamps / CI links.

---

## ⚠️ Known Issues / Follow-ups

- [ ] Example: Admin dashboard drill-down filters limited to top 10 orgs.
- [ ] Example: Theme toggle requires refresh on legacy Safari (tracked in issue …).
- [ ] …

---

## 📎 Attachments

- Screenshot pack (`/docs/assets/release-v1/…`)
- Regression log summary (`qa/REGRESSION_LOG.md`)
- Performance reports (`phase-3/lighthouse-*.json`)

---

_Last updated: {{DATE}}_ — Replace with final publish date during release prep.
