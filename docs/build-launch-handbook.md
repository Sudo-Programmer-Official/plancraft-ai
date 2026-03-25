# PlanCraft AI - Build & Launch Handbook

This document is the reusable founder handbook for building, shipping, and launching PlanCraft AI. Update it after major product, platform, or go-to-market decisions so future work starts from decisions already paid for.

## 1. Vision & Goal

### Why this app exists
- Problem: planning is hard, inconsistent, and too manual.
- Problem: people know what they want to do, but turning intent into execution takes too much effort.
- Solution: AI-driven instant planning that turns messy input into an actionable system.

### Initial goal
- Ship cross-platform across web, iOS, and Android.
- Keep the product web-first so the same core experience ships everywhere.
- Own monetization through Stripe and web checkout instead of native in-app purchase systems.

## 2. System Architecture

- Frontend: Vue 3, web-first shared UI and logic.
- Backend: Firebase plus Node/Express APIs.
- Mobile: Capacitor shells wrapping the shared web app.
- Payments: Stripe, managed on the web.
- Routing: deep links and app links returning users into the app after auth or billing actions.

Key insight:

Build once -> deploy everywhere.

## 3. Key Decisions

### Decision 1: Web-first approach

Why:
- Faster iteration.
- One codebase.
- Shared product behavior across web and mobile.

Outcome:
- Reduced complexity massively.

### Decision 2: Capacitor over native

Why:
- Reuse the web app.
- Avoid duplicate development across iOS and Android.

Tradeoff:
- Some native limitations and extra bridge/debug work.

### Decision 3: Stripe over in-app purchases

Why:
- Avoid platform revenue cuts.
- Keep full control over billing logic and pricing changes.

Risk:
- Store-review and platform-compliance friction.

Current solution:
- Do not support native in-app purchases in the packaged apps.
- Do not frame premium as a native purchase flow.
- Use web redirect only.
- Keep native messaging simple:
  Upgrade to Premium
  Opens secure web checkout

### Decision 4: Single shared UI and logic

Why:
- Maintain speed.
- Avoid fragmentation.
- Keep bug fixes and feature work centralized.

Outcome:
- Mobile behavior stays aligned with the web product instead of drifting into separate implementations.

## 4. Challenges & Debug Stories

This section exists to save future months of repeat debugging.

### Issue 1: Capacitor sync problems

- Cause: build mismatch or stale assets after web changes.
- Fix: clean build, re-sync, rebuild, then retest on device.

Lesson:

Always rebuild the web app before syncing mobile.

### Issue 2: Android manifest and deep linking

Needed support for:
- `/subscription`
- `/billing/upgrade`
- `/app`

Lesson:

Plan deep linking early, not later.

### Issue 3: App Store naming confusion

- Cause: duplicate app naming and listing confusion during store setup.
- Fix: delete the old entry, rename the active one, and keep naming consistent.

Lesson:

Keep naming clean from the start.

### Issue 4: App Store Connect UI bugs

Example:
- "Add for Review" can get stuck even when the product setup is correct.

Fixes that helped:
- Refresh.
- Try mobile.
- Try a different browser.

Lesson:

Sometimes the problem is not the code.

### Issue 5: Screenshot messaging

- Initial screenshots were feature-based.
- The stronger version is outcome-based.

Lesson:

Marketing is not a UI showcase.
Marketing is value communication.

## 5. Development Workflow

1. Build the feature on the web app first.
2. Test locally.
3. Create a production build.
4. Sync Capacitor.
5. Test on real devices.
6. Fix edge cases.
7. Submit to the store.

Golden rule:

Never skip device testing.

## 6. Release Process

### Android

- Build the AAB.
- Upload it to Play Console.
- Add release notes.
- Submit for review.

### iOS

- Upload via Xcode.
- Configure App Store Connect:
  screenshots
  accessibility
  privacy
- Submit for review.

Related docs:
- `docs/deployment-playbook.md`
- `docs/mobile-deployment.md`
- `docs/app-store-listing.md`
- `docs/app-store-screenshot-brief.md`

## 7. App Store Compliance Learnings

Current release rules for this product:
- Do not show external pricing inside the packaged app flows.
- Do not create misleading billing flows.
- Provide reviewer login details when needed.
- Make sure the app works cleanly during review.
- Keep premium on mobile documented as web-managed, not a native purchase.

## 8. Growth Preparation

Before launch:
- Screenshots optimized.
- Subtitle optimized.
- Onboarding smooth.
- Upgrade flow tested.

## 9. Key Principles Learned

1. Ship over perfect.
2. Debugging is part of building.
3. Distribution matters as much as product.
4. Simplicity wins when the product stays web-first.
5. Control monetization early.
6. Expect platform friction from Apple and Google.

## 10. Future Improvements

- Better onboarding UX.
- Higher AI response quality.
- Stronger notifications system.
- Better retention loops.
- Better analytics tracking.

Related roadmap:
- `docs/product-roadmap-2026-2027.md`

## 11. Reusable Checklist

- [ ] Define the problem clearly.
- [ ] Choose web-first or native deliberately.
- [ ] Set the payments strategy early.
- [ ] Plan deep linking before release work starts.
- [ ] Build the MVP.
- [ ] Test on real devices.
- [ ] Prepare store assets.
- [ ] Submit.
- [ ] Launch and iterate.

## 12. If I Rebuild This From Scratch

- I would define the deployment, deep-link, and billing return contracts earlier.
- I would keep signing, release, and keystore handling cleaner from day one.
- I would make screenshot and listing work part of product development instead of post-build cleanup.
- I would automate more of the web-build, sync, and release pipeline earlier.
- I would document platform-review edge cases immediately instead of after the fact.

This section should keep growing. It is the startup playbook that makes the next build faster than the last one.
