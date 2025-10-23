# Context for Codex — PlanCraftAI “Teams”

## Vision — From Personal Productivity to Collective Intelligence

PlanCraftAI began as a personal AI productivity companion — a voice‑first, automation‑driven planner that helps individuals stay organized, reflect daily, and act intentionally. The next leap is PlanCraftAI for Teams: a workspace where people + AI collaborate to manage work, meetings, and decisions seamlessly.

In short: “Voice in, structured out.” Talk to your workspace — it organizes itself.

## Core Belief

The future of work management is orchestrated, not manual.
- Meetings → Tasks
- Voice → Boards
- Notes → Deadlines
- Context → Assignments

All automated, contextual, and shared in real time, so people focus on thinking and building, not tracking and updating.

## Why This Matters

Most tools are:
- Too rigid (click‑heavy, process‑first)
- Too dumb (no learning from context)
- Too isolated (calendar, chat, tasks live separately)

PlanCraftAI fixes that:
- Voice‑first interface: speak, don’t type.
- Automation‑first brain: tasks, reminders, and ownership are derived, not manually entered.
- LLM + event rules engine: every meeting, note, or voice log becomes actionable.
- Human‑friendly UX: minimal friction, context aware.

## “Teams” — The Layer We’re Building Now

Teams unlock organizational mode for PlanCraftAI. Each company, startup, or study group becomes an org workspace with:
- Members, roles, and permissions (RBAC)
- Shared projects, boards, and meetings
- Automation rules (e.g., transcript_ready → create tasks)
- Stripe‑based seat billing
- Org‑level integrations (Google, Slack, etc.)

All of this coexists with personal features — evolving from Me → Us.

## How Codex Can Add Value

1) Architect for scale
- Multi‑tenancy by design (orgId isolation, rules, indexes)
- Keep B2C/B2B unified but decoupled

2) Code + context
- Maintain readability and explain why parts exist (LLM orchestration, automation hooks)
- Keep docs tight; future devs should “get it” fast

3) Extend the voice DNA
- Preserve the “voice → structured action” path across meetings, boards, automations

4) Own the automation engine
- Rules DSL for “when X happens → do Y” (meeting.transcript_ready → create_tasks)
- Flexible, event‑driven architecture

5) Future‑proof it
- Modular API (/api/orgs/:orgId/...)
- Feature flags for rollout (ENABLE_TEAMS, ENABLE_AUTOMATIONS, etc.)
- Clean separation for voice orchestration pipelines

## What Success Looks Like (Phase 1)

- A working Teams skeleton (org creation, members, switching)
- No regressions for existing users (B2C safe)
- Unified UX where one user can fluidly move between:
  - Personal mode → “Plan my day”
  - Team mode → “Show me team tasks for the week”
- Foundation for Phase 2 (Projects + Boards)
- Ready hooks for LLM orchestration (voiceToTasks, meetingToTasks)

## The Larger Mission

PlanCraftAI is not “just another productivity app” — it is an autonomous planning layer for humans and teams. A system that listens, learns, and organizes your world, so you can focus on creation.

We’re not competing with Notion or Asana. We’re redefining the work loop — from idea → conversation → structured plan — automatically. PlanCraftAI should feel less like a tool, more like a smart colleague.

## How to Think When Building

- Always ask: “Could this be automated?”
- If something feels repetitive → it’s an automation candidate.
- Keep the experience voice‑first, context‑aware, minimal.
- Focus on scalability and readability — this is the platform’s foundation.

## Repo Summary (Phases)

- Personal Mode: Existing B2C experience (journals, reminders) — Live
- Team Mode: Multi‑tenant orgs + roles — Phase 1 (this sprint)
- Voice → Tasks: LLM orchestration pipeline — Phase 2
- Meetings → Actions: Transcript ingestion & automation — Phase 3
- Stripe Billing: Seat‑based org subscriptions — Phase 4
- Future Integrations: Slack, Google Workspace, SSO — Backlog

## Quick Reference — Feature Flags

- VITE_ENABLE_TEAMS: toggles Team Mode routes/UI
- ENABLE_AUTOMATIONS: future flag for rules engine rollouts

