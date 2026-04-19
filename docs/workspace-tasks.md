# Workspace-scoped tasks (PlanCraftAI)

Shared tasks live in the root collection `tasks` and are scoped by `workspaceId`. Firestore rules enforce:

- `workspaceId` (string) is required on create.
- `createdBy` must equal the authenticated user on create and is immutable.
- Membership is validated against `workspace_members/{workspaceId}_{uid}` with `status: active`.
- Roles: viewer can read; editor/admin/owner can create/update/delete.
- Legacy personal tasks (no `workspaceId`) are still readable/updatable by their owner.
- Workspace task updates cannot remove or change `workspaceId`.

Client write payloads must include:

```js
{
  title,
  details,
  workspaceId: activeWorkspaceId,
  createdBy: auth.currentUser.uid,
  userId: auth.currentUser.uid,      // legacy/back-compat
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...
}
```

Fetching:

- Always filter by `where('workspaceId', '==', activeWorkspaceId)`.
- Workspace views should not merge `workspaceId == null` legacy tasks into the active workspace cache.
- Audit legacy data before cleanup with `node scripts/auditTaskWorkspaceConsistency.mjs --report tmp/task-workspace-audit.json`.
- Only auto-fix the safe case with `node scripts/auditTaskWorkspaceConsistency.mjs --apply-resolved-missing`.

Viewer behavior:

- Viewers can read workspace tasks but cannot update them directly through Firestore rules.
- The web app falls back to `PATCH /tasks/:taskId/completion` when a completion-only update is rejected by Firestore.
- That backend route still requires active workspace membership and only updates completion fields.

Deploy note:

- Changes to `apps/audit-agent-frontend/firestore.rules` do not affect production until Firestore rules are deployed.
- Use `firebase deploy --only firestore --project audit-agent-66451` when you change task access rules without shipping a full frontend release.

Reminder: backend APIs that create tasks must also pass `workspaceId` and set `createdBy`, and callers must have editor/admin (or owner) membership in that workspace.
