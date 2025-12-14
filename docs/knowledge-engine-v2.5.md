# Knowledge Engine V2.5 — Signal Hardening & Feedback Loop (Spec)

Goal: learn which impacts are relevant before automation. Stay read-only; no approvals yet.

## Scope
- Keep change-impact read-only.
- Collect lightweight user feedback on impacts.
- Bucket confidence for calibration.
- No mutations, no approvals, no auto-actions.

## Data
New collection: `knowledge_impact_feedback`
Shape (one document per feedback event):
```
{
  workspaceId: string,
  source: { type: string, refId: string },
  impacted: { type: string, refId: string },
  confidence: number,
  userAction: "relevant" | "irrelevant",
  createdBy: string | null,
  createdAt: timestamp
}
```

## UI (ChangeImpactPreview additions)
- Add optional pills: 👍 “Relevant”, 👎 “Not relevant” per impact item.
- On click: POST feedback (no UI state change beyond a small toast/check).
- Show confidence tags (High ≥0.7, Medium 0.5–0.69, Low 0.35–0.49) to help users scan.
- Keep proposals non-clickable; still read-only.

## API (backend-node)
Endpoint: `POST /api/knowledge/impact-feedback`
Auth: requireAuth + workspace member (any role).
Payload:
```
{
  workspaceId: "ws_123",
  source: { type: "doc|task|requirement", refId: "doc_abc" },
  impacted: { type: "task|doc|requirement", refId: "task_123" },
  confidence: 0.68,
  userAction: "relevant" | "irrelevant"
}
```
Behavior:
- Validate workspace membership; no writes outside workspace.
- Store in `knowledge_impact_feedback` with createdBy + createdAt.
- No fan-out, no side effects.

Optional logging:
- Increment counters per workspace:
  - feedback.total
  - feedback.relevant
  - feedback.irrelevant
  - buckets: hi/med/low

## Calibration (offline/read-only)
- From feedback events, compute:
  - Precision per confidence bucket
  - Per-node-type hit rates
- Do NOT auto-adjust thresholds in V2.5; report only.

## Out of scope (explicitly)
- No task/doc mutations.
- No approvals.
- No edge edits or rescoring.
- No pricing gates.
- No UI for analytics yet (can be a dev-only script/dashboard later).
