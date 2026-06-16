# PlanCraftAI x FounderContentAI Domain Boundary Spec

Status: Draft v1  
Date: 2026-05-29  
Owners: Product + Platform + App Teams

## 1) Purpose
Define hard boundaries between:
- PlanCraftAI (Execution/Operations OS)
- FounderContentAI (Growth/Revenue OS)

Goal: Ship both products fast without UX confusion, roadmap drift, or architecture coupling.

## 2) Product Positioning
- PlanCraftAI: Run life and business operations.
- FounderContentAI: Grow pipeline, campaigns, and customer acquisition.
- CallYogi (separate): Voice communication workflows.

Principle: `Separate products, shared platform, explicit handoffs.`

## 3) Domain Ownership Matrix
### PlanCraftAI Owns
- Capture, inbox, planning, calendar execution, task operations.
- Projects, SOP/playbooks, internal docs/knowledge for execution.
- Team workspace operations and internal workflow automation.
- Goals, reviews, habits, personal/business effectiveness loops.
- Ops Center modules: automations, projects, agent runs, internal analytics.

### FounderContentAI Owns
- Offers, messaging, campaigns, content pipeline.
- Distribution channels, audience segmentation, lead capture.
- Outreach orchestration, follow-up flows, top-of-funnel analytics.
- Brand assets, campaign performance, booking-to-lead conversion flows.

### Shared Platform Owns
- Identity and org/workspace graph.
- Billing and plan entitlements.
- AI memory/knowledge core services.
- Event bus and integration contracts.
- Observability, audit logs, usage metering.

## 4) Non-Negotiable Boundary Rules
1. No mixed primary navigation across products.
2. No duplicate ownership of the same entity in two products.
3. Cross-product actions must happen via explicit user-triggered handoff.
4. Shared services cannot expose product-specific UI logic.
5. Feature flags and plan checks are workspace-scoped, not user-scoped.

## 5) Canonical Entity Ownership
- `lead`, `campaign`, `offer`, `brand_asset`: FounderContentAI (source of truth)
- `project`, `task`, `goal`, `habit`, `review`: PlanCraftAI (source of truth)
- `workspace`, `membership`, `entitlement`, `billing_account`: Shared Platform
- `agent_memory`, `knowledge_chunk`, `automation_run`: Shared Platform

If one app needs another app's entity, read via contract API/event materialization, never direct table ownership.

## 6) Cross-Product Handoff Flows
### Flow A: FounderContent -> PlanCraft
Trigger: User clicks `Create execution project` in a campaign.

Contract:
- Input:
  - `workspaceId`
  - `campaignId`
  - `campaignName`
  - `suggestedTasks[]`
  - `dueWindow`
- Output:
  - `projectId`
  - `createdTaskIds[]`
  - `deepLink`

UX:
- FounderContent confirms generated project and deep-links to PlanCraft project board.

### Flow B: PlanCraft -> FounderContent
Trigger: User clicks `Launch campaign` from a goal/project.

Contract:
- Input:
  - `workspaceId`
  - `goalId | projectId`
  - `targetAudience`
  - `offerContext`
- Output:
  - `campaignId`
  - `launchChecklistId`
  - `deepLink`

UX:
- PlanCraft opens FounderContent campaign builder with prefilled context.

## 7) Event Contract (v1)
Transport: Pub/Sub, queue, or event stream (implementation-agnostic).

Envelope:
```json
{
  "eventId": "evt_123",
  "eventType": "campaign.execution_project.requested",
  "occurredAt": "2026-05-29T12:00:00Z",
  "workspaceId": "ws_123",
  "actorId": "uid_123",
  "correlationId": "corr_123",
  "payload": {}
}
```

Required event types:
- `campaign.execution_project.requested`
- `campaign.execution_project.created`
- `project.campaign_launch.requested`
- `project.campaign_launch.created`
- `automation.run.started`
- `automation.run.completed`
- `automation.run.failed`

Rules:
- Events are immutable.
- Consumers must be idempotent by `eventId`.
- Backward-compatible schema evolution only (additive changes in v1).

## 8) API Contract Guidelines
- Endpoint namespaces stay product-scoped:
  - `/api/plancraft/*`
  - `/api/foundercontent/*`
  - `/api/platform/*`
- Cross-product calls go through service contracts, not DB joins.
- Every mutating endpoint must accept `workspaceId` and enforce entitlement checks.
- Every cross-product create action returns a deep link to destination context.

## 9) Auth, Workspace, and Billing Semantics
- User has one identity across ecosystem.
- Authorization is workspace-role based.
- Billing attaches to workspace/org account.
- Entitlements resolved by `workspace.plan` + usage counters.
- Cross-product handoff blocked gracefully if target app entitlement missing.

## 10) UX Contract
- Keep distinct brand and product language.
- Use shared account switcher/workspace switcher patterns.
- Use consistent `Open in PlanCraft` / `Open in FounderContent` handoff buttons.
- Never auto-redirect between products without explicit user action.

## 11) Data and Analytics Boundaries
- Shared telemetry standard: `workspaceId`, `actorId`, `product`, `module`, `action`.
- Product dashboards remain product-local.
- Platform analytics provide cross-product funnel rollups:
  - `handoff_initiated`
  - `handoff_completed`
  - `handoff_time_to_value`

## 12) Release Model
- Independent release trains for each product UI.
- Shared platform versioned APIs with deprecation windows.
- Contract tests required for all handoff endpoints/events.

## 13) Suggested Repo Layout (Target)
```text
apps/
  plancraft-web/
  foundercontent-web/
services/
  platform-identity/
  platform-billing/
  platform-memory/
  platform-events/
  plancraft-core/
  foundercontent-core/
shared/
  contracts/
    events/
    apis/
```

## 14) 90-Day Execution Plan
1. Finalize ownership map and entity dictionary.
2. Implement v1 handoff APIs + deep links.
3. Add shared event envelope + idempotency guard.
4. Add entitlement middleware per workspace.
5. Ship first two bridges:
   - Campaign -> Execution Project
   - Goal/Project -> Campaign Draft

## 15) Decision Log
- 2026-05-29: Keep PlanCraftAI and FounderContentAI as separate products.
- 2026-05-29: Place Ops Center in PlanCraftAI.
- 2026-05-29: Share platform layers (identity, billing, memory, events, analytics).

## 16) Open Questions
- Should CRM remain FounderContent-only, or split into acquisition CRM vs delivery CRM?
- Do we keep one workspace type with feature flags, or distinct workspace archetypes?
- What is the SLA boundary for shared platform outages affecting both products?
