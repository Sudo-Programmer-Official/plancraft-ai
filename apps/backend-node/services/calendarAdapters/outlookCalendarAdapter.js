import crypto from "crypto";
import nodeFetch from "node-fetch";
import { extractJoinLink, detectJoinProvider } from "../../utils/joinLink.js";

const GRAPH_CALENDAR_VIEW = "https://graph.microsoft.com/v1.0/me/calendarView";
const fetchFn =
  typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : nodeFetch;

function computeHash(event) {
  const payload = [
    event.subject || "",
    event.bodyPreview || "",
    event.body?.content || "",
    event.start?.dateTime || "",
    event.end?.dateTime || "",
    event.location?.displayName || "",
    (event.onlineMeeting?.joinUrl || event.webLink || ""),
    event.lastModifiedDateTime || "",
  ].join("||");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: 'outlook.timezone="UTC"',
  };
}

export async function fetchOutlookEvents(accessToken, calendar, { windowDays = 30 } = {}) {
  const headers = authHeaders(accessToken);
  const start = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const end = new Date(Date.now() + Number(windowDays) * 24 * 60 * 60 * 1000).toISOString();
  let url = `${GRAPH_CALENDAR_VIEW}?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(
    end,
  )}&$orderby=start/dateTime&$top=100`;
  const events = [];
  while (url) {
    const resp = await fetchFn(url, { headers });
    if (resp.status === 401) throw new Error("Unauthorized with Outlook; reconnect");
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Outlook events fetch failed: ${resp.status} ${text}`);
    }
    const json = await resp.json();
    const value = Array.isArray(json.value) ? json.value : [];
    events.push(...value);
    url = json["@odata.nextLink"] || null;
  }
  return {
    reset: false,
    events,
    nextSyncToken: null,
  };
}

function buildAttendees(event) {
  if (!Array.isArray(event.attendees)) return [];
  return event.attendees
    .map((a) => ({
      email: a?.emailAddress?.address || null,
      responseStatus: a?.status?.response || null,
    }))
    .filter((a) => !!a.email);
}

export function normalizeOutlookEvent(event, calendar) {
  const start = event.start?.dateTime || null;
  const end = event.end?.dateTime || null;
  const timezone = event.start?.timeZone || event.end?.timeZone || "UTC";
  const joinLinkFallback = extractJoinLink({
    description: event?.body?.content || event?.bodyPreview || "",
    location: event?.location?.displayName || "",
    summary: event?.subject || "",
  });
  const joinUrl =
    event.onlineMeeting?.joinUrl ||
    event.onlineMeeting?.conferenceId ||
    joinLinkFallback?.url ||
    null;
  const joinProvider =
    event.onlineMeeting?.provider ||
    detectJoinProvider(joinUrl) ||
    joinLinkFallback?.provider ||
    null;
  const occurrenceKey = event.seriesMasterId
    ? `${event.seriesMasterId}__${event.id}`
    : null;

  return {
    externalId: event.id,
    providerEventId: event.id,
    occurrenceKey,
    calendarId: calendar?.id || "default",
    accountId: calendar?.accountId || "default",
    title: event.subject || "Meeting",
    description: event.body?.content || event.bodyPreview || "",
    location: event.location?.displayName || "",
    joinUrl: joinUrl,
    joinProvider,
    eventUrl: event.webLink || null,
    startTime: start,
    endTime: end,
    timezone,
    allDay: !!event.isAllDay,
    attendees: buildAttendees(event),
    status: event.status || (event.isCancelled ? "cancelled" : "confirmed"),
    raw: {
      outlook: true,
      importance: event.importance,
      sensitivity: event.sensitivity,
      onlineMeeting: event.onlineMeeting || null,
      organizer: event.organizer || null,
    },
    contentHash: computeHash(event),
  };
}
