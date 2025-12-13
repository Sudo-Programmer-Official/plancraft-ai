import admin from "firebase-admin";
import { db } from "./firebaseAdmin.js";
import { normalizeBBox as normalizeGeocodeBBox } from "./geocodeService.js";

const LOCATION_COLLECTION = "locations";
const MAX_LIMIT = 500;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value, precision = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const factor = 10 ** precision;
  return Math.round(n * factor) / factor;
}

export function clampLimit(limit = 100) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return 100;
  return Math.min(Math.round(n), MAX_LIMIT);
}

export function normalizeBBox(input, precision = 6) {
  return normalizeGeocodeBBox(input, precision);
}

export function buildBBoxCacheKey(bbox, zoom, precision = 3) {
  const normalized = normalizeBBox(bbox, precision);
  if (!normalized) return null;
  return `bbox:${normalized.minLng},${normalized.minLat},${normalized.maxLng},${normalized.maxLat}:zoom:${zoom ?? "na"}`;
}

export function normalizeLocationDoc(doc) {
  const data = (doc && doc.data && doc.data()) || {};
  const lat =
    toNumber(data.location_lat) ??
    toNumber(data.location?.lat) ??
    toNumber(data.lat) ??
    null;
  const lng =
    toNumber(data.location_lng) ??
    toNumber(data.location?.lng) ??
    toNumber(data.lng) ??
    null;

  const location =
    lat != null && lng != null
      ? { lat, lng }
      : null;

  return {
    id: doc?.id || data.id || null,
    type: data.type || data.kind || "event",
    label: data.label || data.title || null,
    semantic_query: data.semantic_query || data.semanticQuery || null,
    precision: data.precision || (data.radius_m ? "radius" : "point"),
    radius_m: data.radius_m ?? data.radius ?? null,
    location,
    place_id: data.place_id || null,
    geocode_provider: data.geocode_provider || null,
    geocode_confidence: data.geocode_confidence || null,
    privacy_mode: data.privacy_mode || data.privacyMode || "point",
    starts_at: data.starts_at || data.startsAt || null,
    ends_at: data.ends_at || data.endsAt || null,
    heat_score: data.heat_score ?? data.heatScore ?? null,
    source: data.source || null,
    workspace_id: data.workspaceId || data.workspace_id || null,
    created_at: data.created_at || data.createdAt || null,
    updated_at: data.updated_at || data.updatedAt || null,
  };
}

export function sanitizeLocationForClient(item) {
  if (!item) return item;
  const out = { ...item };
  const privacy = String(out.privacy_mode || "point").toLowerCase();
  if (out.location && privacy !== "point") {
    out.location = {
      lat: round(out.location.lat, 3),
      lng: round(out.location.lng, 3),
    };
  }
  return out;
}

export async function getLocationsInBBox({ bbox, zoom, limit = 100, workspaceId = null }) {
  const normalized = normalizeBBox(bbox, 6);
  if (!normalized) {
    throw new Error("Invalid bbox");
  }
  const max = clampLimit(limit);
  const fetchLimit = Math.min(max + 50, MAX_LIMIT + 50); // fetch a few extra to offset lng filtering
  let ref = db
    .collection(LOCATION_COLLECTION)
    .where("location_lat", ">=", normalized.minLat)
    .where("location_lat", "<=", normalized.maxLat)
    .orderBy("location_lat");
  if (workspaceId) {
    ref = ref.where("workspaceId", "==", workspaceId);
  }
  const snap = await ref.limit(fetchLimit).get();

  const items = [];
  snap.forEach((doc) => {
    const normalizedDoc = normalizeLocationDoc(doc);
    if (
      normalizedDoc.location &&
      normalizedDoc.location.lng >= normalized.minLng &&
      normalizedDoc.location.lng <= normalized.maxLng
    ) {
      items.push(normalizedDoc);
    }
  });

  const trimmed = items.slice(0, max);
  const moreAvailable = items.length > max || snap.size === fetchLimit;

  return {
    items: trimmed.map(sanitizeLocationForClient),
    moreAvailable,
    cacheKey: buildBBoxCacheKey(normalized, zoom),
  };
}

export async function dualWriteLocation(docRef, payload = {}) {
  if (!docRef) throw new Error("docRef is required");
  const lat = toNumber(payload.location?.lat ?? payload.location_lat);
  const lng = toNumber(payload.location?.lng ?? payload.location_lng);
  const now = new Date();

  const updates = {
    ...payload,
    updated_at: payload.updated_at || now,
  };
  if (lat != null && lng != null) {
    updates.location = { lat, lng };
    updates.location_lat = lat;
    updates.location_lng = lng;
  }
  await docRef.set(updates, { merge: true });
  return updates;
}

export async function backfillLocations(batchSize = 400) {
  let lastDoc = null;
  let processed = 0;
  let updated = 0;

  while (true) {
    let ref = db.collection(LOCATION_COLLECTION).orderBy(admin.firestore.FieldPath.documentId()).limit(batchSize);
    if (lastDoc) {
      ref = ref.startAfter(lastDoc);
    }
    const snap = await ref.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.forEach((doc) => {
      processed += 1;
      const data = doc.data() || {};
      const lat =
        toNumber(data.location_lat) ??
        toNumber(data.location?.lat) ??
        toNumber(data.lat);
      const lng =
        toNumber(data.location_lng) ??
        toNumber(data.location?.lng) ??
        toNumber(data.lng);

      const updates = {};
      if (lat != null && data.location_lat == null) updates.location_lat = lat;
      if (lng != null && data.location_lng == null) updates.location_lng = lng;
      if (lat != null && lng != null && !data.location) updates.location = { lat, lng };
      if (!data.privacy_mode && data.privacyMode) updates.privacy_mode = data.privacyMode;
      if (!data.privacy_mode && !data.privacyMode) updates.privacy_mode = "point";
      if (!data.created_at && data.createdAt) updates.created_at = data.createdAt;
      if (!data.updated_at && data.updatedAt) updates.updated_at = data.updatedAt;
      if (!updates.created_at) updates.created_at = data.created_at || data.createdAt || new Date();
      updates.updated_at = new Date();

      if (Object.keys(updates).length) {
        batch.set(doc.ref, updates, { merge: true });
        updated += 1;
      }
    });

    if (updated) {
      await batch.commit();
    }
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < batchSize) break;
  }

  return { processed, updated };
}
