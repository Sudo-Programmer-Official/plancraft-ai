# Creator Mode – system design

Creator Mode is the content operating system: plan once, AI executes with manual override. It sits on the existing creator-service (variants, slots, repurpose, publish) and frontend Creator flows (Home, Editor, Repurpose, Calendar, Publish).

## Current foundation (today)
- Data: `creators/{uid}/variants` for drafts, `creators/{uid}/slots` for schedule + posting jobs, `creator_schedule` for legacy scheduler, `content_campaigns` for plans, AI proxy endpoints for hooks/posts/repurpose.
- Frontend: Editor with platform previews + validation, Repurpose Engine, Calendar drag/drop for slots, Publish flow to enqueue posting jobs, Board view.
- Posting: `publish`/`schedule` flows forward to posting service; AI calls go through ai-nlp-service via creator-service proxy.

## Core objects
- Creator Profile (new): per user + workspace configuration that replaces ad-hoc prompts.
  - Path: `creators/{uid}/profile/{workspaceId||'default'}` (small doc, no subcollections).
  - Fields:
    - `platforms: ['linkedin','twitter','instagram','youtube']`
    - `goals: { hiring: bool, brand: bool, saas_growth: bool, thought_leadership: bool }`
    - `tone: { technical: 0-1, bold: 0-1, story: 0-1 }`
    - `topics: [{ topic: 'AI', weight: 0-1 }]`
    - `frequency: { linkedin: { perWeek: 3, windows: ['Tue 09:00','Thu 11:00'] }, twitter: { perWeek: 5 }, instagram: { perWeek: 2 } }`
    - `doExamples: [ { text, url?, outcome? } ]`, `dontExamples: []`
    - `voice: { pov: 'founder', personaNote: 'calm planning' }`
    - `constraints: { avoidTopics?: string[], forbiddenPhrases?: string[], complianceNotes?: string }`
    - `autopilot: { enabled: bool, autoApprove: bool, pauseOnDrop: bool }`
    - `analytics: { tz, preferredTimes, lastFeedbackAt }`
- Campaign (upgrade existing `content_campaigns`):
  - Fields: `name`, `summary`, `coreIdea`, `startDate`, `endDate`, `primaryPlatform`, `secondaryPlatforms`, `status (planned|active|cooldown|paused)`, `themes`, `cta`, `workspaceId`, `userId`.
  - Computed: `windows` (dates), `cadence` (posts/week), `backlog` (idea ids), `repurposePlan` (primary → secondary rules).
- Variant (existing `creators/{uid}/variants`):
  - Fields: `platform`, `type` (post/thread/reel-script/story), `title`, `body`, `hook`, `cta`, `media`, `tags`, `status (draft|ready|scheduled|published|needs_feedback)`, `sourceId` (campaign/idea), `aiMeta` (prompt, model, score), `workspaceId`.
  - State guards: Ready only after validation (client + `/posts/validate`); Scheduled links to a slot; Published includes `publishedAt`, `permalink`, `metricsRef`.
- Slot (existing `creators/{uid}/slots`):
  - Fields: `variantId`, `platform`, `channelVariant`, `caption`, `mediaUrls`, `scheduledAt`, `status (draft|scheduled|published|failed)`, `workspaceId`.
  - On `status=scheduled`, enqueue posting job (already wired); add `metricsRef` when published.

## Modes
- Manual mode (current):
  - User drafts/edits variants in Editor, validates, drags into Calendar (slots), schedules/publishes via Publish view.
- Autopilot mode (new):
  - Toggle stored on Creator Profile (`autopilot.enabled`, `autoApprove`).
  - Daily job per workspace:
    1) Pick active campaign; if none, create a “general presence” mini-campaign for 14 days.
    2) Generate ideas/hooks/drafts using profile + campaign context.
    3) Validate + mark variants `ready`.
    4) Schedule into slots respecting `frequency` + optimal windows; if `autoApprove`, publish when time hits; else keep `scheduled` and notify user.
    5) Pause autopilot if last N posts underperform or API errors; surface in weekly report.
    6) Log each run to `creator_autopilot_runs` { runId, date, campaignId, generatedVariants[], scheduledSlots[], skippedReasons[], paused? } for audit/debug.

## Pipelines (brain → execution)
- Idea layer:
  - Endpoint: new `POST /creator/ai/ideas` (ai-nlp: `generate/ideas`) with profile + campaign.
  - Store as `creator_ideas` (or embed under campaign document) with `score`, `topic`, `platform`.
- Hook layer:
  - Reuse `/creator/ai/hook`; attach 3–5 hooks per idea (`aiMeta.hooks`).
- Draft layer:
  - LinkedIn-first draft: call `linkedin_post`; thread/reel/story via `thread`, `reel_script`, `story_frames`.
  - Persist as variants with `sourceId = ideaId`.
- Repurpose layer:
  - One input → N outputs via `/creator/repurpose` (already saves variants). Expose “repurpose last 7 days” and “repurpose campaign” by feeding recent `published` variants.
- Validation:
  - Keep client validation; run server validation `/creator/posts/validate`; mark `status=ready` only when both pass.
- Scheduling:
  - Use `slots` with `scheduledAt` computed from `frequency` and engagement windows per platform (simple heuristic: user tz + 9a/12p/5p local; refine with metrics).
  - For manual drops, keep behavior; for autopilot, always include `job.payload` with `campaignId`, `variantId`, `workspaceId`.
- Publishing:
  - Posting service already accepts payload; add `context { source:'creator', campaignId, variantId, workspaceId }`.
  - On publish success, write `metricsRef` placeholder; on failure, set slot `status=failed` and raise alert.

## Feedback & learning loop
- Metrics ingestion:
  - Store per-post metrics in `creator_metrics` keyed by `variantId` (likes, comments, saves, CTR, impressions).
  - Start lean: allow manual entry or partial connector pulls; normalize fields (no platform-specific blobs) and link to slots/variants.
- Weekly digest (AI summary):
  - Cron pulls last 7 days metrics, runs `ai-nlp` to produce: top 3 posts, what to double down, what to drop, proposed tweaks to profile/campaign.
  - Send via email + in-app card; ask “accept adjustments?” to update Profile/Campaign.
- Autopilot guardrails:
  - If moving average engagement drops > X% for 5 posts, switch autopilot to “needs feedback” and stop publishing; keep generating drafts.

## Google/Calendar surface
- Scheduler already writes creator slots; for Calendar sync, map slots to Google events with clear source and revocation path.
- OAuth re-verification: show flow that user explicitly schedules before write happens; record audit in `creator_schedule` with `googleEventId` when synced.

## API additions
- `GET/POST /creator/profile` (per workspace) for Creator Profile CRUD.
- `POST /creator/ai/ideas` (uses profile + campaign).
- `POST /creator/autopilot/run` (admin/cron) to execute daily loop; `POST /creator/autopilot/toggle` to enable/disable.
- `GET /creator/insights/weekly` for digest data.
- Extend `/creator/repurpose` to accept `sourceRange=last_7d|campaign:{id}`.

## Execution roadmap
- Phase 1 (1–2 weeks): Profile CRUD + UI, campaign → idea → draft pipeline, repurpose from campaign, slot scheduling from frequency, Calendar write plumbing with audit.
- Phase 2 (next 2 weeks): Autopilot loop for LinkedIn-only (daily job + pauses), weekly digest + feedback prompts, journal → content bridge MVP.
- Phase 3: Multi-platform autopilot, engagement-based timing, “build in public” templates, recruiter-focused packs, paid Creator tier.

## Quick dependencies map
- Uses: `creator-service` (variants, slots, plan, repurpose, ai proxy), `ai-nlp-service` (generation/validation), posting-service (publish/schedule), firestore (creators/{uid}, creator_schedule, content_campaigns).
- New storage: `creators/{uid}/profile`, optional `creator_ideas`, `creator_metrics`.
