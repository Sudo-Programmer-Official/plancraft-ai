import { fetchGoogleEvents, normalizeGoogleEvent, createGoogleEvent } from "./googleCalendarAdapter.js";
import { fetchOutlookEvents, normalizeOutlookEvent } from "./outlookCalendarAdapter.js";

const adapters = {
  google_calendar: {
    fetchEvents: fetchGoogleEvents,
    normalizeEvent: normalizeGoogleEvent,
    createEvent: createGoogleEvent,
  },
  outlook_calendar: {
    fetchEvents: fetchOutlookEvents,
    normalizeEvent: normalizeOutlookEvent,
  },
};

export function getCalendarAdapter(provider) {
  return adapters[provider] || null;
}

export function registerCalendarAdapter(provider, adapter) {
  if (!provider || typeof adapter !== "object") return;
  adapters[provider] = adapter;
}
