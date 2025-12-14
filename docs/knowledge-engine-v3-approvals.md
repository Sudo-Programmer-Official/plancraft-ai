# Knowledge Engine V3 — Approvals & Action (Spec)

Goal: Turn impact proposals into safe, auditable actions. Human approval required. No auto-exec.

## Core Concepts
- **Proposal**: Suggested action set derived from impact analysis.
- **Approval**: Human decision gate on a proposal or individual action.
- **Action**: A concrete, deterministic operation (create/update/review flag).
- **AuditEvent**: Append-only log of decisions and executions.

## Data Model (Firestore)
- `impact_proposals/{id}`
  - workspaceId, source {type, refId}, impacts[], status: "pending"|"approved"|"rejected", createdBy, createdAt, updatedAt
  - impacts[]: { nodeType, refId, confidence, reason, proposedActions: ["review"|"update"|"create_task"], note? }
- `proposal_approvals/{id}`
  - workspaceId, proposalId, approverId, status: "pending"|"approved"|"rejected", approvedAt, note?
- `approval_actions/{id}`
  - workspaceId, proposalId, type: "create_task"|"update_task"|"mark_review", payload, status: "pending"|"ready"|"executed"|"failed", executedBy?, executedAt?, error?
- `audit_log/{id}`
  - workspaceId, actorId, eventType: "proposal_created"|"proposal_approved"|"proposal_rejected"|"action_executed"|"action_failed", ref: {proposalId?, actionId?}, meta, createdAt

## Rules / Permissions
- Who can approve: workspace role in ["admin","editor"] (configurable later).
- Who can execute: same as approvers; no background auto-exec.
- What cannot auto-exec: deletes, bulk updates, task status changes without approval.
- Immutable audit: audit_log is append-only.

## API (backend-node)
- `POST /api/knowledge/proposals`
  - Input: { workspaceId, source {type, refId}, impacts[] (from V2.3/V2.4), note? }
  - Behavior: persist proposal (status=pending), create audit_log event.
- `POST /api/knowledge/proposals/:id/approve`
  - Input: { approve: true|false, note? }
  - Behavior: update proposal status; create proposal_approvals row; write audit_log.
- `POST /api/knowledge/proposals/:id/actions/execute`
  - Input: { actionId }
  - Behavior: execute approved action (create/update/mark_review); update status; audit.
- `GET /api/knowledge/proposals` (list for workspace, optional status filter)
- `GET /api/knowledge/proposals/:id` (details + actions + approvals)

Notes:
- Actions are created deterministically from proposal impacts (e.g., propose `mark_review` for impacted tasks). No LLM generation at execution time.
- No background jobs that mutate tasks/docs without approval.

## UI Contract (minimal, safe)
- Proposal List: show pending/approved/rejected for workspace.
- Proposal Detail:
  - Impacts with reasons/confidence (reuse V2.4 display)
  - Proposed actions (read-only)
  - Buttons: Approve, Reject (role-gated)
- Action Execution:
  - After approval, show “Execute actions” (or per-action run) with confirmation dialog.
  - Show execution status and audit trail.
- No inline edits, no auto-run.

## Explicit Non-goals (V3)
- No auto-execution or scheduled execution.
- No edge/task/doc inference changes.
- No deletions.
- No pricing/feature gating in code (handled externally).

## ICP & Pricing Draft (v0)
- Primary ICP: Product & Engineering teams (5–50 devs) in SaaS/internal tools/fintech/healthtech; feel change-impact pain, need approvals, avoid risky automation.
- Secondary ICP: Agencies/consultancies running multiple client workspaces needing auditability.

Pricing tiers (sketch):
- Free: tasks + planner, no knowledge.
- Pro: knowledge ingestion/search, impact preview (V2.4), no approvals.
- Team: impact preview + approvals (V3), audit log.
- Business/Enterprise: external integrations (Jira/webhook), SSO, advanced audit/export.

## Rollout Order
1) Implement APIs + Firestore models (no UI automation).
2) Minimal UI for proposals + approvals + execution confirmation.
3) Log audit events for every state change.
4) Keep execution manual and explicit.
