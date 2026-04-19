# PlanCraft AI - Deployment Playbook

This is the repeatable shipping system for PlanCraft AI. Use it before every production release so web, backend, and mobile stay aligned.

## 1. System Overview

- Frontend -> Firebase Hosting
- Backend -> Render
- Mobile -> Capacitor shells for Android and iOS

Golden rule:

Web is the source of truth.

That means:
- Product behavior is built and verified in the shared web app first.
- Mobile shells only ship the latest built web bundle plus native wrappers.
- If the web bundle is stale, mobile is stale.

## 2. Deployment Philosophy

1. Web is the source of truth.
2. Mobile is a wrapper around the shared web product.
3. Always rebuild -> sync -> test.
4. Versioning is discipline, not admin work.
5. Manual first, automate later.

Current reality:
- Frontend deploy is manual and controlled.
- Backend is usually auto-deployed by Render after a repo push, or manually triggered.
- Parts of Android and iOS release delivery already have CI support, but manual verification is still required.

## 3. Master Deployment Order

Use this order when a release touches multiple surfaces:

1. Backend deploy on Render if API behavior changed.
2. Deploy Firestore rules if `apps/audit-agent-frontend/firestore.rules` changed.
3. Frontend build and Firebase deploy.
4. Rebuild the production web bundle.
5. Sync Capacitor.
6. Build and upload Android.
7. Archive and upload iOS.

Rule:

If APIs changed, deploy backend before frontend.

## 4. Web Deployment

Run from `apps/audit-agent-frontend`:

```bash
npm run build
firebase deploy --project audit-agent-66451
```

Or use the existing shortcut:

```bash
npm run deploy
```

What this does:
- Builds the production bundle.
- Generates release metadata and sitemap output.
- Deploys the built app to Firebase Hosting.
- Deploys Firestore rules too, because `apps/audit-agent-frontend/firebase.json` includes a `firestore.rules` target.

If you changed only Firestore rules, run:

```bash
firebase deploy --only firestore --project audit-agent-66451
```

You can run the same rules deploy from the repo root because the root `firebase.json` points at `apps/audit-agent-frontend/firestore.rules`.

Critical rules:
- Always build before deploying.
- Never deploy a stale `dist/`.
- Confirm production env values before the build.
- If backend APIs changed, do not deploy frontend first.
- Local edits to `firestore.rules` do nothing until they are deployed to Firebase.
- If a change depends on backend auth fallback plus Firestore rules, deploy backend before the web release.

Pre-deploy check:
- [ ] `VITE_API_BASE_URL` points to production.
- [ ] No localhost values are baked into production env.
- [ ] Billing and auth URLs point to production hosts.
- [ ] The current change works against the production backend contract.

## 5. Backend Deployment

Current flow:
- Push to the repo and let Render auto-deploy, or trigger a manual deploy in Render.

Recommended Render service settings:

- Root Directory: `apps/backend-node`
- Build Command: `npm install`
- Start Command: `npm start`

Do not point Render at the monorepo root with build command `yarn`.

Why:
- The repo root is a `pnpm` workspace.
- `apps/backend-node` is already a standalone Node app with its own `package-lock.json`.
- Building from the app directory avoids package-manager conflicts and unnecessary workspace installs.

Checklist before backend deploy:
- [ ] Routes working.
- [ ] No breaking API changes without frontend coordination.
- [ ] Env variables correct.
- [ ] Logs clean enough to spot regressions.
- [ ] Stripe, Firebase, and auth config still valid.

Rule:

Deploy backend before frontend when APIs or response shapes changed.

## 6. Mobile Sync Flow

This is the most failure-prone part of the system.

Run from `apps/audit-agent-frontend`:

```bash
npm run build
```

Then run from `mobile`:

```bash
nvm use
npx cap sync android
npx cap sync ios
```

What this does:
- Pushes the latest production web bundle into Android assets.
- Pushes the latest production web bundle into the iOS app bundle.

Critical rules:
- Clean old builds before generating new native releases.
- Never trust a native shell that was not synced after the latest web build.
- If manifest, app-link, or native config changed, sync again even if the web UI did not.

## 7. Android Release Flow

### Standard manual flow

1. Open Android Studio.
2. Clean the project.
3. Rebuild the project.
4. Generate a signed bundle.
5. Choose AAB for Play Store release.
6. Upload the AAB to Play Console.
7. Add release notes.
8. Submit to the right track.

Expected artifact:

`mobile/android/app/build/outputs/bundle/release/app-release.aab`

CLI alternative:

```bash
cd mobile/android
GRADLE_USER_HOME=/tmp/gradle-home ./gradlew bundleRelease
```

Android release rules:
- `versionCode` must increase every upload.
- `versionName` should reflect the release version.
- `version.json` is the shared source of truth for the marketing version.
- If the signing key changes, update `assetlinks.json` before release.

Play Console steps:
- Upload to internal testing, closed testing, or production.
- Add release notes.
- Confirm app content and review metadata are still accurate.
- Submit.

## 8. iOS Release Flow

### Standard manual flow

1. Open Xcode.
2. Confirm the versioning is correct.
3. Clean the build folder.
4. Test on a real device.
5. Archive.
6. Upload to App Store Connect.
7. Attach the build in App Store Connect.
8. Fill metadata and submit for review.

iOS versioning rules:
- `version.json` is the shared source of truth for the marketing version.
- Build number must increase every upload.
- If archive/export fails, clean, rebuild, and retry before making bigger changes.

Existing repo support:
- Fastlane TestFlight pipeline exists under `mobile/fastlane`.
- Manual archive discipline still matters even when CI is available.

## 9. Versioning Strategy

Use this model:
- Marketing version: `1.0.x` style feature-level release number.
- Build number / upload number: increment on every store upload.

Current repo rule:
- `version.json` drives the shared app version.
- Android `versionName` and iOS marketing version should stay aligned with `version.json`.
- Android `versionCode` and iOS build number must keep increasing.

Examples:
- `1.3.0` -> next feature release `1.3.1`
- upload build numbers increase even if the feature version does not

## 10. Common Mistakes

- Forgetting to rebuild before `cap sync`
  Outcome: old UI or logic ships inside the mobile app.

- Forgetting to increase upload/build numbers
  Outcome: store upload rejected.

- Deploying frontend before backend when APIs changed
  Outcome: broken runtime behavior and hard-to-read bug reports.

- Trusting emulator or simulator only
  Outcome: release works in tooling but fails on real hardware.

- Treating mobile as separate product logic
  Outcome: drift, duplication, and slower fixes.

## 11. Release Verification

Before shipping:
- [ ] Backend health checks pass.
- [ ] Frontend production build succeeds.
- [ ] Production site loads against the real API.
- [ ] Native billing return flow opens the app correctly.
- [ ] Auth flow works on real devices.
- [ ] Version numbers are correct.
- [ ] Store metadata, screenshots, and notes are current.

After shipping:
- [ ] Open the live web app and verify key routes.
- [ ] Verify backend logs for errors after deploy.
- [ ] Install the Android build from the target track and test the main flows.
- [ ] Install the iOS/TestFlight build and test the main flows.
- [ ] Confirm premium sync works after web checkout.

## 12. Future Automation

Later, this can be automated more aggressively:

Git push ->
build ->
deploy Firebase ->
trigger Render ->
sync Capacitor ->
run Android/iOS pipelines

But current rule:

Manual control first. Automation after the flow is stable.

## 13. Codex Instruction Template

Use this when delegating release help:

```text
Follow deployment steps strictly:

1. Build frontend with npm run build
2. Deploy frontend with firebase deploy
3. Sync mobile with npx cap sync android and npx cap sync ios
4. Clean Android and iOS builds
5. Generate release builds
6. Increment required version/build numbers
7. Upload to the target stores

Do not skip steps.
Always test before release.
Web is the source of truth.
```

## 14. Related Docs

- `docs/build-launch-handbook.md`
- `docs/mobile-deployment.md`
- `docs/app-store-listing.md`
- `docs/app-store-screenshot-brief.md`
