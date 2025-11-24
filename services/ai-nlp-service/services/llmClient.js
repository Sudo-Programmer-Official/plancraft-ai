import OpenAI from 'openai'
import { logger } from '../utils/logger.js'
import dotenv from 'dotenv'
dotenv.config({ path: process.env.AI_NLP_ENV_FILE || '.env' })

console.log('Using OpenAI API Key:', process.env.OPENAI_API_KEY)

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function runLlm(systemPrompt, userInput) {
  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ],
    temperature: 0.7,
  })
  const text = resp?.choices?.[0]?.message?.content || ''
  logger.info('LLM response length', text.length)
  return text
}
