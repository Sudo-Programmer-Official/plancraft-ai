# PlanCraftAI Project Management Plugin — Execution Brief

## Goal
Add an optional Project Management layer (Projects / Status workflows / optional Sprints) on top of the existing task system. Default users see only tasks. PM surfaces appear only when explicitly enabled per workspace. Keep backward compatibility and clean separation of concerns.

## Non-Negotiables
- Tasks remain the primary record; no schema changes to existing task tables/services.
- PM is plugin-gated: when disabled, PM UI is hidden and PM APIs return 403 `PLUGIN_DISABLED`.
- New isolated `project-service`; other microservices stay unchanged.
- Removing a project never deletes tasks.
- Sprints are optional and fully hidden/blocked when disabled.
- Permissions enforced server-side; frontend checks are advisory only.

## Service Boundaries
- New Node.js microservice: `project-service` (reuse existing auth middleware).
- Ownership: Project, Status, Sprint, ProjectTask, WorkspacePluginSettings.
- Projects reference tasks by `taskId` only; never store task content; never write PM state into Task.

## Data Models
- **Project**: `id uuid`, `workspaceId string`, `name string`, `description text?`, `isActive boolean default true`, `createdBy string`, `createdAt ts`, `updatedAt ts`
- **Status**: `id uuid`, `projectId uuid`, `name string`, `order int`, `isSystem boolean default false`, `createdAt ts`, `updatedAt ts`
- **Sprint** (optional): `id uuid`, `projectId uuid`, `name string`, `startDate date?`, `endDate date?`, `createdAt ts`, `updatedAt ts`
- **ProjectTask**: `projectId uuid`, `taskId string`, `statusId uuid`, `sprintId uuid?`, `assignedTo string?`, `addedBy string`, `createdAt ts`, `updatedAt ts`, `UNIQUE(projectId, taskId)`
- **WorkspacePluginSettings** (in `project-service` only): `workspaceId PK string`, `projectManagementEnabled boolean default false`, `sprintEnabled boolean default false`, `sprintLabel string default "Sprint"`, `updatedBy string`, `updatedAt ts`
- **Invariant**: ProjectTask holds all project-specific state; Task remains immutable w.r.t. PM workflows.

## Feature Gating (Hard)
- Every PM endpoint checks: PM enabled for workspace.
- Sprint endpoints or any `sprintId` usage require `sprintEnabled=true`.
- If not enabled → 403 `{ code: "PLUGIN_DISABLED" }`.

## Roles & Permissions
- Roles: `workspace_admin`, `project_admin`, `member`.
- Only `workspace_admin` can enable/disable PM and sprints.
- Only `workspace_admin` or `project_admin` can edit projects, statuses, sprints.
- Members can add/remove task mappings, move status, assign sprint (if enabled).
- Approval logic remains centralized (see Impact & Proposals section).

## API (REST v1)
### Workspace Plugin Settings
- `GET  /v1/workspaces/:workspaceId/plugins/project-management`
- `PUT  /v1/workspaces/:workspaceId/plugins/project-management` (workspace_admin; disabling PM forces `sprintEnabled=false`; data retained but access blocked)

### Projects
- `POST   /v1/projects` `{ workspaceId, name, description? }` (PM enabled; admins). Auto-create default statuses: Todo(1, system), In Progress(2, system), Done(3, system).
- `GET    /v1/projects?workspaceId=&isActive=`
- `GET    /v1/projects/:projectId`
- `PATCH  /v1/projects/:projectId` `{ name?, description?, isActive? }` (admin/project_admin)
- `DELETE /v1/projects/:projectId` (workspace_admin; soft delete ok; must not delete tasks)

### Status Workflow
- `POST   /v1/projects/:projectId/statuses` `{ name, order }` (admin/project_admin)
- `GET    /v1/projects/:projectId/statuses`
- `PATCH  /v1/statuses/:statusId` `{ name?, order? }` (cannot delete/rename system statuses unless workspace_admin)
- `DELETE /v1/statuses/:statusId[?moveTasksToStatusId=...]` (admin/project_admin; block if tasks present unless move specified)

### Project ↔ Task Mapping
- `POST   /v1/project-tasks` `{ projectId, taskId, statusId?, sprintId? }` (default status=Todo; validate task workspace)
- `GET    /v1/projects/:projectId/tasks?sprintId=&statusId=&q=&limit=&cursor=` (returns taskId + PM metadata only)
- `PATCH  /v1/project-tasks/:projectId/:taskId` `{ statusId?, sprintId? }` (block sprint assignment if sprint disabled)
- `DELETE /v1/project-tasks/:projectId/:taskId` (does not delete task)

### Sprints (when sprintEnabled)
- `POST   /v1/projects/:projectId/sprints` `{ name, startDate?, endDate? }` (admin/project_admin)
- `GET    /v1/projects/:projectId/sprints`
- `PATCH  /v1/sprints/:sprintId` `{ name?, startDate?, endDate? }`
- `DELETE /v1/sprints/:sprintId[?unassign=true]` (must unassign tasks or require flag)

### AI Hooks (stubs only)
- `GET /v1/projects/:id/summary`
- `GET /v1/sprints/:id/health`
- `GET /v1/projects/:id/stalled-tasks`
(Return 501 or placeholder JSON; no AI logic yet.)

## Frontend Requirements (apps/audit-agent-frontend)
- Workspace Settings → Plug-ins: toggle PM, toggle Sprints (disabled unless PM on), `sprintLabel` text.
- PM UI lazy-loads only when PM enabled; hide all PM terminology otherwise.
- New PM surfaces: Project List; Project Board (status columns); optional sprint selector when sprintEnabled; Project Settings (name/desc, statuses CRUD/reorder, sprints CRUD when enabled).
- Tasks still fetched from existing task APIs; project-service returns taskId/statusId/sprintId metadata; frontend merges.

## Integration: Knowledge / Impact & Proposals
- Impact & Proposals remains workspace-scoped by default; when PM enabled, allow project scope via `scopeType enum('workspace','project')` + `scopeId`.
- Backend owner: existing Impact/Proposals service or backend-node adapter (do NOT place in project-service; do not add a new impact-service unless it already exists).
- Data change: add fields (`scopeType`, `scopeId`) or mapping table `impact_scope_map { impactId, scopeType, scopeId }`. Existing rows remain valid as workspace scope.
- Permissions: workspace scope follows existing rules; project scope create/modify/delete by project_admin/workspace_admin; members can view (unless current rules stricter); approvals recommended to stay with workspace_admin.
- API additions (non-breaking): support `GET /v1/impact-proposals?scopeType=project&scopeId=:projectId`; `POST /v1/impact-proposals { scopeType, scopeId, ... }`; `POST /v1/change-impact/analyze { scopeType, scopeId, ... }` (may stub/reuse existing pipeline). Validate `projectId` via project-service read-only. If PM disabled, hide project scope and return 403 `PLUGIN_DISABLED` for project-scoped calls.
- Frontend: In Settings → Impact & Proposals, add scope selector (Workspace default; Project option only if PM enabled) + project dropdown. In Project Settings, show project-scoped proposals and a deep link back to Settings with scope preselected.
- Failure modes: if impact/proposals backend fails, PM and tasks continue working; project-service stays focused on PM data only.

## Observability & Guardrails
- Structured logs include `requestId`, `workspaceId`, `projectId`.
- Graceful degradation: PM failures must not block task reads/writes; when project-service is down, fallback to simple task UI.
- Rate limit basic endpoints (optional).
- Default statuses auto-created per project.

## Execution Roadmap (Phased)
1) Foundation (Backend): stand up `project-service`; migrations for Project/Status/Sprint/ProjectTask/WorkspacePluginSettings; project CRUD; default statuses seeded.  
2) Task ↔ Project Linking: mapping endpoints; status moves; ensure task source-of-truth untouched.  
3) Sprints (Optional): gated CRUD + assignment; sprint terminology via `sprintLabel`.  
4) Permissions & Gating: enforce roles server-side; 403 on disabled plugin/sprint usage; structured errors.  
5) Frontend Surfaces: Plug-ins toggles; Project List/Board/Settings; sprint selector; hide PM when disabled.  
6) Impact & Proposals Integration: scope selector; project validation; project-scoped proposals; deep links; failure isolation.  
7) Polish & AI Hooks: graceful degradation paths, empty states, logging/metrics; stub AI endpoints for summary/health/stalled tasks.

## Business Outcomes & Decision Support
- Keep governance centralized: Impact & Proposals stays in Settings with scoped views so leadership can approve changes without entering boards.  
- Project scope enables real-world decision contexts (per-project risk/proposal review) while workspace scope remains default for org-wide policy.  
- Data isolation plus plugin gating ensures safe enterprise rollout and clean demo story for customers who only want tasks.

## Work Packages (Pickup-Ready)
- Backend: create `project-service` skeleton (Express, auth middleware reuse), migrations for core tables, gating middleware, default-status seeding.  
- Backend: implement PM endpoints per spec; add permissions checks; add AI stub handlers.  
- Backend: extend Impact/Proposals service with `scopeType/scopeId` (or mapping table), validation with project-service, additive APIs.  
- Frontend: Plug-ins settings UI (PM toggle, sprint toggle, sprintLabel); gate all PM calls/strings.  
- Frontend: Project List/Board/Settings pages; sprint selector; status CRUD/reorder; wiring to project-service mappings.  
- Frontend: Impact & Proposals scope selector + project dropdown; project-scoped list/create; Project Settings section with deep link.  
- Tooling: OpenAPI spec `/docs/openapi/project-service.yaml`; Postman collection; README updates; integration and unit tests for gating/permissions.

## Testing
- Unit tests for gating and permissions.
- Integration path: enable plugin → create project → add task → move status → disable plugin → confirm access blocked.
- Migration safety tests in CI if available.

## Docs & Assets to Produce
- `/docs/openapi/project-service.yaml` (full OpenAPI).
- `/docs/project-service.postman.json` (collection).
- `/docs/project-management-plugin.md` (this brief; keep updated).
- README update for setup/env/local run/migrations.

## Definition of Done
- PM toggle works end-to-end; sprint gating enforced.
- PM UI hidden and APIs blocked when disabled.
- Project CRUD + default statuses working.
- ProjectTask mapping works; tasks untouched.
- Sprints optional and gated.
- Impact & Proposals: workspace scope unchanged; project scope works when PM enabled; project-scoped proposals visible in Project Settings and Settings with scope filter.
- Docs + OpenAPI + Postman added.
- Tests for gating/permissions + key integration path green.
- No regressions in existing task flows.

## Current Implementation Status (scaffold)
- Added `services/project-service` Express scaffold with Firestore-backed store (replaces in-memory), plugin gating, project/status/sprint/project-task endpoints, and AI stubs.  
- Added `/docs/openapi/project-service.yaml` and `/docs/project-service.postman.json` for initial contracts.  
- Service uses temporary headers (`x-user-id`, `x-workspace-id`, `x-roles`) and Firestore persistence—replace with shared auth/membership and task validation next.  
- Default statuses are auto-created on project creation; sprint endpoints gated by `sprintEnabled`.  
- Added minimal migration runner (`npm run migrate`) that records applied migrations in Firestore (`project_migrations`).  
- Impact & Proposals integration still to implement in backend/frontend (scope selector, additive APIs, project validation).  
- Tests and frontend surfaces remain to be built; next steps: wire real datastore, membership checks, and UI gating per roadmap.
