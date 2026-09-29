// Server-side product analytics (Mixpanel HTTP ingestion).
//
// Used for funnel events the client can't observe reliably: reminders created
// by the backend, reminder delivery, and subscription activation. Events are
// fire-and-forget and never block or fail the calling request.
//
// Privacy: never pass task text, reminder text, transcripts, emails or phone
// numbers. sanitizeAnalyticsProps() drops known content keys and long strings
// as a safety net, but callers should only send ids, enums, counts and flags.
import crypto from "node:crypto";

const MIXPANEL_HOST = (process.env.MIXPANEL_API_HOST || "https://api.mixpanel.com").replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 4000;

const BLOCKED_KEYS = new Set([
  "title", "text", "task", "tasktitle", "details", "notes", "description", "content",
  "message", "body", "transcript", "query", "prompt", "email", "phone", "phonenumber",
  "name", "displayname", "address", "location",
]);
const MAX_STRING_LENGTH = 100;

export function sanitizeAnalyticsProps(props = {}) {
  const out = {};
  for (const [key, value] of Object.entries(props || {})) {
    if (BLOCKED_KEYS.has(key.toLowerCase().replace(/[_\-\s]/g, ""))) continue;
    if (value === undefined || typeof value === "function") continue;
    if (typeof value === "string" && value.length > MAX_STRING_LENGTH) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) continue;
    out[key] = value;
  }
  return out;
}

function getToken() {
  return String(process.env.MIXPANEL_TOKEN || "").trim();
}

export function analyticsEnabled() {
  return !!getToken();
}

export async function trackServerEvent(distinctId, event, props = {}) {
  const token = getToken();
  const id = String(distinctId || "").trim();
  if (!token || !id || !event) return false;

  const payload = [
    {
      event,
      properties: {
        ...sanitizeAnalyticsProps(props),
        token,
        distinct_id: id,
        time: Date.now(),
        $insert_id: crypto.randomUUID().replace(/-/g, ""),
        event_source: "server",
      },
    },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // ip=0: don't geolocate events to the server's own IP.
    const res = await fetch(`${MIXPANEL_HOST}/track?ip=0`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/plain" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn("[Analytics] track failed", { event, status: res.status });
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Analytics] track error", { event, message: err?.message || String(err) });
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Fire-and-forget wrapper for use inside request handlers and jobs.
export function trackServerEventAsync(distinctId, event, props = {}) {
  trackServerEvent(distinctId, event, props).catch(() => {});
}
