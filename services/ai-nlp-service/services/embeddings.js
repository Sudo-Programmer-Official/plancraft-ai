import OpenAI from 'openai'
import dotenv from 'dotenv'
import { logger } from '../utils/logger.js'

dotenv.config({ path: process.env.AI_NLP_ENV_FILE || '.env' })

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
