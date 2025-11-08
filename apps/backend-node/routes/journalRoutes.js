import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { analyzeJournalText } from "../services/journalAIService.js";
import {
  saveJournalEntry,
  storeJournalAudio,
  getJournalInsights,
} from "../services/journalService.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 },
});

function safeTimezone(req) {
  const header = req.headers["x-user-tz"];
  if (typeof header === "string" && header.trim()) return header.trim();
  return "UTC";
}

function parseMeta(body = {}) {
  if (typeof body.meta === "string") {
    try {
      return JSON.parse(body.meta);
    } catch (err) {
      console.warn("[journalRoutes] Failed to parse meta JSON", err?.message || err);
    }
  }
  return body;
}

router.use(requireAuth);

router.post("/analyze", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Text is required" });
    }
    const result = await analyzeJournalText(String(text));
    res.json({ analysis: result });
  } catch (err) {
    console.error("[journalRoutes] analyze failed", err);
    res.status(500).json({ error: "Unable to analyze journal entry" });
  }
});

router.post("/entries", upload.single("audio"), async (req, res) => {
  try {
    const meta = parseMeta(req.body);
    if (!meta.text || !String(meta.text).trim()) {
      return res.status(400).json({ error: "Cleaned text is required" });
    }
    const timezone = safeTimezone(req);
    let audioUrl = meta.audioUrl || null;
    if (!audioUrl && req.file && req.file.buffer) {
      audioUrl = await storeJournalAudio(req.user.uid, req.file);
    }
    const durationCandidate =
      meta.audioDurationMs ?? meta.durationMs ?? req.body?.audioDurationMs;
    let audioDurationMs = null;
    if (typeof durationCandidate === "number" && Number.isFinite(durationCandidate)) {
      audioDurationMs = durationCandidate;
    } else if (typeof durationCandidate === "string") {
      const parsed = Number.parseInt(durationCandidate, 10);
      if (Number.isFinite(parsed)) audioDurationMs = parsed;
    }
    const entry = await saveJournalEntry(
      req.user.uid,
      {
        ...meta,
        audioUrl,
        audioDurationMs,
        source: meta.source || "voice-journal",
      },
      { timezone },
    );
    res.json({ entry });
  } catch (err) {
    console.error("[journalRoutes] save failed", err);
    res.status(500).json({ error: "Unable to save journal entry" });
  }
});

router.get("/insights", async (req, res) => {
  try {
    const timezone = safeTimezone(req);
    const lookbackDays =
      Number.parseInt(req.query.lookbackDays, 10) > 0
        ? Number.parseInt(req.query.lookbackDays, 10)
        : 7;
    const insights = await getJournalInsights(req.user.uid, {
      lookbackDays,
      timezone,
    });
    res.json({ insights });
  } catch (err) {
    console.error("[journalRoutes] insights failed", err);
    res.status(500).json({ error: "Unable to load journal insights" });
  }
});

export default router;
