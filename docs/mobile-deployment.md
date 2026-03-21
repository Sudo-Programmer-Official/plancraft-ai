## Mobile Deployment Guide (Capacitor)

This is a quick, repeatable checklist to ship the web app into native shells. Keep `appId` stable after first upload.

Capacitor 8 requires Node 22+. Run `nvm use` inside [`mobile`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/mobile) before `npx cap ...`.

## Shared version source

Mobile releases now use one repo-level version file:

- [`version.json`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/version.json)

Current format:

```json
{
  "version": "1.3.0"
}
```

What uses it:

1. Android `versionName`
2. iOS marketing version
3. CI-generated release metadata artifacts

Build numbers stay CI-driven:

- Android `versionCode` = `github.run_number`
- iOS build number = `IOS_BUILD_NUMBER`, seeded in CI as `github.run_number + 100`

### Phase 1 — Prep the Android build (codebase)

1) Update Capacitor config (if needed)
```ts
// mobile/capacitor.config.ts
export default {
  appId: 'com.sudoprogrammer.plancraftai',
  appName: 'PlanCraftAI',
  webDir: '../apps/audit-agent-frontend/dist',
  bundledWebRuntime: false,
}
```
⚠️ `appId` must never change after the first Play upload.

2) Build the web app
```bash
cd apps/audit-agent-frontend
npm run build
```
Confirm:
- No console errors
- `apps/audit-agent-frontend/dist` generated correctly

3) Sync Capacitor → Android
```bash
cd ../../mobile
nvm use
npx cap sync android
npx cap open android
```
Then build/sign from Android Studio (standard release flow).

### Android auth return-to-app links

The Android shell now expects a dedicated callback path:

- `https://plancraftai.com/app-auth/complete`

Google sign-in is currently disabled in packaged Android and iOS builds. Use email/password inside the native shells; Google sign-in remains available on the web build.

Required production pieces:

1. Deploy `/.well-known/assetlinks.json`
2. Keep the Android package name as `com.sudoprogrammer.plancraftai`
3. Keep the SHA-256 fingerprint in `assetlinks.json` in sync with the release keystore
4. Re-run `cap sync android` after any manifest or web change

Current release SHA-256 in the repo:

```text
EE:3F:BD:BF:2E:2F:A6:73:20:92:FC:33:88:2C:2B:72:2D:BA:D6:A9:8C:26:25:3C:21:81:94:6D:0B:75:FB:03
```

Quick verification after deploy:

1. Open `https://plancraftai.com/.well-known/assetlinks.json`
2. Confirm the JSON contains the package name and SHA-256 above
3. Reinstall the Android app if app links were previously cached incorrectly
4. Test email/password sign-in from the Android app

CLI bundle (alternative to Android Studio):
```bash
cd android
./gradlew bundleRelease
```

### Android internal-track CI/CD

The repo now includes [`android-release.yml`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/.github/workflows/android-release.yml) for Play Console internal-track delivery on pushes to `main` and manual dispatches.

What it does:

1. Installs frontend and mobile dependencies
2. Builds the web bundle from `apps/audit-agent-frontend`
3. Runs `npx cap sync android`
4. Builds `app-release.aab`
5. Uploads the AAB to the Play internal track

Required GitHub secrets:

```bash
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
GPLAY_SERVICE_ACCOUNT_JSON
```

Local release setup:

1. Copy [`keystore.properties.example`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/mobile/android/keystore.properties.example) to `mobile/android/keystore.properties`
2. Set the keystore path, passwords, and alias
3. Confirm your keystore file is present under `mobile/android/app/`

Local release signing is now read from environment variables or `mobile/android/keystore.properties` instead of hardcoded passwords. Start from [`keystore.properties.example`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/mobile/android/keystore.properties.example):

```bash
ANDROID_KEYSTORE_PATH=plancraftai-release.jks
ANDROID_KEYSTORE_PASSWORD=...
ANDROID_KEY_ALIAS=...
ANDROID_KEY_PASSWORD=...
ANDROID_VERSION_CODE=13
```

Notes:

- CI computes `ANDROID_VERSION_CODE` as `github.run_number + 100` to avoid collisions with earlier manual Play uploads.
- Android `versionName` is sourced from [`version.json`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/version.json).
- The Android workflow generates `mobile/build/android-release.json` and uploads it as a CI artifact.
- If release signing values are missing, Gradle now fails with a clear error instead of silently using hardcoded secrets.
- Debug builds are unchanged; signing is only enforced for release/publish tasks.

## Build & sync flow (what runs where)

1) Web + Capacitor layer (run here):
```
apps/audit-agent-frontend/
├─ dist/
├─ .env.production         # prod API/auth keys
└─ package.json
```
Commands:
- `npm run build`

2) Capacitor shell layer (run here):
```
mobile/
├─ capacitor.config.ts     # appId/appName/webDir
├─ android/
├─ ios/
├─ .nvmrc                  # Node 22 for Capacitor 8
└─ package.json
```
Commands:
- `nvm use`
- `npx cap sync android`
- `npx cap sync ios`
- `npx cap open ios`

3) Native Android layer (run here):
```
mobile/android/
├─ app/
└─ gradlew
```
Commands:
- `./gradlew clean`
- `./gradlew bundleRelease`

Local release test:

```bash
cd mobile
nvm use
npm ci
npm --prefix ../apps/audit-agent-frontend run build
npx cap sync android
cd android
./gradlew bundleRelease
```

Artifact: `android/app/build/outputs/bundle/release/app-release.aab`

Notes:
- Ensure `.env.production` points to the real API (no localhost) before `npm run build`.
- Google/Bing “ping” 404/410 warnings during build are harmless; they don’t affect Android output.
- If you rotate the Android release keystore, update `apps/audit-agent-frontend/public/.well-known/assetlinks.json` before the next release or verified app links will stop returning to the app.

### Phase 2 — Prep the iOS build (commands)

1) Sync iOS project
```bash
cd mobile
nvm use
npx cap sync ios
```

2) Open Xcode
```bash
npx cap open ios
```

3) (Optional CLI archive instead of GUI)
```bash
cd ios
xcodebuild -workspace App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/PlanCraftAI.xcarchive archive
```
Then export/sign via Xcode Organizer or `xcodebuild -exportArchive` with your provisioning profile.

### iOS splash asset workflow

The repo now includes a repeatable splash generator:

- [`generate-ios-splash.sh`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/mobile/scripts/generate-ios-splash.sh)

It creates one branded 2732×2732 splash image from the web logo and updates the iOS asset catalog at:

- [`Splash.imageset`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/mobile/ios/App/App/Assets.xcassets/Splash.imageset)

Run it with:

```bash
cd mobile
npm run ios:splash
```

Notes:

- The generator uses ImageMagick (`magick`).
- The source logo is `apps/audit-agent-frontend/public/logo-bg-remove.png`.
- After regenerating splash assets, rebuild and re-sync iOS before archiving.

### iOS Fastlane + TestFlight CI/CD

The repo now includes a minimal Fastlane pipeline under [`mobile/fastlane`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/mobile/fastlane):

- [`mobile/fastlane/Appfile`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/mobile/fastlane/Appfile)
- [`mobile/fastlane/Fastfile`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/mobile/fastlane/Fastfile)
- [`mobile/Gemfile`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/mobile/Gemfile)

What the `beta` lane does:

1. Builds the web bundle from `apps/audit-agent-frontend` unless `SKIP_FRONTEND_BUILD=1`
2. Runs `npx cap sync ios`
3. Sets the iOS marketing version from [`version.json`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/version.json)
4. Calculates the next iOS build number
5. Archives the real Capacitor iOS target (`App`)
6. Uploads the resulting IPA to TestFlight

Local run:

```bash
cd mobile
nvm use
bundle install
npm ci
npm run ios:testflight
```

Required Fastlane/App Store Connect env vars:

```bash
IOS_APP_IDENTIFIER=com.sudoprogrammer.plancraftai
IOS_DEVELOPER_TEAM_ID=GP9D55NRCM
APP_STORE_CONNECT_API_KEY_ID=YOUR_KEY_ID
APP_STORE_CONNECT_ISSUER_ID=YOUR_ISSUER_ID
APP_STORE_CONNECT_API_KEY_CONTENT="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
TESTFLIGHT_CHANGELOG="Bug fixes and improvements"
```

Notes:

- `APP_STORE_CONNECT_API_KEY_CONTENT` can be stored as raw multiline `.p8` content, an escaped `\n` string, or base64-encoded `.p8` content. Fastlane now normalizes all three into a temporary key file before upload.
- The iOS workflow generates `mobile/build/ios-release.json` and uploads it as a CI artifact.
- Both mobile workflows use [`scripts/generate-release-metadata.mjs`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/scripts/generate-release-metadata.mjs) for consistent release metadata output.

- The lane supports `APP_STORE_CONNECT_API_KEY_PATH` as an alternative to inline key content for local use.
- CI passes the App Store Connect API key through to `xcodebuild` with automatic signing flags so archive/export can request signing assets without an interactive Xcode account on the runner.
- Fastlane now archives the app and delegates IPA export to a direct `xcodebuild -exportArchive` call with automatic signing and App Store Connect authentication, which avoids gym’s provisioning-profile mapping issues during CI packaging.
- CI seeds `IOS_BUILD_NUMBER` as `github.run_number + 100`, and Fastlane still takes the max of the current Xcode build, latest TestFlight build, and requested build number.
- The lane assumes signing is already configured for the `App` target. Local Xcode automatic signing is enough for local runs.
- CI sets `SKIP_FRONTEND_BUILD=1` and builds the frontend bundle in GitHub Actions before Fastlane runs. Local runs can leave that unset.

### GitHub Actions workflow for iOS TestFlight

The repo now includes [`ios-testflight.yml`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/.github/workflows/ios-testflight.yml).

Trigger modes:

- Manual: GitHub Actions → `iOS TestFlight` → `Run workflow`
- Automatic: pushes to `main` that touch `mobile/**`, `apps/audit-agent-frontend/**`, this workflow, or this deployment guide

Required GitHub secrets:

```bash
APP_STORE_CONNECT_API_KEY_ID
APP_STORE_CONNECT_ISSUER_ID
APP_STORE_CONNECT_API_KEY_CONTENT
```

Workflow behavior:

1. Installs frontend and mobile dependencies
2. Builds `apps/audit-agent-frontend`
3. Runs Fastlane for Capacitor sync, archive, and TestFlight upload

Important CI prerequisite:

- GitHub Actions still needs signing to work on the runner. This workflow is configured for Xcode automatic signing and `-allowProvisioningUpdates`, but it still depends on your Apple account/signing setup being available through automatic/cloud-managed signing or imported certs/profiles.

### iOS Apple sign-in (server-driven mobile flow)

The packaged iPhone app can now use a backend-owned Apple OAuth loop behind a feature flag:

1. App launches `GET /api/auth/apple/start`
2. Backend redirects to Apple
3. Apple returns to `POST /api/auth/apple/callback`
4. Backend maps the Apple identity to Firebase and creates a mobile auth handoff
5. Backend redirects to `plancraftai://localhost/app-auth/complete?...`
6. The app consumes the handoff and restores the Firebase session locally

Frontend flag:

```bash
# apps/audit-agent-frontend
VITE_USE_SERVER_APPLE_AUTH_MOBILE=1
```

Backend flags and required placeholders:

```bash
# apps/backend-node
APPLE_SERVER_AUTH_ENABLED=1
APPLE_TEAM_ID=YOUR_APPLE_TEAM_ID
APPLE_CLIENT_ID=YOUR_SERVICES_ID
APPLE_KEY_ID=YOUR_APPLE_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----"
APPLE_PRIVATE_KEY_PATH=/absolute/path/to/AuthKey_XXXXXXXXXX.p8
APPLE_REDIRECT_URI=https://api.plancraftai.com/api/auth/apple/callback

# Needed if the backend must link Apple identities through Firebase Identity Toolkit
FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
```

Apple-side setup:

1. Create a Services ID for Apple Sign In
2. Register the backend callback URL exactly as `APPLE_REDIRECT_URI`
3. Ensure the iOS app bundle keeps the `plancraftai` URL scheme so the backend callback can return to the app
4. Keep `Sign in with Apple` enabled in Firebase Auth and in the Apple developer console

Notes:
- Leave `VITE_USE_SERVER_APPLE_AUTH_MOBILE=0` to keep the existing Firebase redirect hybrid flow on iOS.
- Web Apple auth is unchanged; the server-driven path is only for packaged mobile when the frontend flag is enabled.
- After changing auth code or env, rebuild the web bundle and run `npx cap sync ios`.
- For hosted envs like Render, `APPLE_PRIVATE_KEY` may be pasted with escaped `\n` or surrounding quotes; the backend now normalizes that. For local/dev, `APPLE_PRIVATE_KEY_PATH` can point to the `.p8` file instead.

### Notes
- Ensure environment values (e.g., `VITE_API_BASE_URL`, `VITE_ENABLE_IMAGE_TASKS`) are set before `npm run build`.
- After any web change, rerun `npm run build` in `apps/audit-agent-frontend` and `npx cap sync <platform>` in `mobile` so `dist` is embedded into native shells.

cd apps/audit-agent-frontend
npm run build

cd ../../mobile
nvm use
npx cap sync android
npx cap open android

npx cap sync ios
npx cap open ios
