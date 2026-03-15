# PlanCraftAI Mobile Auth Checklist

## Goal

Auth is only done when the full native loop works:

1. App opens cleanly.
2. Login method starts correctly.
3. Auth completes.
4. User lands back in the native app shell.
5. Session is restored inside the app.
6. Dashboard loads without runtime crash.
7. Cold reopen still works.
8. Logout and relogin both work.

## Changes Made

### Native app boot and session

- Added bounded auth bootstrap timeout to stop infinite "Restoring your session".
- Added router timeout fallback so native boot does not hang forever on Firebase auth state.
- Suppressed the PWA install prompt inside packaged apps.
- Disabled service worker registration inside packaged apps.
- Simplified iOS auth persistence to avoid IndexedDB-related hangs in WKWebView.
- Prevented native iOS from treating stale local backup data as a valid authenticated session.
- Prevented standalone session backup restore logic from running inside the native shell.

### Android auth return flow

- Added Android app-link / deep-link return path.
- Added hosted `assetlinks.json` for app-link verification.
- Added frontend native handoff listener for app URL open events.
- Added backend one-time mobile handoff creation and consumption endpoints.
- Added Android Google redirect bridge so browser login can return to app instead of stranding the user in Chrome.

### iOS auth hardening

- Switched native iOS email/password to direct Identity Toolkit password verification.
- Added backend custom-token exchange after successful native iOS password verification.
- Replaced hanging Firebase SDK email sign-in path on native iOS.
- Added native iOS custom-token verification path with Identity Toolkit.
- Added native iOS auth-state hydration fallback when `updateCurrentUser()` stalls.
- Fixed native iOS custom-token response normalization by deriving missing user fields from JWT claims.

### Backend auth fixes

- Moved auth routes ahead of generic protected `/api` mounts so public auth endpoints are not intercepted by `requireAuth`.
- Fixed CORS handling for Capacitor/Ionic origins.
- Added targeted Firebase Admin and token-verification logging for native exchange debugging.

### Post-login app issues

- Fixed dashboard crash caused by missing `driver.js` import by lazy-loading the tour only when needed.
- Changed session-expired flow to clear auth artifacts and route to `/login?expired=1` instead of reloading the broken app state.
- Tightened logout cleanup so stale auth artifacts are removed before redirecting to login.

## Key Files Touched

- `apps/audit-agent-frontend/src/stores/authStore.js`
- `apps/audit-agent-frontend/src/firebase/init.js`
- `apps/audit-agent-frontend/src/router/index.js`
- `apps/audit-agent-frontend/src/main.js`
- `apps/audit-agent-frontend/src/services/api.js`
- `apps/audit-agent-frontend/src/services/firebaseService.js`
- `apps/audit-agent-frontend/src/views/LoginView.vue`
- `apps/audit-agent-frontend/src/views/DashboardView.vue`
- `apps/audit-agent-frontend/src/components/InstallPrompt.vue`
- `apps/audit-agent-frontend/src/utils/nativeAuthSupport.js`
- `apps/audit-agent-frontend/src/utils/authStorage.js`
- `apps/backend-node/index.js`
- `apps/backend-node/routes/authRoutes.js`
- `apps/backend-node/routes/aiRoutes.js`
- `apps/backend-node/routes/transcribeRoutes.js`
- `apps/backend-node/services/firebaseAdmin.js`
- `mobile/android/app/src/main/AndroidManifest.xml`
- `apps/audit-agent-frontend/public/.well-known/assetlinks.json`

## Current Status

| Platform | Method | Status | Notes |
| --- | --- | --- | --- |
| Android | Email/password | Working | Logged in successfully in emulator. |
| Android | Google | Needs re-validation | Return-to-app bridge is wired; validate full browser-to-app loop again after current changes. |
| Android | Session restore | Needs re-validation | Reopen and logout/relogin pass still need to be re-run as a full loop. |
| iOS | Email/password | In active validation | Native iOS auth path now reaches password verify, custom-token exchange, and auth hydration. Latest blocker was stale cached session handling, now patched. |
| iOS | Google | Not release-ready | Redirect start is wired, but return-to-app path is still incomplete. |
| iOS | Session restore | In active validation | Must be re-tested after stale-cache patch. |

## Known Remaining Issues

### iOS Google return-to-app is incomplete

- `App URL bridge setup failed {"code":"UNIMPLEMENTED"}` still appears in native logs.
- `GoogleService-Info.plist` is still missing from `mobile/ios`.
- iOS native URL scheme / associated-domain return handling is not fully wired.

### iOS release readiness is still gated by retest

- Need one clean pass proving:
  - fresh launch goes to login if no real Firebase session exists
  - email login lands on dashboard
  - cold reopen keeps session
  - logout goes to login
  - relogin works

## Rebuild Commands

### Frontend build

```bash
nvm use 22
cd apps/audit-agent-frontend
./node_modules/.bin/vite build --mode production
```

### iOS sync

```bash
cd ../../mobile
../node_modules/.bin/cap sync ios
../node_modules/.bin/cap open ios
```

### Android sync

```bash
cd ../../mobile
../node_modules/.bin/cap sync android
../node_modules/.bin/cap open android
```

## End-to-End Test Matrix

### Android

#### Email/password

- [ ] Open the app from a fresh install.
- [ ] Confirm app opens cleanly and does not show PWA install UI.
- [ ] Go to login.
- [ ] Sign in with valid email/password.
- [ ] Confirm dashboard loads inside the native shell.
- [ ] Close the app completely.
- [ ] Reopen the app.
- [ ] Confirm session restores and dashboard loads.
- [ ] Logout.
- [ ] Confirm app returns to login.
- [ ] Log in again.

#### Google

- [ ] Tap `Continue with Google`.
- [ ] Confirm browser/custom tab opens.
- [ ] Complete Google consent.
- [ ] Confirm app returns to the native shell.
- [ ] Confirm dashboard loads inside the app, not browser.
- [ ] Close and reopen app.
- [ ] Confirm session persists.
- [ ] Logout and relogin once more.

### iOS

#### Email/password

- [ ] Delete app from simulator/device before first clean retest.
- [ ] Launch app.
- [ ] Confirm app does not auto-enter dashboard from stale cached backup if Firebase has no real session.
- [ ] Sign in with valid email/password.
- [ ] Confirm logs show:
  - `Native iOS password verification resolved`
  - `Native iOS custom token exchange resolved`
  - `Native iOS Identity Toolkit custom token sign-in resolved`
  - `Native iOS auth state hydrated from custom token`
- [ ] Confirm dashboard loads without blank screen or runtime crash.
- [ ] Close app completely.
- [ ] Reopen app.
- [ ] Confirm session restores correctly.
- [ ] Logout.
- [ ] Confirm app routes to login.
- [ ] Login again.

#### Google

- [ ] Tap `Continue with Google`.
- [ ] Confirm Google flow starts.
- [ ] Confirm the app returns to the native shell after consent.
- [ ] Confirm dashboard loads inside the app.

Status:
- Keep this blocked until iOS return-to-app is fully wired and `GoogleService-Info.plist` is added.

## Exact Success Criteria

### Android done

- Email/password passes all steps.
- Google passes full browser-to-app return flow.
- Reopen, logout, and relogin all pass.

### iOS done

- Email/password passes full loop with no stale-session fallback.
- Reopen, logout, and relogin all pass.
- Google returns to app and lands on an authenticated protected screen.

## Release Decision Rule

- Do not treat "Google browser opened" as success.
- Do not treat "Google consent completed in browser" as success.
- Do not treat cached local user data as a valid native session.
- A method is release-ready only when protected native screens load after auth and the session survives reopen.

## Recommended Immediate Validation Order

1. Re-test iOS email/password after the stale-session patch.
2. Re-run Android email full loop.
3. Re-run Android Google full return-to-app loop.
4. Re-test iOS logout and relogin.
5. Leave iOS Google blocked until native return-to-app is fully wired.
