import OpenAI from 'openai'
import dotenv from 'dotenv'
import { logger } from '../utils/logger.js'

dotenv.config({ path: process.env.AI_NLP_ENV_FILE || '.env' })

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function runLlmWithImage(systemPrompt, input) {
  const payload = typeof input === 'string' ? { imageDataUrl: input } : input || {}
  const imageUrl = payload.imageUrl || payload.image_url || null
  const imageDataUrl = payload.imageDataUrl || payload.image || null

  if (!imageUrl && !imageDataUrl) {
    throw new Error('Missing image input')
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Extract the key items from this image.' },
        { type: 'image_url', image_url: { url: imageUrl || imageDataUrl } },
      ],
    },
  ]
  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
    messages,
  })
  const text = resp?.choices?.[0]?.message?.content || ''
  logger.info('[vision] response length', text.length)
  return { text }
}
