# Knowledge Engine V3.2 — Integrations → Proposals (Spec)

Goal: Convert external signals (Jira, Webhook, Email) into impact-aware proposals that stay approval-gated. No auto-exec.

## Scope
- Ingest events from Jira, generic webhooks, and inbound email.
- Normalize events → impact analysis → proposal creation (status=pending) → notify workspace.
- No task/doc mutations; no auto-exec; approvals/actions reuse existing V3 rails.

## Event Shapes (normalized)
- Jira: `{ source: "jira", event: "issue_created|issue_updated", issueKey, summary, description, url, project, labels, reporter, assignee }`
- Webhook: `{ source: "webhook", event: string, payload: object }`
- Email: `{ source: "email", event: "received", subject, from, to, body }`

## Flow
1) Receive event (secure endpoints; auth via app token + workspace context).
2) Normalize to an envelope:
   `{ source, event, eventId, occurredAt, workspaceId, payload }` (eventId optional; hash synthetic if missing).
3) Build changeSummary string from payload (e.g., “Jira issue ABC-123 updated: …”).
4) Run change-impact (existing /knowledge/change-impact) with source = {type:"requirement", refId: syntheticId} by default for integrations (unless explicit mapping provided).
5) Create impact proposal:
   - workspaceId
   - source: { type: "requirement", refId: syntheticId } or provided mapping
   - impacts: from change-impact response
   - note: changeSummary
   - status: pending
6) Notify workspace (optional): emit event/log, no auto-actions.

## API (backend-node)
- `POST /api/integrations/jira` (secured with x-app-token)
  - Body: `{ workspaceId, event, issue }` (issue contains key/summary/description/url/labels/etc.)
- `POST /api/integrations/webhook`
  - Body: `{ workspaceId, event, payload }`
- `POST /api/integrations/email`
  - Body: `{ workspaceId, subject, from, to, body }`

Behavior:
- Enforce workspace membership (editor/admin) via app-token flow or linked integration (workspace-scoped).
- Normalize, build changeSummary, call change-impact if possible, then create proposal (pending).
- Never auto-create tasks; never auto-approve; never auto-execute.

Optional envelope (recommended for dedup/replay):
```
{
  source,
  event,
  eventId,
  occurredAt,
  workspaceId,
  payload
}
```

## Proposal Creation Rules
- Synthetic requirement id: `req_evt_${hash(eventId||summary||subject)}` when no explicit refId.
- impacts: direct from change-impact; if no impacts, still create a proposal with empty impacts for review.
- Max actions per proposal limit still applies (already enforced).

## Non-goals
- No bi-directional sync.
- No status writes back to Jira/email/webhook.
- No auto-approvals.
- No new action types.

## Security
- Require x-app-token (server-to-server); reject public calls.
- Validate workspace membership on server side (do not trust workspaceId input alone).

## UI (reuse)
- Proposal Inbox continues to show these proposals; they look the same as others (pending until approved).
