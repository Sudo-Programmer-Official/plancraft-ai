import express from "express";
import path from "path";
import { generateVoice, resolveCachedAudio } from "../services/ttsService.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate", requireAuth, async (req, res) => {
  try {
    const { text, voice, model, format } = req.body || {};
    const result = await generateVoice(text, { voice, model, format });
    return res.json({
      url: result.url,
      id: result.id,
      voice: result.voice,
      model: result.model,
      cached: result.cached,
    });
  } catch (err) {
    console.error("[tts] generation failed", err?.message || err);
    const status = Number(err?.status || err?.response?.status || 500);
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    return res.status(safeStatus).json({
      error: err?.message || "Failed to generate speech.",
    });
  }
});

router.get("/audio/:fileName", (req, res) => {
  const resolved = resolveCachedAudio(req.params.fileName);
  if (!resolved) {
    return res.status(404).json({ error: "Audio not found." });
  }

  const ext = path.extname(resolved).toLowerCase();
  if (ext === ".mp3") {
    res.setHeader("Content-Type", "audio/mpeg");
  } else if (ext === ".wav") {
    res.setHeader("Content-Type", "audio/wav");
  } else if (ext === ".ogg") {
    res.setHeader("Content-Type", "audio/ogg");
  }
  res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  return res.sendFile(resolved);
});

export default router;
