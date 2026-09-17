# PlanCraft AI mobile reliability test matrix

## Automated checks completed

| Check | Result |
| --- | --- |
| Backend auth-identity unit tests | Pass — 4 tests |
| Frontend production SSG build | Pass |
| Android `assembleDebug` | Pass |
| iOS Simulator Debug build, signing disabled | Pass |

## Authentication matrix

Run each row on Web, iOS physical device, Android physical device, and the matching simulator/emulator where supported.

| Scenario | Expected result |
| --- | --- |
| New Google user | One PlanCraft user; verified Google identity is recorded |
| New email/password user | One PlanCraft user; verified password identity is recorded |
| New phone OTP user | E.164 phone; one PlanCraft user; verified phone identity is recorded |
| Existing account → link Google | Existing Firebase UID and all existing data remain unchanged |
| Existing account → link email/password | Existing Firebase UID and all existing data remain unchanged |
| Existing account → link phone OTP | Existing Firebase UID and all existing data remain unchanged |
| Provider already belongs to another account | No merge and no silent account switch; show conflict guidance |
| Guest → new email/Google/phone account | Link the credential to the anonymous UID so guest tasks remain attached |
| Guest → credential already used | Stop with a conflict; never discard guest data or silently switch |
| Logout → sign in with a linked provider | Same canonical PlanCraft user ID, tasks, journal, reminders, profile, and entitlement |

For every authenticated row, record the Firebase UID, `users/{uid}` document ID, and the `authIdentities` mapping. The values must remain stable across logout/login. Do not record OTP values or raw push tokens in test logs.

## Notification matrix

| Platform | Foreground | Background | Terminated | Local reminder |
| --- | --- | --- | --- | --- |
| iOS | Verify APNs banner/action | Verify APNs delivery | Verify cold-start action routing | Verify one-minute test survives app closure |
| Android | Verify FCM notification | Verify FCM delivery | Verify tap action routing | Verify one-minute test survives app closure |
| Web/PWA | Verify foreground/browser push | Verify service-worker push | Verify browser support behavior | Not treated as reliable when the tab is closed |

Also verify two native devices under one account, token refresh, permission denial/regrant, logout revocation, and the `/notification-debug` status/test controls.

## External verification still required

- Real-device Google, email/password, phone OTP, guest conversion, and cross-provider data checks.
- APNs delivery on a physical iPhone with the production provisioning profile/APNs configuration.
- FCM delivery on a physical Android device with the deployed Firebase project configuration.
- Notification behavior under OS permission changes, background restrictions, and terminated-app launches.
