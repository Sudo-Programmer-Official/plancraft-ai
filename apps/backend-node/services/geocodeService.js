import axios from "axios";
import { db } from "./firebaseAdmin.js";

const MAPBOX_GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const CACHE_COLLECTION = "geocode_cache";
const DEFAULT_CACHE_TTL_MS = Number(process.env.GEOCODE_CACHE_TTL_MS || 1000 * 60 * 60 * 24 * 30); // 30 days
const DISABLE_GOOGLE_FALLBACK = String(process.env.DISABLE_GOOGLE_GEOCODE_FALLBACK || "").toLowerCase() === "true";

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function normalizeBBox(bbox, precision = 3) {
  if (!bbox) return null;
  if (typeof bbox === "object" && !Array.isArray(bbox)) {
    const { minLng, minLat, maxLng, maxLat } = bbox;
    const normalized = [minLng, minLat, maxLng, maxLat].map(safeNumber);
    if (normalized.some((v) => v == null)) return null;
    if (normalized[0] >= normalized[2] || normalized[1] >= normalized[3]) return null;
    return {
      minLng: round(normalized[0], precision),
      minLat: round(normalized[1], precision),
      maxLng: round(normalized[2], precision),
      maxLat: round(normalized[3], precision),
    };
  }
  const arr = Array.isArray(bbox)
    ? bbox
    : String(bbox || "")
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
  if (arr.length !== 4) return null;
  const [minLng, minLat, maxLng, maxLat] = arr.map(safeNumber);
  if (
    minLng == null ||
    minLat == null ||
    maxLng == null ||
    maxLat == null ||
    minLng >= maxLng ||
    minLat >= maxLat
  ) {
    return null;
  }
  return {
    minLng: round(minLng, precision),
    minLat: round(minLat, precision),
    maxLng: round(maxLng, precision),
    maxLat: round(maxLat, precision),
  };
}

export function buildGeocodeCacheKey(query, bbox, precision = 3) {
  const trimmed = String(query || "").trim().toLowerCase();
  const normalizedBBox = normalizeBBox(bbox, precision);
  const bboxToken = normalizedBBox
    ? `${normalizedBBox.minLng},${normalizedBBox.minLat},${normalizedBBox.maxLng},${normalizedBBox.maxLat}`
    : "none";
  // Replace characters that are invalid in Firestore doc IDs
  return `geo:${trimmed.replace(/[\\/#?%:]+/g, "|")}|${bboxToken}`;
}

async function readCache(cacheKey) {
  if (!cacheKey) return null;
  const snap = await db.collection(CACHE_COLLECTION).doc(cacheKey).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const updatedAt =
    data.updatedAt?.toDate?.() ||
    (data.updatedAt instanceof Date ? data.updatedAt : null) ||
    (data.createdAt?.toDate?.() || (data.createdAt instanceof Date ? data.createdAt : null));
  if (updatedAt && Date.now() - updatedAt.getTime() > DEFAULT_CACHE_TTL_MS) {
    return null;
  }
  return data;
}

async function writeCache(cacheKey, payload) {
  if (!cacheKey || !payload) return;
  await db.collection(CACHE_COLLECTION).doc(cacheKey).set(
    {
      ...payload,
      cacheKey,
      createdAt: payload.createdAt || new Date(),
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

function confidenceFromRelevance(relevance) {
  if (!Number.isFinite(relevance)) return "low";
  if (relevance >= 0.85) return "high";
  if (relevance >= 0.6) return "medium";
  return "low";
}

async function geocodeMapbox(query, bbox) {
  const token = process.env.MAPBOX_SECRET_TOKEN || process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing MAPBOX_SECRET_TOKEN");
  }

  const encodedQuery = encodeURIComponent(query);
  const bboxToken = normalizeBBox(bbox, 5);
  const params = new URLSearchParams({
    access_token: token,
    limit: "1",
  });
  if (bboxToken) {
    params.set(
      "bbox",
      `${bboxToken.minLng},${bboxToken.minLat},${bboxToken.maxLng},${bboxToken.maxLat}`,
    );
  }

  const url = `${MAPBOX_GEOCODE_URL}/${encodedQuery}.json?${params.toString()}`;
  const { data } = await axios.get(url);
  const feature = Array.isArray(data?.features) ? data.features[0] : null;
  if (!feature || !Array.isArray(feature.center)) {
    return null;
  }

  const [lng, lat] = feature.center;
  return {
    label: feature.place_name || feature.text || query,
    location: { lat, lng },
    place_id: feature.id || null,
    geocode_provider: "mapbox",
    geocode_confidence: confidenceFromRelevance(feature.relevance),
    raw: feature,
  };
}

async function geocodeGoogle(query, bbox) {
  const token = process.env.GOOGLE_MAPS_API_KEY;
  if (!token) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY");
  }
  const params = new URLSearchParams({
    key: token,
    address: query,
  });
  const normalized = normalizeBBox(bbox, 5);
  if (normalized) {
    params.set(
      "bounds",
      `${normalized.minLat},${normalized.minLng}|${normalized.maxLat},${normalized.maxLng}`,
    );
  }
  const url = `${GOOGLE_GEOCODE_URL}?${params.toString()}`;
  const { data } = await axios.get(url);
  const result = Array.isArray(data?.results) ? data.results[0] : null;
  if (!result || !result.geometry?.location) return null;
  const { lat, lng } = result.geometry.location;
  const confidence =
    Array.isArray(result.types) && result.types.includes("street_address")
      ? "high"
      : "medium";
  return {
    label: result.formatted_address || query,
    location: { lat, lng },
    place_id: result.place_id || null,
    geocode_provider: "google",
    geocode_confidence: confidence,
    raw: result,
  };
}

export async function geocodeLocation(query, options = {}) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) throw new Error("Query is required");
  const { bbox = null, cachePrecision = 3 } = options;
  const cacheKey = buildGeocodeCacheKey(normalizedQuery, bbox, cachePrecision);

  const cached = await readCache(cacheKey);
  if (cached) {
    return { ...cached, cacheHit: true, cacheKey };
  }

  let result = null;
  try {
    result = await geocodeMapbox(normalizedQuery, bbox);
  } catch (err) {
    console.warn("[GeocodeService] Mapbox geocode failed", err?.message || err);
  }

  if (!result && !DISABLE_GOOGLE_FALLBACK) {
    try {
      result = await geocodeGoogle(normalizedQuery, bbox);
    } catch (err) {
      console.warn("[GeocodeService] Google geocode failed", err?.message || err);
    }
  }

  if (!result) {
    throw new Error("No geocode results");
  }

  await writeCache(cacheKey, result);
  return { ...result, cacheHit: false, cacheKey };
}

export async function cacheGeocodeResult(cacheKey, payload) {
  return writeCache(cacheKey, payload);
}
