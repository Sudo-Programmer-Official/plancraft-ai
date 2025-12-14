import OpenAI from 'openai'
import dotenv from 'dotenv'
import { logger } from '../utils/logger.js'

dotenv.config({ path: process.env.AI_NLP_ENV_FILE || '.env' })

// Default to a broadly available model; override via OPENAI_EMBED_MODEL if needed
const EMBEDDING_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function embedText(text) {
  if (!text || !text.trim()) return []
  const resp = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })
  const vector = resp?.data?.[0]?.embedding || []
  if (!vector.length) logger.error('[embeddings] empty vector returned')
  return vector
}

export async function embedTexts(texts = []) {
  if (!Array.isArray(texts) || !texts.length) return []
  const inputs = texts.map((t) => (t == null ? '' : String(t))).map((t) => t.slice(0, 8000))
  const resp = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  })
  const vectors = Array.isArray(resp?.data) ? resp.data.map((d) => d?.embedding || []) : []
  if (vectors.length !== inputs.length) {
    logger.error('[embeddings] embeddings length mismatch', { expected: inputs.length, got: vectors.length })
  }
  return vectors
}
