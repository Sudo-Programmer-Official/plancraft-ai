## PlanCraftAI — Calm Productivity, Every Day

PlanCraftAI is a mindful planning and reflection app built with Vue 3 + TailwindCSS on the frontend and an Express/Node backend. It blends voice journaling, gentle AI enhancements, and task management so you can plan mornings, reflect in evenings, and grow through small, emotionally inviting steps.

### Vision
Help people form a sustainable daily rhythm: plan clearly, capture progress effortlessly (voice or text), and end the day with a grounded reflection. The tone is calm, supportive, and non-judgmental.

### What’s in V1
- Morning Planning
  - Speak or type your plan; turn thoughts into actionable tasks.
  - Desktop Chrome/Edge use the Web Speech API (live interim text).
  - iOS Safari/Android fallback to backend transcription (Whisper/gpt-4o-* transcribe models).
- Evening Reflection
  - Record or type reflections; optional AI enhancement for clarity and tone.
  - Save entries to Firebase for later review.
- Tasks
  - Daily/Weekly/Monthly views with consistent ordering and completion sync.
  - Drag-and-drop ordering via `vuedraggable`.
  - Shared task composable ensures one source of truth.
- Voice Recorder
  - Cross‑browser recording with live partials on mobile fallback.
  - Gentle defaults (echo cancellation, noise suppression).
- Firebase Integration
  - Firestore stores tasks and journal entries per user.
  - Router guards protect authenticated routes.
- AI Services (Backend)
  - Journal enhancement (tone, clarity).
  - Task summarization and task splitting from free text.
  - Transcription with model fallback.

### Roadmap for V2
- Rich analytics: mood/time trends, weekly focus insights, and streaks.
- Templates: morning prompts, evening gratitude, and weekly review.
- Collaborative planning (shareable lists) and reminders.
- Offline‑first task capture with background sync.
- User model settings + per‑feature opt‑in controls.

---

### Core Product Docs
- `docs/build-launch-handbook.md` — founder playbook for product decisions, platform learnings, release process, and launch preparation.
- `docs/product-roadmap-2026-2027.md` — dated 12-month roadmap for product, retention, reliability, collaboration, and monetization priorities.
- `docs/deployment-playbook.md` — repeatable deployment order, release checks, versioning discipline, and store-delivery workflow.
- `docs/mobile-deployment.md` — repeatable mobile build, sync, signing, and store-delivery workflow.
- `docs/app-store-listing.md` — store metadata and reviewer note reference.
- `docs/app-store-screenshot-brief.md` — screenshot copy and positioning guidance.

See `docs/architecture.md` for system design, `docs/setup.md` for local run/deploy, and `docs/api.md` for backend routes.
