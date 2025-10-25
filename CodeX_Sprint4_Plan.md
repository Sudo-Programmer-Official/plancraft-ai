# CodeX Sprint Plan — Teams & Voice Refinement (Sprint 4)

**Goal:** Polish, secure, and extend the Teams ecosystem with smarter AI loops and production-ready performance.

---

## 🌍 Sprint Objective

Deliver a fully stable, voice-aware Teams workspace where users can:

- Create, update, and review tasks using voice or text
- Receive smart weekly summaries and personalized AI reflections
- Enjoy instant feedback loops (voice → recap → coach)
- Operate securely and performantly at scale

---

## 🗓️ Timeline

| Phase | Duration | Window |
| --- | --- | --- |
| Phase 1 – QA & Hardening | 3 days | Day 1 – 3 |
| Phase 2 – Smart Pulse & Coach Flow | 4 days | Day 4 – 7 |
| Phase 3 – Docs & Deploy | 1 day | Day 8 |

---

## ✅ Phase 1 – QA & Hardening

| Task ID | Task | Owner | ETA | Status |
| --- | --- | --- | --- | --- |
| T1.1 | Audit Firestore Rules → validate role-based read/write for `orgs/*/members/*` | CodeX | 1 d | ⬜ |
| T1.2 | Add missing composite indexes (`tasks.assignedTo+status`, `updates.timestamp`) | CodeX | 0.5 d | ⬜ |
| T1.3 | Add `x-request-id` and structured logging in Teams API | CodeX | 0.5 d | ⬜ |
| T1.4 | Implement rate limiter for `/api/voice/*` | CodeX | 1 d | ⬜ |
| T1.5 | Run lint + build across all modules (frontend & server) | CodeX | 0.5 d | ⬜ |

---

## ⚙️ Phase 2 – Smart Pulse & Coach Flow

| Task ID | Task | Owner | ETA | Status |
| --- | --- | --- | --- | --- |
| T2.1 | Create Smart Weekly Summary Cards (frontend UI) | CodeX | 1 d | ⬜ |
| T2.2 | Backend API → aggregate team stats + AI summary | CodeX | 1 d | ⬜ |
| T2.3 | Integrate audio recap playback with ElevenLabs TTS | CodeX | 0.5 d | ⬜ |
| T2.4 | Extend Reflection Dashboard → Monthly Insights + badges | CodeX | 1 d | ⬜ |
| T2.5 | Chain voice recap → AI coach flow (seamless handoff) | CodeX | 1 d | ⬜ |
| T2.6 | Implement sentiment visuals (bar/line chart) | CodeX | 0.5 d | ⬜ |

---

## 🧱 Phase 3 – Docs & Deployment

| Task ID | Task | Owner | ETA | Status |
| --- | --- | --- | --- | --- |
| T3.1 | Add `README_TEAMS.md` with setup, deploy & env vars | CodeX | 0.5 d | ⬜ |
| T3.2 | Generate `TEAM_HANDBOOK.md` (from handover spec) | CodeX | 0.5 d | ⬜ |
| T3.3 | Deploy Teams API on Render + connect frontend envs | Abhishek + CodeX | 0.5 d | ⬜ |
| T3.4 | Regression test core vs teams (ports 4000 / 3000) | CodeX | 0.5 d | ⬜ |

---

## 🔄 Branch & Release Strategy

| Branch | Purpose |
| --- | --- |
| `main` | core backend (prod) |
| `teams-main` | stable Teams backend |
| `teams-dev` | active CodeX sprint work |
| `feature/voice-ai` | new voice or recap modules |
| `feature/reflection-dashboard` | UI iterations |

All merges → via `teams-dev` → `teams-main` after CI + lint checks pass.

---

## 🔐 Deliverable Acceptance Criteria

- All Firestore rules validated with no 403 on legit users.
- Teams Dashboard loads < 1 s for 200 tasks.
- Voice → Task/Recap/Coach loop works end-to-end.
- Smart Weekly Summaries render accurately with audio.
- Reflection Dashboard shows AI insights and badges.
- Both servers run independently and deploy successfully.

---

## 🚀 Stretch Goals (Optional Next Sprint)

- 🧠 Skill-based auto-assignment engine.
- 📣 Slack / Email integration for weekly summaries.
- 🎧 “Play My Week” audio montage with waveform visual.
- 🧘 AI Coach Persona switcher (mentor / friend / zen tone).

---
