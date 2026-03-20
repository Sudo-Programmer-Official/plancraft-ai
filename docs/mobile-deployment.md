## Mobile Deployment Guide (Capacitor)

This is a quick, repeatable checklist to ship the web app into native shells. Keep `appId` stable after first upload.

Capacitor 8 requires Node 22+. Run `nvm use` inside [`mobile`](/Users/abhishekkumarjha/Documents/sudo-programmer-official/audit-agent/mobile) before `npx cap ...`.

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
4. Test Google sign-in from the Android app again

CLI bundle (alternative to Android Studio):
```bash
cd android
./gradlew bundleRelease
```

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