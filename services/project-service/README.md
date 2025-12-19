# project-service (PlanCraftAI Project Management Plugin)

Lightweight Express scaffold for the Project Management plugin. Uses in-memory storage for now; replace with persistent datastore + shared auth/membership when integrating.

## Run locally

```bash
cd services/project-service
npm install
npm run migrate   # records migration state in Firestore
npm run dev
```

The service listens on `PORT` (default 4005). Requires Firestore credentials via `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT` (JSON string).

## Headers (temporary)
- `x-user-id`: caller identity
- `x-workspace-id`: workspace context
- `x-roles`: comma-separated roles, e.g. `workspace_admin,project_admin`

## Notes
- All data is in-memory; restart clears state.
- PM endpoints enforce plugin gating; enable via `PUT /v1/workspaces/:workspaceId/plugins/project-management`.
- Default statuses seed on project creation.
- Sprint endpoints require `sprintEnabled=true`.
- AI endpoints are stubs (501) for future implementation.
