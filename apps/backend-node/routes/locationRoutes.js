import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { geocodeLocation, normalizeBBox as normalizeGeocodeBBox } from "../services/geocodeService.js";
import {
  buildBBoxCacheKey,
  clampLimit,
  getLocationsInBBox,
  normalizeBBox,
} from "../services/locationService.js";
import { requireWorkspaceRole } from "../middleware/workspace.js";

const router = express.Router();

router.use(requireAuth, requireWorkspaceRole(["viewer", "editor", "admin"]));

router.post("/geocode", async (req, res) => {
  try {
    const { query, bbox = null } = req.body || {};
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: "Missing query" });
    }
    const normalizedBBox = normalizeGeocodeBBox(bbox);
    const result = await geocodeLocation(query, {
      bbox: normalizedBBox,
      cachePrecision: 3,
    });
    try {
      console.info("[geocode]", {
        provider: result?.geocode_provider,
        confidence: result?.geocode_confidence,
        cacheHit: result?.cacheHit || false,
      });
    } catch {}
    return res.json({
      ...result,
      raw: undefined, // keep response light
    });
  } catch (err) {
    console.error("[LocationRoutes] geocode failed", err?.message || err);
    return res.status(500).json({ error: "Failed to geocode" });
  }
});

router.get("/locations", async (req, res) => {
  try {
    const { bbox, zoom = null, limit = 100, workspaceId = null } = req.query || {};
    const parsedBBox = normalizeBBox(bbox);
    if (!parsedBBox) {
      return res.status(400).json({ error: "Invalid bbox" });
    }
    const cappedLimit = clampLimit(limit);
    const { items, moreAvailable, cacheKey } = await getLocationsInBBox({
      bbox: parsedBBox,
      zoom: Number.isFinite(Number(zoom)) ? Number(zoom) : null,
      limit: cappedLimit,
      workspaceId: workspaceId || null,
    });
    return res.json({
      items,
      moreAvailable,
      cacheKey: cacheKey || buildBBoxCacheKey(parsedBBox, zoom),
    });
  } catch (err) {
    console.error("[LocationRoutes] bbox fetch failed", err?.message || err);
    return res.status(500).json({ error: "Failed to load locations" });
  }
});

export default router;
