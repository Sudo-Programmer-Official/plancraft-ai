Mixpanel Analytics Integration

Overview
- Adds a small `analytics` service that wraps `mixpanel-browser` and provides simple helpers you can call anywhere.
- File: `apps/audit-agent-frontend/src/services/analytics.js`

Install
- Frontend dependency:
  - Run: `npm i -w apps/audit-agent-frontend mixpanel-browser`
  - Or, in the frontend folder: `cd apps/audit-agent-frontend && npm i mixpanel-browser`

Env
- Add your token to `apps/audit-agent-frontend/.env`:
  - `VITE_MIXPANEL_TOKEN=YOUR_PROJECT_TOKEN`

Initialize (main.js)
- apps/audit-agent-frontend/src/main.js
  - Add near other imports and after creating the router (if needed):

    import { initAnalytics, bindRouter } from './services/analytics'
    initAnalytics()
    bindRouter(router)

Page Views (router)
- If you prefer to keep routing concerns in the router file, you can do this instead:
- apps/audit-agent-frontend/src/router/index.js

    import { initAnalytics, bindRouter } from '@/services/analytics'
    initAnalytics()
    bindRouter(router)

Identify Users (authStore)
- apps/audit-agent-frontend/src/stores/authStore.js
- After your auth state changes (e.g., on Firebase `onAuthStateChanged` or store `setUser`):

    import { identifyUser } from '@/services/analytics'
    // Inside the auth change handler
    identifyUser(this.user) // pass null/undefined to track guest

Track Key Events
- Anywhere you need to track custom events:

    import { trackEvent } from '@/services/analytics'
    trackEvent('Task Created', { source: 'journal', guest: !!user?.isAnonymous })

- Suggested placements:
  - Task creation: `apps/audit-agent-frontend/src/composables/useTasks.js`
  - Voice transcription start/complete: `apps/audit-agent-frontend/src/components/VoiceRecorder.vue` or `src/utils/backendRecorder.js`
  - Logout: wherever logout is handled (e.g., in `authStore.js`), call `trackEvent('Logout')`

Event Naming (suggested)
- Authentication: `Login`, `Logout`, props: `{ method: 'Google' | 'Guest' }`
- Navigation: `Page View`, props: `{ path }` (handled by `bindRouter`)
- Productivity: `Task Created`, `Task Completed`, `Voice Transcribed`, `Reflection Added`
- Engagement: `Daily Streak Started`, `Guest Banner Dismissed`, `Plan My Day Used`

Five core funnel events (activation)
- **App Opened** – Fired once per session after auth init and identify (so Mixpanel never sees "User – undefined"). Props: `platform`, `version`.
- **Signup Completed** – Fired when user completes signup (redirect Google/Apple, email, native handoff, guest, magic link). Props: `method` (`google` | `apple` | `email` | `email_link` | `native` | `guest`).
- **Task Created** – Props: `source`, `task_type` (category), `guest`.
- **Task Completed** – Props: `taskId`, `completion_time` (`morning` | `afternoon` | `evening`).
- **Session Ended** – Fired on `beforeunload`. Props: `session_length` (seconds).

Recommended Mixpanel funnel: **App Opened → Signup Completed → Task Created → Task Completed**.

Identify-before-track (fix for "User – undefined")
- Analytics init runs at app load; **identify** and **App Opened** run in `bootstrapApp()` after `authStore.init()`, then **bindRouter**. So the first events (App Opened, then Page View) are always sent after the user is identified (or as Guest).
- `identifyUser(user)` sets `$name` and `$email` only when present (no `undefined` in Mixpanel profile).

Helpers
- `trackAppOpened(platform)`, `trackSignupCompleted({ method })`, `trackSessionEnded()`, `trackAISuggestionAccepted({ suggestion_type })` – use from analytics service where appropriate.

Notes
- The service is defensive and will no-op if not initialized; still call `initAnalytics()` at app start.
- Debug is enabled in dev via `import.meta.env.DEV`.
- If you already have `@` alias to `/src`, prefer `@/services/analytics` in imports; otherwise use relative imports.

