import { db } from "../firebaseAdmin.js";
import { DEFAULT_TEMPLATES } from "./defaults.js";

function applyPlaceholders(text, ctx = {}) {
  if (!text) return "";
  return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, key) => {
    const k = String(key || "").trim();
    if (!k) return "";
    const value = ctx[k];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

export function renderTemplate(template, context = {}) {
  const safeTemplate = template || {};
  const subject = applyPlaceholders(safeTemplate.subject || "", context);
  const body = applyPlaceholders(safeTemplate.body || "", context);
  const ctaUrl = applyPlaceholders(
    safeTemplate.cta_url || context.cta_url || context.url || "",
    context
  );
  const decoratedBody = ctaUrl
    ? `${body.trim()}\n\n→ ${ctaUrl}`
    : body.trim();

  return {
    subject: subject || "PlanCraftAI",
    text: decoratedBody,
    html: decoratedBody.replace(/\n/g, "<br/>"),
    cta_url: ctaUrl || null,
    meta: {
      key: safeTemplate.key || null,
      type: safeTemplate.type || "retention",
    },
  };
}

export async function getTemplate(key) {
  if (!key) return null;
  const id = String(key);
  const ref = db.collection("email_templates").doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    return { key: id, ...(snap.data() || {}) };
  }

  // Seed with default if we have one
  const fallback = DEFAULT_TEMPLATES[id] || null;
  if (fallback) {
    const payload = { ...fallback, updatedAt: new Date() };
    await ref.set(payload, { merge: true });
    return payload;
  }
  return null;
}

export async function listTemplates() {
  const snap = await db.collection("email_templates").get();
  const map = {};
  snap.forEach((doc) => {
    map[doc.id] = { key: doc.id, ...(doc.data() || {}) };
  });

  // Merge defaults (without overwriting persisted customizations)
  Object.entries(DEFAULT_TEMPLATES).forEach(([key, value]) => {
    if (!map[key]) map[key] = value;
  });
  return Object.values(map);
}

export async function saveTemplate(key, payload = {}) {
  if (!key) throw new Error("template key required");
  const id = String(key);
  const ref = db.collection("email_templates").doc(id);
  const update = {
    subject: payload.subject,
    body: payload.body,
    cta_url: payload.cta_url || payload.ctaUrl || "",
    type: payload.type || "retention",
    updatedAt: new Date(),
  };
  await ref.set(update, { merge: true });
  const snap = await ref.get();
  return { key: id, ...(snap.data() || update) };
}
