# Workspace invite manual checklist

Run the backend locally (`pnpm --filter backend-node dev` or equivalent) with `SENDGRID_API_KEY` and `EMAIL_FROM`/`SENDGRID_FROM_EMAIL` set. Use `APP_BASE_URL=http://localhost:5173` so invite links point at the local frontend.

1. Invite an existing user (admin in workspace):
   - `POST /api/workspaces/:workspaceId/invite` with that user’s email.
   - Expect `emailStatus=sent`, invite visible in `/workspaces/:workspaceId/members` → pending invites.
   - Email arrives with workspace + inviter name, role, CTA link.
2. Invite an email without an account:
   - Send invite, confirm email arrives (or `emailStatus=failed` banner + copy link fallback).
   - Open link in incognito → landing shows workspace + role, asks to sign in/up.
   - Complete signup → redirected back, accept succeeds, active workspace switches to invited workspace.
3. Accept as wrong email:
   - Sign in with a different email, attempt accept → expect 403 “Invite is addressed to a different email”.
4. Workspace scoping:
   - With a viewer membership, hit a workspace admin endpoint (`GET /api/workspaces/:id/members`) → expect 403.
   - Verify other workspace IDs are rejected (`x-workspace-id` header) when not a member.
5. Revoke + expire:
   - `POST /api/invites/:token/revoke` as admin → invite lookup returns revoked, accept fails 403.
   - Manually set `expiresAt` in Firestore or wait past `expires_at` → GET /api/invites/:token shows `status=expired`, accept returns 410.
6. Email failure simulation:
   - Start backend without `SENDGRID_API_KEY` → invite response has `emailStatus=failed`, UI shows “Email failed — copy invite link”.
   - Copy link works and accept flow still succeeds.
