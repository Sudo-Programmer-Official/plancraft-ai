# Knowledge Engine V2.3 — Change Impact Proposal Engine (Spec)

Goal: Given a changed source (doc/task/requirement), propose impacted items and safe follow-ups. Read-only; proposals only.

## Scope
- Read graph only (no writes).
- Traverse up to 2 hops; cap results to 20 items.
- Drop any impact with confidence < 0.35.
- Every impact must include a reason; if no reason, omit.
- No task/doc mutation, no edge deletion, no inference of new entities, no UI.

## Endpoint (backend-node)
`POST /api/knowledge/change-impact`

Request:
```json
{
  "workspaceId": "ws_123",
  "source": { "type": "doc|task|requirement", "id": "doc_abc" },
  "changeSummary": "Added MFA requirement to login flow",
  "maxHops": 2
}
```

Processing:
1) Resolve source node by type/id within workspace.
2) BFS graph traversal depth ≤ 2; collect connected nodes.
3) Aggregate confidence = edgeConfidence * hopDecay (e.g., decay 0.85 per hop).
4) Build impacts with node info + confidence + reason derived from relationships and changeSummary.

Response:
```json
{
  "sourceNode": { "id": "doc_abc", "type": "doc" },
  "impacts": [
    {
      "nodeType": "task",
      "nodeId": "task_123",
      "confidence": 0.74,
      "reason": "Task was derived_from the updated authentication document",
      "proposals": ["review", "update"]
    }
  ]
}
```

Defaults:
- maxHops default 2 (clamped 1–2)
- maxItems default 20 (clamped 1–50)
- confidence floor 0.35

## Prompt snippet (AI service, proposals only)
System guardrails:
- Only reference provided nodes/edges.
- Only propose actions (review/update/create).
- Every proposal must include a reason referencing relationships.
- Do not invent new entities or modify data.

Prompt fragment:
```
Given the changed source and the connected nodes below, identify which items may be impacted.
For each impact:
- State the reason using graph relationships
- Propose actions only (review/update/create)
Do not modify anything.
Do not invent new requirements.
Drop any impact without a clear reason.
```

## Out of scope for V2.3
- Auto-updates or deletes
- Edge pruning or rescoring
- UI/visualization
- New requirement inference
- Cross-workspace reasoning
