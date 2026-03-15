# PlanCraftAI Mobile Auth Audit

Date: 2026-03-15

## Current auth methods

- Email/password via Firebase Web Auth
- Google sign-in via `signInWithPopup` / `signInWithRedirect`
- Apple sign-in via Firebase Web OAuth popup/redirect
- Phone OTP via `RecaptchaVerifier` + `signInWithPhoneNumber`
- Magic link via Firebase email link sign-in
- Guest/anonymous sign-in

## Environment summary

- Browser/PWA uses Firebase Web SDK against project `audit-agent-66451`
- Packaged mobile app is a Capacitor shell with app id `com.sudoprogrammer.plancraftai`
- Native Android app is registered in Firebase via `mobile/android/app/google-services.json`
- Native iOS Firebase registration artifacts are missing from the repo

## Works / fails matrix

Status legend:
- `Observed` means confirmed from current behavior or repo evidence
- `Assessed` means inferred from code and still needs device validation

| Flow | Browser | iPhone PWA | Android packaged app | iOS packaged app |
| --- | --- | --- | --- | --- |
| Email/password | Assessed likely works | Assessed likely works | Assessed likely works | Assessed likely works |
| Phone OTP | Assessed likely works | Assessed likely works | Observed/high-risk fail | Observed/high-risk fail |
| Google sign-in | Assessed likely works | Assessed likely works | Observed/high-risk fail | Observed/high-risk fail |
| Apple sign-in | N/A | Assessed possible in Safari/PWA | N/A | High-risk fail |
| Magic link | Assessed works | Assessed works | High-risk fail | High-risk fail |
| Session persistence | Assessed works with custom local backup | Assessed works with custom local backup | Partial, needs device validation | Partial, needs device validation |
| Logout + relogin | Assessed works | Assessed works | Needs device validation | Needs device validation |

## File inventory

| File | Purpose | Risk | Required action |
| --- | --- | --- | --- |
| `apps/audit-agent-frontend/src/firebase/init.js` | Firebase app/auth bootstrap | Uses Firebase Web Auth config even in native shell | Keep for web/PWA; do not expect this alone to solve native auth |
| `apps/audit-agent-frontend/src/stores/authStore.js` | Main auth orchestration | Native Google/Apple/phone flows still use Web SDK assumptions | Replace with native-compatible provider flows or gate them |
| `apps/audit-agent-frontend/src/views/LoginView.vue` | Auth entry UI | Exposed broken methods in packaged app | Hardened today to route native users to email/password |
| `apps/audit-agent-frontend/src/services/authService.js` | Web auth helpers | `signInWithPopup` and magic link are web-first | Keep for browser/PWA only |
| `apps/audit-agent-frontend/src/composables/useGoogleLogin.js` | Duplicate Google auth helper | Same web-only assumptions as store | Remove or refactor after native auth strategy is chosen |
| `apps/audit-agent-frontend/src/components/GoogleAuthDiagnostic.vue` | Dev diagnostics | Useful for web, not a native fix | Keep as a browser/PWA diagnostic only |
| `apps/audit-agent-frontend/src/views/SettingsView.vue` | Reauth/change-email/account actions | Uses `reauthenticateWithPopup` and phone OTP reauth | Native packaged app will also break here |
| `mobile/capacitor.config.ts` | Capacitor app shell config | Redirect assumptions depend on deep links that are not fully wired | Revisit once native auth path is chosen |
| `mobile/android/app/src/main/AndroidManifest.xml` | Android deep-link filters | Filters `__/auth/handler`, but Firebase redirect usually returns to original page like `/login` | Rework once redirect strategy is finalized |
| `mobile/android/app/google-services.json` | Android Firebase native app registration | Android exists, but JS auth does not consume native SDK | Keep; also ensure SHA-1 and SHA-256 are uploaded in Firebase |
| `mobile/ios/App/App/Info.plist` | iOS native app config | No Google URL types, no deep-link/universal-link config | Add before any native Google/Apple redirect flow can work |
| `mobile/ios/App/App.xcodeproj/project.pbxproj` | iOS bundle identifier | Bundle id present, but no Firebase iOS app assets in repo | Register iOS app in Firebase and add plist |
| `apps/audit-agent-frontend/.env.production` | Production Firebase/web config | Web config and mobile override diverge; must stay intentional | Verify production build uses the expected values |

## Highest-confidence issues

1. Native packaged app is still using Firebase Web Auth provider flows.
   - `loginWithGoogle`, `loginWithApple`, and phone OTP are implemented with `signInWithRedirect`, `signInWithPopup`, and `RecaptchaVerifier`.
   - There is no native auth plugin such as `@capacitor-firebase/authentication`.

2. iOS native auth registration is incomplete.
   - No `GoogleService-Info.plist` exists in `mobile/ios`.
   - `Info.plist` has no `CFBundleURLTypes` entry for Google/Firebase callback handling.
   - No associated domains / universal link configuration is present.

3. Redirect return handling is incomplete for native shells.
   - No `@capacitor/app` `appUrlOpen` listener exists in the frontend.
   - Android intent filters target `https://.../__/auth/handler`, but Firebase redirect flows usually return to the original page route such as `/login`.

4. Phone OTP in native app is web-only by design.
   - `RecaptchaVerifier` and `signInWithPhoneNumber` are browser-first.
   - This is the most likely reason OTP fails in wrapped mobile builds.

5. Settings/account reauth still contains mobile-breaking flows.
   - `SettingsView.vue` uses `reauthenticateWithPopup` and phone OTP reauth.
   - Even after login is stabilized, account-management screens remain risky on native.

6. Release signing secrets are committed in the repo.
   - `mobile/android/app/build.gradle` contains a release keystore password.
   - `mobile/android/app/plancraftai-release.jks` is in the repo.
   - This is a security issue and should be rotated immediately.

7. Config drift exists between web env and native Firebase artifacts.
   - Web env uses storage bucket `audit-agent-66451.appspot.com`.
   - Android `google-services.json` references `audit-agent-66451.firebasestorage.app`.
   - Not the main auth failure, but it signals setup drift.

## Changes applied today

- Added packaged-app auth guards in `authStore.js` for Google, Apple, and phone OTP.
- Hardened `LoginView.vue` so packaged mobile builds default to email/password and stop presenting Google/Apple/OTP as working paths.
- Added explicit user messaging for unsupported native auth methods.

## Firebase console checklist

- Confirm project is `audit-agent-66451`
- Verify Google provider is enabled
- Verify Phone provider is enabled
- Verify authorized domains include `plancraftai.com`
- Verify authorized domains include `audit-agent-66451.firebaseapp.com`
- Verify Android app `com.sudoprogrammer.plancraftai` exists
- Upload Android release SHA-1
- Upload Android release SHA-256
- Register iOS app `com.sudoprogrammer.plancraftai`
- Download and add `GoogleService-Info.plist`
- Verify support email is set for Google provider

## Google Cloud / Apple / native checklist

- Confirm OAuth consent screen is published
- Confirm Android OAuth client package name is `com.sudoprogrammer.plancraftai`
- Confirm Android OAuth client uses the release SHA certificates
- Confirm iOS OAuth client exists for bundle id `com.sudoprogrammer.plancraftai`
- Add reversed client id / URL scheme to iOS `Info.plist`
- Add iOS associated domains if using universal-link return
- Decide whether native builds will use a custom scheme return or universal links

## Fastest path to one reliable auth flow today

1. Ship packaged mobile app with email/password only.
2. Keep Google, Apple, phone OTP, and magic link for browser/PWA until native auth is implemented.
3. Add a native auth plugin and device-level redirect handling as a separate hardening track.

## Next implementation track

1. Pick a native auth strategy.
   - Preferred: native plugin for Google/Apple/phone auth.
   - Alternative: explicitly open browser/PWA for provider auth and return via deep links.

2. Wire deep-link return handling.
   - Add `@capacitor/app` `appUrlOpen` listener.
   - Add matching iOS and Android URL/universal-link config.

3. Re-test in this order.
   - Email/password
   - Session persistence after cold start
   - Google sign-in
   - Phone OTP
   - Settings reauth flows
