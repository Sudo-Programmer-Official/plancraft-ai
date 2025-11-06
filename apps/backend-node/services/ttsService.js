import fs from "fs";
import path from "path";
import crypto from "crypto";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CACHE_DIR = path.resolve("temp/tts_cache");
const DEFAULT_MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";
const DEFAULT_VOICE = process.env.TTS_VOICE || "alloy";
const DEFAULT_FORMAT = (process.env.TTS_AUDIO_FORMAT || "mp3").toLowerCase();
const MAX_CHAR_COUNT = Number(process.env.TTS_MAX_CHAR_COUNT || 600);
const SUPPORTED_FORMATS = new Set(["mp3", "wav", "ogg"]);
const inFlight = new Map();

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCacheKey(text, { voice, model, format }) {
  const digest = crypto.createHash("sha1");
  digest.update(`${voice}|${model}|${format}|${text}`);
  return digest.digest("hex").slice(0, 32);
}

function sanitizeFormat(format) {
  const safe = String(format || DEFAULT_FORMAT).toLowerCase().replace(/[^a-z0-9]/g, "");
  return SUPPORTED_FORMATS.has(safe) ? safe : DEFAULT_FORMAT;
}

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function writeFileAtomic(targetPath, data) {
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tempPath, data);
  await fs.promises.rename(tempPath, targetPath);
}

export async function generateVoice(message, options = {}) {
  const text = normalizeText(message);
  if (!text) {
    throw new Error("Text is required to generate speech.");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured for TTS generation.");
  }

  const voice = options.voice || DEFAULT_VOICE;
  const model = options.model || DEFAULT_MODEL;
  const format = sanitizeFormat(options.format);
  const effectiveText =
    MAX_CHAR_COUNT > 0 && text.length > MAX_CHAR_COUNT ? text.slice(0, MAX_CHAR_COUNT) : text;

  const cacheKey = buildCacheKey(effectiveText, { voice, model, format });
  const fileName = `${cacheKey}.${format}`;
  const filePath = path.join(CACHE_DIR, fileName);

  if (await fileExists(filePath)) {
    console.log("[tts] cache hit", cacheKey);
    return {
      id: cacheKey,
      fileName,
      url: `/api/tts/audio/${fileName}`,
      voice,
      model,
      cached: true,
    };
  }

  let operation = inFlight.get(fileName);
  if (!operation) {
    operation = (async () => {
      const response = await openai.audio.speech.create({
        model,
        voice,
        input: effectiveText,
        format,
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFileAtomic(filePath, buffer);
    })();
    inFlight.set(fileName, operation);
  }

  try {
    await operation;
    console.log("[tts] cache miss -> generated", { cacheKey, voice, model, format });
  } catch (err) {
    try {
      await fs.promises.unlink(filePath);
    } catch {}
    throw err;
  } finally {
    inFlight.delete(fileName);
  }

  return {
    id: cacheKey,
    fileName,
    url: `/api/tts/audio/${fileName}`,
    voice,
    model,
    cached: false,
  };
}

export function resolveCachedAudio(fileName) {
  if (!fileName || typeof fileName !== "string") {
    return null;
  }
  const safeName = path.basename(fileName);
  if (safeName !== fileName) {
    return null;
  }
  if (!/^[a-f0-9]{8,}\.(mp3|wav|ogg)$/i.test(safeName)) {
    return null;
  }
  const target = path.join(CACHE_DIR, safeName);
  return fs.existsSync(target) ? target : null;
}

export function getCacheInfo() {
  return {
    dir: CACHE_DIR,
    defaultModel: DEFAULT_MODEL,
    defaultVoice: DEFAULT_VOICE,
    defaultFormat: DEFAULT_FORMAT,
  };
}
