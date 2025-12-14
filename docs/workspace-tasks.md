# Workspace-scoped tasks (PlanCraftAI)

Shared tasks live in the root collection `tasks` and are scoped by `workspaceId`. Firestore rules enforce:

- `workspaceId` (string) is required on create.
- `createdBy` must equal the authenticated user on create and is immutable.
- Membership is validated against `workspace_members/{workspaceId}_{uid}` with `status: active`.
- Roles: viewer can read; editor/admin/owner can create/update/delete.
- Legacy personal tasks (no `workspaceId`) are still readable/updatable by their owner.

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
- Legacy fallback (optional) can check `workspaceId == null` AND `userId == uid` to surface personal tasks for the owner.

Reminder: backend APIs that create tasks must also pass `workspaceId` and set `createdBy`, and callers must have editor/admin (or owner) membership in that workspace.***
