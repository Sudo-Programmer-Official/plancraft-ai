import OpenAI from 'openai'
import { logger } from '../utils/logger.js'
import dotenv from 'dotenv'

dotenv.config({ path: process.env.AI_NLP_ENV_FILE || '.env' })

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const aspectSize = {
  '1:1': '1024x1024',
  '4:5': '1024x1280',
  '16:9': '1152x648',
}

const platformTone = {
  instagram: 'visually emotive, lifestyle-friendly, social-first aesthetics',
  twitter: 'bold, minimal, high-contrast visuals tuned for feeds',
  linkedin: 'clean, professional, trustworthy visuals for business context',
}

export async function generateImages({ prompt, style = 'photoreal', aspect = '1:1', count = 1, platform = 'instagram', workspaceId = null, userId = null, postId = null }) {
  const size = aspectSize[aspect] || aspectSize['1:1']
  const tone = platformTone[platform] || platformTone.instagram
  const finalPrompt = [
    prompt || 'High-quality social post visual',
    `Style: ${style}`,
    `Tone: ${tone}`,
    'No text or captions inside the image.',
    'Faces off unless explicitly requested.',
  ]
    .filter(Boolean)
    .join('. ')

  const n = Math.min(Math.max(Number(count) || 1, 1), 5)

  const resp = await client.images.generate({
    model: 'gpt-image-1',
    prompt: finalPrompt,
    size,
    n,
    quality: 'high',
    user: workspaceId || userId || undefined,
  })

  const images =
    resp?.data?.map((img) => ({
      url: img.url,
      width: Number(size.split('x')[0]),
      height: Number(size.split('x')[1]),
      provider: 'openai',
      seed: img.revised_prompt || null,
      aspect,
      style,
      platform,
    })) || []

  logger.info('[ai-image] generated', { count: images.length, size, platform, workspaceId, postId })
  return { images, meta: { size, platform, style, count: images.length } }
}
