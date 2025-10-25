📘 **Sprint 14 – Final Stabilization, QA & Polish**

> _Goal_: Transition PlanCraft Teams from “feature-complete” to “launch-ready” by prioritising stability, responsive UX, performance, and documentation.

---

## Phase 1 — Issue Triage & Regression QA _(Days 1 – 3)_

### 🎯 Objectives
- Catalogue open issues from Sprints 10–13 by severity (critical / major / cosmetic).
- Validate every cross-module workflow (chat ↔ vault ↔ assistant, meetings → tasks, templates, notifications).
- Confirm API integrity and integrations (Firebase, OpenAI, Socket.IO).

### 🔍 Tasks
1. **Collect & Prioritise Issues**
   - Aggregate reports from stand-ups, Linear/Jira, Slack, and QA notes.
   - Classify by severity and assign owners.
   - Produce `/qa/REGRESSION_LOG.md` with status, reproduction steps, screenshots.
2. **Regression QA Runs**
   - ✅ Chat → Vault → Assistant loop (message → summary → vault entry → feed).
   - ✅ Meeting transcription → task automation (audio upload, transcript, task preview).
   - ✅ Template cloning + adaptive suggestions (save + instantiate + recommendation refresh).
   - ✅ Notifications + analytics (FCM toast, sidebar badge, admin feed).
3. **API Verification**
   - Exercise every `GET/POST/PATCH/DELETE` under `/api/orgs/*`, `/api/admin/*`.
   - Confirm auth guards reject non-members / non-admins.
   - Validate payload shapes (body + response) and error codes.
   - Re-run OpenAI/Firebase/Socket.IO integration smoke tests.
   - Capture “missing toast / notification” cases for fixes.

### 📎 Attachments / Evidence
- Screenshot bundle or log references under `phase-1/` (e.g., `phase-1/chat-regression.png`, `phase-1/api-audit.md`).

---

## Phase 2 — UI Polish, Responsiveness & Theming _(Days 4 – 5)_

### 🎯 Objectives
- Achieve consistent responsive layouts across desktop, tablet, and mobile.
- Ship unified theming (light/dark) with synced palettes for nav, modals, toasts, coach overlay, mic button.
- Enhance micro-interactions (transitions, subtle sounds/animations).

### 🛠 Tasks
1. **Responsiveness Audit**
   - Verify layouts for: Vault, Feed, Dashboard, Chat, Meetings, Admin console, Coach overlay.
   - Fix sidebar collapse, modals, FAB positions, overflow issues.
2. **Unified Theme System**
   - Introduce theme tokens (CSS variables / Tailwind config).
   - Add theme switch in user preferences; persist per user.
   - Align buttons, toasts, voice mic, coach overlay with shared palette.
3. **Visual Consistency + Micro-interactions**
   - Normalise paddings/margins, typography scale, button styling (“Generate Task” green hue).
   - Add smooth transitions for toasts/modals/coach overlay.
   - Layer in optional sound cues (toggleable) for key interactions.

### 📎 Attachments / Evidence
- Responsive screenshots (`phase-2/responsive-*.png`).
- Theme preview GIF (`phase-2/theme-toggle.gif`).
- Before/after UI comparisons or Figma references.

---

## Phase 3 — Performance, Security & Release Docs _(Days 6 – 8)_

### 🎯 Objectives
- Optimise bundle size & lazy-load heavy routes.
- Reconfirm Firestore rules, invite/token flows, admin endpoints.
- Produce release documentation & run final build/test pipelines.

### ⚙️ Tasks
1. **Performance Optimisation**
   - Lazy-load Vault, Feed, Admin Dashboard, large component groups.
   - Compress large images/assets; verify PWA cache policies.
   - Run Lighthouse (mobile + desktop) with target ≥ 90.
2. **Security Review**
   - Audit Firestore rules (templates, notifications, analytics, pulse, admin).
   - Pen-test `/api/orgs/*`, `/api/admin/*`, invite/token flows.
   - Confirm FCM, OpenAI keys and environment secrets stored securely.
3. **Build & Lint**
   ```bash
   corepack enable && corepack prepare pnpm@latest --activate
   pnpm lint --filter teams-api
   pnpm lint --filter audit-agent-frontend
   pnpm build --filter audit-agent-frontend
   ```
   - Capture outputs & address warnings.
4. **Documentation & Release Artifacts**
   - `docs/RELEASE_NOTES_v1.md` (features, fixes, known issues).
   - `docs/QA_GUIDE.md` (test matrix + reproduction steps).
   - `docs/DEPLOY_CHECKLIST.md` (env vars, services, post-deploy validation).

### 📎 Attachments / Evidence
- Lighthouse reports (`phase-3/lighthouse-mobile.json`, `phase-3/lighthouse-desktop.json`).
- Build logs (`phase-3/pnpm-build.log`).
- Security audit summary (`phase-3/security-review.md`).

---

## Sprint Deliverables (Exit Criteria)

| Deliverable | Description | Owner | Status (fill during sprint) |
|-------------|-------------|-------|-----------------------------|
| ✅ Regression Passed | All critical paths validated end-to-end (log linked) | QA/CodeX | ☐ |
| ✅ Responsive UI | Vault, Feed, Dashboard, Chat, Meeting, Admin responsive | Frontend | ☐ |
| ✅ Unified Theme | Light/dark toggle; consistent palette and components | Frontend | ☐ |
| ✅ Performance Optimised | Lazy-loading, compressed assets, Lighthouse ≥ 90 | DevOps/Frontend | ☐ |
| ✅ Security Verified | Firestore rules + endpoint review signed off | Backend | ☐ |
| ✅ Docs Ready | Release notes, QA guide, deploy checklist delivered | PM/Docs | ☐ |

---

## QA Checklist (Pre-Release)

| Category | Check | Status |
|----------|-------|--------|
| 🔔 Notifications | FCM toast + sidebar badge for chat/tasks | ☐ |
| 🧩 Templates | Save & clone template, AI suggestions refresh | ☐ |
| 🧠 Assistant | Prompt → Vault entry → Feed update round-trip | ☐ |
| 🎥 Meetings | Record → Transcribe → Auto-create tasks | ☐ |
| 🌗 Theming | Toggle switch applies globally (light/dark) | ☐ |
| 📱 Responsiveness | No layout breaks on mobile/tablet | ☐ |
| ⚙️ Build | Lint/test pass, PWA audit ≥ 90 | ☐ |

---

## Tracking & Reporting

- **Daily stand-ups**: Highlight blocker issues from regression log, assign fixes.
- **Mid-sprint review (Day 4)**: Verify Phase 1 completion, demo responsiveness/theming progress.
- **Pre-release review (Day 8)**: Present performance metrics, security findings, and release docs.

---

_Add screenshots, logs, and API capture links beneath each phase directory in the repo to keep reviewers aligned with evidence._ 
