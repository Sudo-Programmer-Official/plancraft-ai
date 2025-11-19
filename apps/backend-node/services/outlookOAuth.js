import crypto from "crypto";
import nodeFetch from "node-fetch";
import { db } from "./firebaseAdmin.js";
import {
  upsertIntegrationAccount,
  removeIntegrationAccount,
} from "./integrationAccountService.js";
import { deleteExternalEventsForAccount } from "./externalEventsService.js";

const AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const PROFILE_URL = "https://graph.microsoft.com/v1.0/me";
const SCOPES = ["offline_access", "Calendars.Read"];
const fetchFn =
  typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : nodeFetch;

const ENABLED = String(process.env.ENABLE_OUTLOOK_CALENDAR || "").toLowerCase();

function clean(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function env(name, fallback = "") {
  return clean(process.env[name]) || fallback;
}

function getStateSecret() {
  return env("OAUTH_STATE_SECRET") || env("APP_JWT_SECRET") || "dev-state-secret";
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function sign(data, secret) {
  return b64url(crypto.createHmac("sha256", secret).update(data).digest());
}

async function mintState(userId, ttlSeconds = 600) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + Math.max(60, Math.min(ttlSeconds, 3600));
  const payload = `v1.${userId}.${nonce}.${exp}`;
  const secret = getStateSecret();
  const token = `${payload}.${sign(payload, secret)}`;
  await db
    .collection("oauth_state")
    .doc(`o_${nonce}`)
    .set(
      {
        userId: String(userId),
        provider: "outlook",
        nonce,
        iat,
        exp,
        createdAt: new Date(),
      },
      { merge: true },
    )
    .catch(() => {});
  return token;
}

export async function parseOutlookState(state) {
  try {
    const parts = String(state || "").split(".");
    if (parts.length !== 5) return null;
    const [v, userId, nonce, expStr, sig] = parts;
    if (v !== "v1" || !userId || !nonce || !expStr || !sig) return null;
    const payload = `${v}.${userId}.${nonce}.${expStr}`;
    const expected = sign(payload, getStateSecret());
    if (expected !== sig) return null;
    const exp = parseInt(expStr, 10);
    if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) return null;
    const ref = db.collection("oauth_state").doc(`o_${nonce}`);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    if (String(data.userId) !== String(userId)) return null;
    await ref.delete().catch(() => {});
    return { userId };
  } catch {
    return null;
  }
}

function ensureEnabled() {
  if (ENABLED !== "1" && ENABLED !== "true") {
    throw new Error("Outlook integration disabled");
  }
}

export async function buildOutlookConsentUrl(userId) {
  ensureEnabled();
  const client_id = env("OUTLOOK_CLIENT_ID");
  const redirect_uri = env("OUTLOOK_REDIRECT_URI");
  if (!client_id || !redirect_uri) throw new Error("Missing Outlook OAuth env vars");
  const state = await mintState(userId);
  const params = new URLSearchParams({
    client_id,
    response_type: "code",
    redirect_uri,
    response_mode: "query",
    scope: SCOPES.join(" "),
    state,
    prompt: "select_account",
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

async function graphRequest(accessToken, url, options = {}) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const resp = await fetchFn(url, { ...options, headers });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Graph request failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

async function fetchOutlookProfile(accessToken) {
  try {
    const json = await graphRequest(accessToken, PROFILE_URL);
    return json || {};
  } catch (e) {
    console.warn("[OutlookOAuth] fetch profile failed", e?.message || e);
    return {};
  }
}

export async function exchangeOutlookCodeForTokens(code) {
  ensureEnabled();
  const client_id = env("OUTLOOK_CLIENT_ID");
  const client_secret = env("OUTLOOK_CLIENT_SECRET");
  const redirect_uri = env("OUTLOOK_REDIRECT_URI");
  if (!client_id || !client_secret || !redirect_uri) {
    throw new Error("Missing Outlook credentials");
  }
  const body = new URLSearchParams({
    client_id,
    client_secret,
    redirect_uri,
    code,
    grant_type: "authorization_code",
  });
  const resp = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Outlook token exchange failed: ${resp.status} ${text}`);
  }
  const json = await resp.json();
  const expiry_date = json.expires_in ? Date.now() + Number(json.expires_in) * 1000 : null;
  return { ...json, expiry_date };
}

export async function refreshOutlookAccessToken(refresh_token) {
  const client_id = env("OUTLOOK_CLIENT_ID");
  const client_secret = env("OUTLOOK_CLIENT_SECRET");
  if (!client_id || !client_secret || !refresh_token) {
    throw new Error("Missing Outlook refresh token credentials");
  }
  const body = new URLSearchParams({
    client_id,
    client_secret,
    refresh_token,
    grant_type: "refresh_token",
  });
  const resp = await fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Outlook token refresh failed: ${resp.status} ${text}`);
  }
  const json = await resp.json();
  const expiry_date = json.expires_in ? Date.now() + Number(json.expires_in) * 1000 : null;
  return { ...json, expiry_date, refresh_token: json.refresh_token || refresh_token };
}

export async function getUserOutlookIntegration(userId) {
  const snap = await db.collection("users").doc(String(userId)).get();
  const data = snap.exists ? snap.data() : {};
  return data?.integrations?.outlook || null;
}

export async function saveUserOutlookIntegration(userId, integration) {
  return db
    .collection("users")
    .doc(String(userId))
    .set(
      {
        integrations: {
          outlook: integration,
        },
        updatedAt: new Date(),
      },
      { merge: true },
    );
}

export async function saveUserOutlookTokens(userId, tokens) {
  const profile = await fetchOutlookProfile(tokens.access_token);
  const accountEmail = profile?.mail || profile?.userPrincipalName || profile?.userPrincipalName || null;
  const integration = {
    connected: true,
    scopes: Array.from(new Set([...(tokens.scope ? tokens.scope.split(" ") : []), ...SCOPES])),
    token: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
      scope: tokens.scope || SCOPES.join(" "),
    },
    accountEmail,
    profile: {
      id: profile?.id || null,
      displayName: profile?.displayName || null,
      userPrincipalName: profile?.userPrincipalName || null,
    },
    status: "connected",
    lastRun: null,
    updatedAt: new Date(),
  };
  await saveUserOutlookIntegration(userId, integration);
  await upsertIntegrationAccount({
    userId,
    provider: "outlook_calendar",
    accountId: accountEmail || "default",
    accountEmail: accountEmail || null,
    accessToken: tokens.access_token || null,
    refreshToken: tokens.refresh_token || null,
    tokenExpiry: tokens.expiry_date || null,
    metadata: {
      profile: integration.profile,
    },
  });
  return integration;
}

export async function ensureFreshOutlookToken(userId) {
  const integration = await getUserOutlookIntegration(userId);
  if (!integration?.token?.access_token) {
    throw new Error("Outlook account not connected");
  }
  let tokens = integration.token;
  const expiresIn = tokens.expiry_date ? tokens.expiry_date - Date.now() : null;
  if (expiresIn !== null && expiresIn > 2 * 60 * 1000) {
    return { tokens, integration };
  }
  if (!tokens.refresh_token) throw new Error("Missing Outlook refresh token");
  const refreshed = await refreshOutlookAccessToken(tokens.refresh_token);
  const updatedIntegration = {
    ...integration,
    token: {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || tokens.refresh_token,
      expiry_date: refreshed.expiry_date || Date.now() + 3600 * 1000,
      scope: refreshed.scope || tokens.scope,
    },
    updatedAt: new Date(),
  };
  await saveUserOutlookIntegration(userId, updatedIntegration);
  await upsertIntegrationAccount({
    userId,
    provider: "outlook_calendar",
    accountId: integration.accountEmail || "default",
    accountEmail: integration.accountEmail || null,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || tokens.refresh_token,
    tokenExpiry: refreshed.expiry_date || Date.now() + 3600 * 1000,
    metadata: {
      profile: integration.profile || null,
    },
  });
  return { tokens: updatedIntegration.token, integration: updatedIntegration };
}

export async function disconnectOutlookIntegration(userId) {
  const integration = await getUserOutlookIntegration(userId);
  if (!integration) return;
  const updated = {
    ...integration,
    connected: false,
    status: "disconnected",
    token: null,
    lastRun: null,
    updatedAt: new Date(),
  };
  await saveUserOutlookIntegration(userId, updated);
  const accountId = integration.accountEmail || "default";
  await removeIntegrationAccount(userId, "outlook_calendar", accountId);
  await deleteExternalEventsForAccount(userId, "outlook_calendar", accountId);
}
