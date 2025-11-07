import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { extractJoinLink } from "../../utils/joinLink.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const GOOGLE_EVENTS_URL = (calendarId) =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function buildInitialParams(windowDays = 30) {
  const timeMin = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // now - 1h
  const timeMax = new Date(Date.now() + Number(windowDays) * 24 * 60 * 60 * 1000).toISOString();
  return new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    showDeleted: "true",
    orderBy: "startTime",
    maxResults: "2500",
  });
}

function getEventTimes(event) {
  const start = event?.start || {};
  const end = event?.end || {};
  if (start?.date) {
    return {
      start: start.date,
      end: end?.date || start.date,
      allDay: true,
      timeZone: start.timeZone || event?.timeZone || null,
    };
  }
  return {
    start: start.dateTime || start.date || null,
    end: end.dateTime || end.date || start.dateTime || start.date || null,
    allDay: false,
    timeZone: start.timeZone || end.timeZone || event?.timeZone || null,
  };
}

export async function fetchGoogleEvents(accessToken, calendar, { syncToken, windowDays = 30 } = {}) {
  const headers = authHeaders(accessToken);
  const params = syncToken ? new URLSearchParams({ syncToken }) : buildInitialParams(windowDays);
  const resp = await fetch(`${GOOGLE_EVENTS_URL(calendar.id)}?${params.toString()}`, { headers });
  if (resp.status === 401) throw new Error("Unauthorized with Google; reconnect");
  if (resp.status === 410 && syncToken) return { reset: true, events: [], nextSyncToken: null };
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Google events fetch failed: ${resp.status} ${text}`);
  }
  const json = await resp.json();
  const items = Array.isArray(json.items) ? json.items : [];
  return {
    reset: false,
    events: items,
    nextSyncToken: json.nextSyncToken || null,
  };
}

export function normalizeGoogleEvent(event, calendar) {
  const times = getEventTimes(event);
  const joinUrl = extractJoinLink(event);
  const attendees = Array.isArray(event?.attendees)
    ? event.attendees.map((a) => ({ email: a.email, responseStatus: a.responseStatus }))
    : [];

  return {
    externalId: event.id,
    calendarId: calendar.id,
    accountId: "primary",
    title: event.summary || "Meeting",
    description: event.description || "",
    location: event.location || "",
    joinUrl: joinUrl || event.hangoutLink || null,
    startTime: times.start,
    endTime: times.end,
    timezone: times.timeZone || calendar.timeZone || null,
    allDay: !!times.allDay,
    attendees,
    status: event.status || "confirmed",
    raw: {
      htmlLink: event.htmlLink || null,
      organizer: event?.organizer || null,
    },
  };
}
