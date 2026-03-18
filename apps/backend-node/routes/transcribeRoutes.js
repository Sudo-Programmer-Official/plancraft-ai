import express from "express";
import multer from "multer";
import OpenAI from "openai";
import { requireAuth } from "../middleware/auth.js";
import { toFile } from "openai/uploads";
import fs from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

const allowedOrigins = [
  "https://plancraftai.com",
  "https://www.plancraftai.com",
  "capacitor://plancraftai.com",
  "capacitor://localhost",
  "ionic://localhost",
  "https://audit-agent-66451.web.app",
  "https://api.plancraftai.com", 
  "https://audit-agent-66451.firebaseapp.com",
  "https://audit-agent.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // ✅ Production domains
  "https://www.plancraftai.com",
  "https://plancraftai.web.app",   // if you still deploy via Firebase Hosting

  // ✅ Local development
  // ✅ Optional API subdomain (if backend runs separately)
  "https://api.plancraftai.com",
]

function isNativeAppOrigin(origin) {
  return typeof origin === 'string' && /^(capacitor|ionic):\/\/[a-z0-9.-]+$/i.test(origin)
}

const allowedHeaders = [
  "Content-Type",
  "Authorization",
  "X-App-Token",
  "X-User-Email",
  "X-User-Id",
  "X-User-Role",
  "X-User-Tz",
  "X-User-Country",
  "X-Workspace-Id",
  "X-Requested-With",
].join(", ")

const router = express.Router();
router.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const allowAny = process.env.ALLOW_DEV_ANY_ORIGIN === "1";
  const isDevVite = /:5173$/.test(origin);
  if (allowAny || allowedOrigins.includes(origin) || isDevVite || isNativeAppOrigin(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }
  res.set("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || allowedHeaders);
  res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

router.use(requireAuth)

// Store file in memory (don’t write to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Prefer env, otherwise try modern transcribe models first
// TODO: allow more models over time
const DEFAULT_TRANSCRIBE_MODELS = [
  "whisper-1",
  "gpt-4o-transcribe"
];

const TRANSCRIBE_MAX_ATTEMPTS = Math.max(
  1,
  Number.parseInt(process.env.OPENAI_TRANSCRIBE_MAX_ATTEMPTS || "3", 10) || 3
);

const TRANSCRIBE_RETRY_DELAY_MS = Math.max(
  200,
  Number.parseInt(process.env.OPENAI_TRANSCRIBE_RETRY_DELAY_MS || "500", 10) || 500
);

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

const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/oga",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/flac",
  "audio/x-wav",
  "audio/x-m4a",
]);

const MIME_TO_EXTENSION = {
  "audio/webm": "webm",
  "audio/mp3": "mp3",
  "audio/mpeg": "mp3",
  "audio/m4a": "m4a",
  "audio/mp4": "mp4",
  "audio/ogg": "ogg",
  "audio/oga": "oga",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/x-m4a": "m4a",
  "audio/aac": "m4a",
  "audio/flac": "flac",
};

const MINIMUM_AUDIO_BYTES = 1024;

async function normalizeAudioUpload(buffer, mimetype) {
  if (!buffer || buffer.length < MINIMUM_AUDIO_BYTES) {
    throw new Error("Uploaded audio file is too small or empty.");
  }

  const cleanedMime = (mimetype || "").split(";")[0].trim().toLowerCase();
  if (cleanedMime && !SUPPORTED_AUDIO_TYPES.has(cleanedMime)) {
    console.warn(`[transcribe] unsupported mimetype "${cleanedMime}", continuing anyway.`);
  }

  const fallbackName = `speech.${guessExtension(cleanedMime)}`;
  if (!ffmpegPath) {
    console.warn(`[transcribe] missing ffmpeg binary, sending original buffer.`);
    return { buffer, filename: fallbackName };
  }

  try {
    const converted = await transcodeToWav(buffer);
    return { buffer: converted, filename: "speech.wav" };
  } catch (err) {
    console.warn(`[transcribe] ffmpeg re-encode failed (${err?.message || err}); sending original buffer.`);
    return { buffer, filename: fallbackName };
  }
}

function guessExtension(mimetype) {
  if (!mimetype) return "webm";
  return MIME_TO_EXTENSION[mimetype] || "webm";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableTranscriptionError(err) {
  const status = err?.status;
  if (status === 408 || status === 409 || status === 429) return true;
  if (typeof status === "number" && status >= 500) return true;
  if (typeof status === "number" && status >= 400 && status < 500) return false;

  const retryableCodes = new Set([
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ECONNABORTED",
    "EPIPE",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_SOCKET",
  ]);

  const codes = [err?.code, err?.error?.code, err?.cause?.code]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());
  if (codes.some((code) => retryableCodes.has(code))) return true;

  const names = [err?.name, err?.type, err?.error?.type]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  if (names.some((value) => value.includes("connection"))) return true;

  const message = [err?.message, err?.error?.message, err?.cause?.message]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /connection error|network error|socket hang up|timed out|timeout|econnreset|fetch failed|temporarily unavailable/.test(
    message
  );
}

async function transcodeToWav(inputBuffer) {
  const tempDir = await fs.mkdtemp(path.join(tmpdir(), "transcribe-"));
  const inputPath = path.join(tempDir, "input");
  const outputPath = path.join(tempDir, "output.wav");

  try {
    await fs.writeFile(inputPath, inputBuffer);
    await runFfmpeg(inputPath, outputPath);
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function runFfmpeg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, [
      "-y",
      "-i",
      inputPath,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-vn",
      "-loglevel",
      "error",
      "-f",
      "wav",
      outputPath,
    ]);

    proc.once("error", reject);
    proc.once("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

async function transcribeWithFallback(fileBuffer, filename) {
  const models = resolveModelList();
  let lastErr;
  for (const model of models) {
    for (let attempt = 1; attempt <= TRANSCRIBE_MAX_ATTEMPTS; attempt += 1) {
      try {
        const file = await toFile(fileBuffer, filename);
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
        const msg = err?.error?.message || err?.message || err?.cause?.message || "";
        const isAccess =
          code === "model_not_found" ||
          status === 403 ||
          /does not have access to model/i.test(msg);

        if (isAccess) {
          console.warn(`[transcribe] Model '${model}' unavailable. Trying next...`);
          break;
        }

        const shouldRetry =
          attempt < TRANSCRIBE_MAX_ATTEMPTS && isRetryableTranscriptionError(err);

        if (shouldRetry) {
          const delay = TRANSCRIBE_RETRY_DELAY_MS * attempt;
          console.warn(
            `[transcribe] Model '${model}' failed on attempt ${attempt}/${TRANSCRIBE_MAX_ATTEMPTS} ` +
              `with a retryable connection error. Retrying in ${delay}ms...`
          );
          await sleep(delay);
          continue;
        }

        throw err;
      }
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

    if (!req.file.buffer || req.file.buffer.length < MINIMUM_AUDIO_BYTES) {
      console.warn("🎤 Skipping transcription: audio too short or empty");
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "audio_too_short",
        transcript: "",
      });
    }

    const mime = req.file.mimetype || "";
    const { buffer: normalizedBuffer, filename } = await normalizeAudioUpload(
      req.file.buffer,
      mime
    );

    console.log(
      `🎤 Received file -> mimetype: ${mime}, normalized to: ${filename}`
    );

    const { text, model } = await transcribeWithFallback(
      normalizedBuffer,
      filename
    );
    res.json({ text, model });
  } catch (err) {
    console.error("❌ Transcription failed:", err);
    // res
    //   .status(err?.status || 500)
    //   .json({ error: err?.message || "Transcription failed" });
    res.status(err?.status || 500).json({
  error: err?.message || "Transcription failed",
  code: err?.code || err?.error?.code,
  type: err?.type,
})
  }
});

export default router;
