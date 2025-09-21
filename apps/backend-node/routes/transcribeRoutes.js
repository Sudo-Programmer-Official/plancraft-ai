import express from "express";
import multer from "multer";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://audit-agent-66451.web.app",
  "https://audit-agent-66451.firebaseapp.com",
];

const router = express.Router();
router.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const allowAny = process.env.ALLOW_DEV_ANY_ORIGIN === "1";
  const isDevVite = /:5173$/.test(origin);
  if (allowAny || allowedOrigins.includes(origin) || isDevVite) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Store file in memory (don’t write to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Prefer env, otherwise try modern transcribe models first
const DEFAULT_TRANSCRIBE_MODELS = [
  "whisper-1",
  "gpt-4o-mini-transcribe",
  "gpt-4o-transcribe",
];

function resolveModelList() {
  const primary = (process.env.OPENAI_TRANSCRIBE_MODEL || "").trim();
  const fallbacks = (process.env.OPENAI_TRANSCRIBE_FALLBACKS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const list = [];
  if (primary) list.push(primary);
  list.push(...fallbacks);
  if (!list.length) list.push(...DEFAULT_TRANSCRIBE_MODELS);
  return list;
}

async function transcribeWithFallback(fileBuffer, filename) {
  const file = await toFile(fileBuffer, filename);
  const models = resolveModelList();
  let lastErr;
  for (const model of models) {
    try {
      const resp = await openai.audio.transcriptions.create({
        file,
        model,
        language: "en",
      });
      return { text: resp.text, model };
    } catch (err) {
      lastErr = err;
      const code = err?.code || err?.error?.code;
      const status = err?.status;
      const msg = err?.error?.message || err?.message || "";
      const isAccess =
        code === "model_not_found" ||
        status === 403 ||
        /does not have access to model/i.test(msg);
      if (isAccess) {
        console.warn(`[transcribe] Model '${model}' unavailable. Trying next…`);
        continue;
      }
      throw err;
    }
  }
  const friendly = new Error(
    `All configured transcription models are unavailable. ` +
      `Set OPENAI_TRANSCRIBE_MODEL/OPENAI_TRANSCRIBE_FALLBACKS or check project access.`
  );
  friendly.cause = lastErr;
  throw friendly;
}

// POST /api/transcribe
// router.post('/transcribe', upload.single('file'), async (req, res) => {
//   try {
//     if (!req.file || !req.file.buffer) {
//       return res.status(400).json({ error: 'No audio file provided. Use field name "file".' })
//     }

//     const filename = req.file.originalname || 'audio.webm'
//     const { text, model } = await transcribeWithFallback(req.file.buffer, filename)
//     res.json({ text, model })
//   } catch (err) {
//     console.error('❌ Transcription failed:', err)
//     res.status(err?.status || 500).json({ error: err?.message || 'Transcription failed' })
//   }
// })
// POST /api/transcribe
router.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ error: 'No audio file provided. Use field name "file".' });
    }

    // 🔹 Normalize extension
    let ext = "wav"; // default
    const mime = req.file.mimetype || "";
    if (mime.includes("mp4") || mime.includes("aac")) ext = "m4a";
    else if (mime.includes("mpeg")) ext = "mp3";
    else if (mime.includes("ogg") || mime.includes("oga")) ext = "ogg";
    else if (mime.includes("webm")) ext = "webm"; // keep as fallback

    const safeName = `speech.${ext}`;

    console.log(`🎤 Received file -> mimetype: ${mime}, saved as: ${safeName}`);

    const { text, model } = await transcribeWithFallback(
      req.file.buffer,
      safeName
    );
    res.json({ text, model });
  } catch (err) {
    console.error("❌ Transcription failed:", err);
    res
      .status(err?.status || 500)
      .json({ error: err?.message || "Transcription failed" });
  }
});

export default router;
