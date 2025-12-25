import crypto from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import nodeFetch from "node-fetch";
import { extractJoinLink } from "../../utils/joinLink.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const DEFAULT_CALENDAR_VIEW = `${GRAPH_ROOT}/me/calendarView`;
const CALENDAR_VIEW = (calendarId) =>
  `${GRAPH_ROOT}/me/calendars/${encodeURIComponent(calendarId)}/calendarView`;
const fetchFn = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : nodeFetch;

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: 'outlook.timezone="UTC"',
  };
}

function buildInitialUrl(calendarId, windowDays = 30) {
  const startDateTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const endDateTime = new Date(Date.now() + Number(windowDays) * 24 * 60 * 60 * 1000).toISOString();
  const base = calendarId ? CALENDAR_VIEW(calendarId) : DEFAULT_CALENDAR_VIEW;
  const params = new URLSearchParams({
    startDateTime,
    endDateTime,
    $orderby: "start/dateTime",
    $top: "50",
    $select:
      "id,subject,bodyPreview,body,start,end,location,onlineMeeting,onlineMeetingUrl,webLink,isAllDay,isCancelled,organizer,attendees,seriesMasterId,type,showAs",
  });
  return `${base}?${params.toString()}`;
}

function getEventTimes(event, fallbackTz = null) {
  const start = event?.start || {};
  const end = event?.end || {};
  const timeZone =
    start.timeZone ||
    end.timeZone ||
    event.originalStartTimeZone ||
    event.originalEndTimeZone ||
    fallbackTz ||
    null;
  return {
    start: start.dateTime || start.date || null,
    end: end.dateTime || end.date || null,
    allDay: !!event.isAllDay,
    timeZone,
  };
}

function computeHashPayload(event, times, joinUrl) {
  const payload = [
    event.subject || "",
    event.bodyPreview || event.body?.content || "",
    times.start || "",
    times.end || "",
    times.timeZone || "",
    event.location?.displayName || "",
    joinUrl || "",
    event.isCancelled ? "cancelled" : "confirmed",
    event.showAs || "",
  ].join("||");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export async function fetchOutlookEvents(accessToken, calendar, { syncToken, windowDays = 30 } = {}) {
  // syncToken currently unused; delta support can be added later
  const headers = authHeaders(accessToken);
  let url = buildInitialUrl(calendar?.id, windowDays);
  const events = [];

  while (url) {
    const resp = await fetchFn(url, { headers });
    if (resp.status === 401) throw new Error("Unauthorized with Outlook; reconnect");
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Outlook events fetch failed: ${resp.status} ${text}`);
    }
    const json = await resp.json();
    if (Array.isArray(json?.value)) {
      events.push(...json.value);
    }
    url = json?.["@odata.nextLink"] || null;
  }

  return {
    reset: false,
    events,
    nextSyncToken: null,
  };
}

export function normalizeOutlookEvent(event, calendar) {
  const times = getEventTimes(event, calendar?.timeZone || null);
  const joinLink = extractJoinLink({
    location: event?.location?.displayName,
    description: event?.body?.content || event?.bodyPreview || "",
    summary: event?.subject || "",
  });
  const joinUrl = typeof joinLink === "string" ? joinLink : joinLink?.url;
  const attendees = Array.isArray(event?.attendees)
    ? event.attendees
        .map((a) => ({
          email: a?.emailAddress?.address || null,
          responseStatus: a?.status?.response || a?.status?.responseStatus || null,
        }))
        .filter((a) => !!a.email)
    : [];
  const occurrenceKey = event?.seriesMasterId
    ? `${event.seriesMasterId}__${times.start || event.id}`
    : null;
  const contentHash = computeHashPayload(event, times, joinUrl);

  return {
    externalId: event.id,
    providerEventId: event.id,
    occurrenceKey,
    calendarId: calendar?.id || "primary",
    accountId: calendar?.accountId || "primary",
    title: event.subject || "Meeting",
    description: event.bodyPreview || event.body?.content || "",
    location: event?.location?.displayName || event?.location?.address?.text || "",
    joinUrl: joinUrl || event.onlineMeetingUrl || event?.onlineMeeting?.joinUrl || null,
    eventUrl: event.webLink || null,
    startTime: times.start,
    endTime: times.end,
    timezone: times.timeZone || calendar?.timeZone || null,
    allDay: !!times.allDay,
    attendees,
    status: event.isCancelled ? "cancelled" : "confirmed",
    raw: {
      webLink: event.webLink || null,
      organizer: event?.organizer || null,
      onlineMeeting: event?.onlineMeeting || null,
      seriesMasterId: event?.seriesMasterId || null,
      type: event?.type || null,
    },
    contentHash,
  };
}
