Google Calendar Integration (Backend)

Overview
- Tier-1 polling via syncToken, every 5 minutes (cron).
- OAuth2 via server; tokens stored under users.integrations.google.
- Imported events become tasks in Firestore with source=google_calendar and stable IDs.

Enable
1) Set env in apps/backend-node/.env:
   - ENABLE_GOOGLE_CALENDAR=1
   - GOOGLE_CLIENT_ID=...
   - GOOGLE_CLIENT_SECRET=...
   - GOOGLE_REDIRECT_URI=https://api.plancraftai.com/api/google/oauth/callback
   - (optional) GCAL_SYNC_CRON=*/5 * * * *
   - (optional) GOOGLE_CONNECT_REDIRECT_SUCCESS, GOOGLE_CONNECT_REDIRECT_FAILURE
2) Restart backend.

Endpoints
- GET /api/google/connect?userId=UID → redirects to Google consent (or returns {url} if Accept: application/json)
- GET /api/google/oauth/callback → handles code exchange, persists tokens, snapshots calendars.
- GET /api/google/calendars?userId=UID → returns calendar list with selected flags.
- POST /api/google/calendars/select { userId, selected: [ids], windowDays? } → saves selection.
- POST /api/google/sync/now { userId } → manual sync of selected calendars.

Data shape (users.integrations.google)
{
  connected: true,
  scopes: ["calendar.readonly"],
  token: { access_token, refresh_token, expiry_date },
  calendars: [ { id, selected, summary, timeZone, primary } ],
  sync: { windowDays: 30, perCal: { [id]: { syncToken, lastFullSync } }, lastRun, status }
}

Tasks mapping
- Stable task docId: gcal_${userId}_${calendarId}_${eventId}
- Fields added: source, sourceRef, start, end, timezone, join, attendees, status, visibility, remind, allDay, organizer, htmlLink.
- date: YYYY-MM-DD from event start in event/calendar timezone (or server guess).

Notes
- 401/invalid_grant marks status=auth_error; reconnect required.
- 410 Gone during incremental sync triggers full window backfill.

