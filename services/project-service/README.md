# project-service (PlanCraftAI Project Management Plugin)

Lightweight Express service for the Project Management plugin. Persists to Firestore and derives roles from workspace membership (falls back to header roles for local/dev).

## Run locally

```bash
cd services/project-service
npm install
npm run migrate   # records migration state in Firestore
npm run dev
```

The service listens on `PORT` (default 4005). Requires Firestore credentials via `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT` (JSON string). `APP_JWT_SECRET` enables `x-app-token` HS256 auth; otherwise use Firebase `Authorization: Bearer <idToken>`.

## Auth & headers
- `Authorization: Bearer <firebase-id-token>` (preferred) or `x-app-token` (HS256, when `APP_JWT_SECRET` set).
- Dev fallback: `x-user-id` is only accepted when `NODE_ENV=development` or `ALLOW_DEV_HEADER_AUTH=1`; otherwise returns 401.
- `x-workspace-id`: workspace context (required on all PM routes).
- Roles derive from `workspace_members` (`owner/admin` -> `workspace_admin` + `project_admin`; `editor` -> `project_admin`). For local/dev you can still pass `x-roles` (set `ALLOW_HEADER_ROLE_OVERRIDE=0` to disable).
- If you want to force header presence for workspace scoping, set `REQUIRE_WORKSPACE_HEADER=1` (path `:workspaceId` still allowed). To allow platform bootstraps without workspace, set `PLATFORM_ADMIN_IDS=<comma-separated-user-ids>`.

## Notes
- PM endpoints enforce plugin gating; enable via `PUT /v1/workspaces/:workspaceId/plugins/project-management`.
- Default statuses seed on project creation.
- Sprint endpoints require `sprintEnabled=true`.
- AI endpoints are stubs (501) for future implementation.
- Events: set `EVENT_SINK=log|memory|none` (`memory` enables `/projects/:projectId/activity` reads; `EVENT_MEMORY_LIMIT` caps buffered events; `EVENT_ACTIVITY_ENABLED=0` disables activity output). Activity supports `?limit=&cursor=` pagination (id or timestamp cursor; default limit 50).

## Smoke test
Quick membership/auth sanity check (uses live Firestore membership):
```bash
cd services/project-service
node scripts/auth-smoke.js --mode firebase --token "$ID_TOKEN" --workspace ws_123
# or app token:
node scripts/auth-smoke.js --mode app --token "$APP_TOKEN" --workspace ws_123
# or dev header:
node scripts/auth-smoke.js --mode header --user user123 --roles workspace_admin --workspace ws_123
```
