import OpenAI from 'openai'
import { db } from './firebaseAdmin.js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateDailyBlogIdea() {
  const prompt = `You are PlanCraftAI’s content strategist.
Suggest a blog idea around productivity, planning, journaling, or voice-based workflows.
Return strict JSON with keys: title, summary, tags (array).`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }]
  })

  const idea = JSON.parse(res.choices?.[0]?.message?.content || '{}')
  const slug = String(idea?.title || 'post')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const doc = {
    title: String(idea?.title || 'Untitled'),
    summary: String(idea?.summary || ''),
    tags: Array.isArray(idea?.tags) ? idea.tags : [],
    slug,
    content: '',
    created_at: new Date(),
    updated_at: new Date(),
    published: false,
    author: 'PlanCraftAI',
  }

  const ref = await db.collection('blogs').add(doc)
  return { id: ref.id, ...doc }
}

export async function generateBlogContent(title, summary) {
  const prompt = `Write a ~600-word blog post for PlanCraftAI titled "${title}".
Tone: clear, optimistic, actionable productivity.
Sections:
1. Intro
2. Core Insight
3. Practical Takeaway
4. Closing Reflection
Return Markdown only.`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.8,
    messages: [{ role: 'user', content: prompt }]
  })

  return res.choices?.[0]?.message?.content?.trim() || ''
}

export async function generateBlogImage(title) {
  const image = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `Stylized, minimal productivity-themed illustration for blog titled "${title}" — pastel, modern UI feel`,
    size: '1024x1024'
  })
  return image.data?.[0]?.url || ''
}

