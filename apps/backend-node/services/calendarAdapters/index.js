import { fetchGoogleEvents, normalizeGoogleEvent } from "./googleCalendarAdapter.js";

const adapters = {
  google_calendar: {
    fetchEvents: fetchGoogleEvents,
    normalizeEvent: normalizeGoogleEvent,
  },
};

export function getCalendarAdapter(provider) {
  return adapters[provider] || null;
}

export function registerCalendarAdapter(provider, adapter) {
  if (!provider || typeof adapter !== "object") return;
  adapters[provider] = adapter;
}
