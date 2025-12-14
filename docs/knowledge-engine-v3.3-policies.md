# Knowledge Engine V3.3 — Policies (Advisory, No Auto-Exec)

Goal: Add policy-based safeguards and routing on top of V3 approvals/actions. Policies remain advisory: they may auto-approve or auto-reject proposals, but never auto-execute actions. Execution remains manual/explicit.

## Scope
- Define policy rules per workspace.
- Apply policies when creating proposals (from change-impact or integrations).
- Allow auto-approval/rejection of proposals based on rules (optional).
- Actions still require explicit execution (no auto-run).
- Full audit trail for policy decisions.

## Data Model (Firestore)
- `workspace_policies/{id}`
  - workspaceId
  - name
  - rules: array of rule objects (see below)
  - enabled: boolean
  - createdBy, createdAt, updatedAt
- Rule shape (examples):
  - match: { source: "jira", label: "security", actionType: "create_task" }
  - effect: "require_admin" | "require_two_approvals" | "auto_approve" | "auto_reject"
  - scope: "proposal" | "action" (V3.3 focuses on proposal-level effects)

## Policy Evaluation (Proposal time)
1) On proposal creation, load enabled policies for workspace (max N, e.g., 10).
2) For each policy rule, check match against:
   - proposal source (type/refId; integrations source)
   - impacts (nodeType, proposals[] types)
   - changeSummary text (optional contains match)
3) Collect effects; resolve conflicts by priority:
   - auto_reject > auto_approve > require_two_approvals > require_admin > no-op
4) Apply to proposal:
   - auto_reject: set proposal.status = rejected; write audit event.
   - auto_approve: set proposal.status = approved; generate actions (status=ready); write audit event.
   - require_two_approvals: mark proposal.policyFlags.requiresTwoApprovals = true.
   - require_admin: mark proposal.policyFlags.requiresAdminApproval = true.

Notes:
- Auto-approve still does NOT execute actions. Execution remains manual/explicit.
- If multiple effects apply, choose highest priority above.

## Approval Behavior with Policy Flags
- If requiresTwoApprovals: store approvals; proposal status changes to approved only after 2 distinct approvers.
- If requiresAdminApproval: only admin can approve/reject.
- Existing role checks remain in place; policy can narrow, not widen permissions.

## API (backend-node)
- `GET /api/knowledge/policies` (list for workspace)
- `POST /api/knowledge/policies` (create/update)
- `POST /api/knowledge/proposals/:id/approve` already exists:
  - Enforce policy flags (admin only when required; two approvals when flagged).
- Policy evaluation hook:
  - When creating proposal (from change-impact, integrations, or manual), apply policies.

## Audit
- Log policy decisions:
  - policy_applied (auto_approve/auto_reject/flags)
  - policy_blocked_approval (insufficient role or missing second approver)
- audit_log remains append-only.

## Non-goals (V3.3)
- No auto-execution of actions.
- No background approvals beyond auto-approve/reject at proposal creation.
- No deletes; no task/doc inference changes.

## Examples
- “Jira issues with label=security require admin approval.”
- “Any proposal with >10 actions auto-reject.”
- “Emails from ops@company.com auto-approve (still requires manual execution).”
- “Monitoring alerts (source=webhook, event=alert) require two approvals.”
