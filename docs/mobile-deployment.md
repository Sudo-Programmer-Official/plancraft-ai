## Mobile Deployment Guide (Capacitor)

This is a quick, repeatable checklist to ship the web app into native shells. Keep `appId` stable after first upload.

### Phase 1 — Prep the Android build (codebase)

1) Update Capacitor config (if needed)
```ts
// capacitor.config.ts
export default {
  appId: 'com.plancraftai.app',
  appName: 'PlanCraftAI',
  webDir: 'dist',
  bundledWebRuntime: false,
}
```
⚠️ `appId` must never change after the first Play upload.

2) Build the web app
```bash
npm run build
```
Confirm:
- No console errors
- `/dist` generated correctly

3) Sync Capacitor → Android
```bash
npx cap sync android
npx cap open android
```
Then build/sign from Android Studio (standard release flow).

CLI bundle (alternative to Android Studio):
```bash
cd android
./gradlew bundleRelease
```

## Build & sync flow (what runs where)

1) Web + Capacitor layer (run here):
```
audit-agent-frontend/
├─ dist/
├─ capacitor.config.*      # appId/appName/webDir
├─ .env.production         # prod API/auth keys
└─ package.json
```
Commands:
- `npm run build`
- `npx cap sync android`
- `npx cap open android`

2) Native Android layer (run here):
```
audit-agent-frontend/android/
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

### Phase 2 — Prep the iOS build (commands)

1) Sync iOS project
```bash
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
- After any web change, rerun `npm run build` and `npx cap sync <platform>` so `dist` is embedded into native shells.
