import express from 'express'
import OpenAI from 'openai'
import { requireAuth } from '../middleware/auth.js'
import { searchWorkspaceKnowledge } from '../services/knowledge/knowledgeService.js'
import { chatWithFallback } from '../services/openaiService.js'
import { uploadBufferToStorage } from '../services/firebaseAdmin.js'

const router = express.Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3'

function cleanText(value, fallback = '') {
  const text = String(value ?? fallback ?? '').trim()
  return text
}

function normalizeCount(value, fallback = 5, min = 1, max = 10) {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(Math.max(Math.trunc(num), min), max)
}

function getInputText(body = {}) {
  return cleanText(body.input || body.prompt || body.text || body.query || body.question || '')
}

function getImageUrl(body = {}) {
  return cleanText(body.imageUrl || body.image_url || body.url || '')
}

function imageSizeForAspect(aspect = '1:1') {
  const normalized = String(aspect || '').trim()
  if (normalized === '16:9') return '1792x1024'
  if (normalized === '9:16') return '1024x1792'
  return '1024x1024'
}

function parseJsonSafely(text, fallback = null) {
  const raw = cleanText(text)
  if (!raw) return fallback
  try {
    const first = raw.indexOf('{')
    const last = raw.lastIndexOf('}')
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(raw.slice(first, last + 1))
    }
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function transcribeImage(imageUrl, prompt) {
  const content = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
  ]
  const text = await chatWithFallback({
    messages: [{ role: 'user', content }],
    temperature: 0.2,
    modelList: ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4o'],
    timeoutMs: 90000,
  })
  return cleanText(text)
}

async function generateOutreachMessage(body = {}) {
  const input = getInputText(body)
  const prompt = input || 'Write a concise, friendly outreach message.'
  const text = await chatWithFallback({
    messages: [
      {
        role: 'system',
        content: 'You write concise, natural outreach copy. Keep it warm, direct, and specific. Return only the message body.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  })
  return { output: cleanText(text), text: cleanText(text), message: cleanText(text) }
}

async function generateWish(body = {}) {
  const input = getInputText(body)
  const prompt = input || 'Write a short, warm wish message.'
  const text = await chatWithFallback({
    messages: [
      {
        role: 'system',
        content: 'You write short personal wishes. Return only the final message.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  })
  return { output: cleanText(text), text: cleanText(text), message: cleanText(text) }
}

async function extractEventDetails(body = {}) {
  const input = getInputText(body)
  const text = await chatWithFallback({
    messages: [
      {
        role: 'system',
        content:
          'Extract event details from the input. Return only valid JSON with title, description, date, time, locationText, notes, and confidence.',
      },
      { role: 'user', content: input || 'Extract event details.' },
    ],
    temperature: 0.2,
  })
  const parsed = parseJsonSafely(text, {})
  return {
    title: cleanText(parsed?.title || input || 'Untitled event'),
    description: cleanText(parsed?.description || parsed?.notes || ''),
    date: cleanText(parsed?.date || ''),
    time: cleanText(parsed?.time || parsed?.startTime || ''),
    locationText: cleanText(parsed?.locationText || parsed?.location || ''),
    notes: cleanText(parsed?.notes || ''),
    confidence: parsed?.confidence || 'medium',
    rawText: cleanText(text),
  }
}

async function summarizeWorkspace(body = {}) {
  const workspaceId = cleanText(body.workspaceId || '')
  const question = cleanText(body.question || body.input || body.prompt || '')
  const query = question || 'Summarize the current workspace.'
  const search = workspaceId
    ? await searchWorkspaceKnowledge({ workspaceId, query, topK: 6 }).catch(() => ({ items: [], source: 'fallback' }))
    : { items: [], source: 'fallback' }

  const contextText = Array.isArray(search?.items)
    ? search.items
        .map((item, index) => `${index + 1}. ${cleanText(item.text || '')}`)
        .filter(Boolean)
        .join('\n')
    : ''

  const answer = await chatWithFallback({
    messages: [
      {
        role: 'system',
        content:
          'Summarize the workspace context in a concise, helpful way. Use only the provided context. Return plain text.',
      },
      {
        role: 'user',
        content: [
          question ? `Question: ${question}` : 'Question: Summarize the workspace.',
          contextText ? `Context:\n${contextText}` : 'Context: none found.',
        ].join('\n\n'),
      },
    ],
    temperature: 0.3,
  })

  return {
    answer: cleanText(answer),
    contextUsed: {
      workspaceId: workspaceId || null,
      countsPerSection: {
        items: Array.isArray(search?.items) ? search.items.length : 0,
      },
    },
    source: search?.source || 'fallback',
    items: search?.items || [],
  }
}

async function workspaceInspiration(body = {}) {
  const count = normalizeCount(body.count, 5, 1, 10)
  const workspaceId = cleanText(body.workspaceId || '')
  const seed = cleanText(body.seed || body.input || body.prompt || '')
  const query = seed || 'Generate workspace inspiration ideas.'
  const search = workspaceId
    ? await searchWorkspaceKnowledge({ workspaceId, query, topK: 4 }).catch(() => ({ items: [] }))
    : { items: [] }

  const sourceText = Array.isArray(search?.items)
    ? search.items.map((item) => cleanText(item.text || '')).filter(Boolean).join('\n')
    : ''

  const text = await chatWithFallback({
    messages: [
      {
        role: 'system',
        content:
          'Generate short workspace inspiration ideas as valid JSON. Return only {"ideas":[...]} with concise titles and summaries.',
      },
      {
        role: 'user',
        content: [
          `Count: ${count}`,
          seed ? `Seed: ${seed}` : '',
          sourceText ? `Workspace context:\n${sourceText}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ],
    temperature: 0.6,
  })

  const parsed = parseJsonSafely(text, null)
  const ideas = Array.isArray(parsed?.ideas)
    ? parsed.ideas.slice(0, count).map((idea) => ({
        title: cleanText(idea?.title || 'Idea'),
        summary: cleanText(idea?.summary || idea?.description || idea?.tip || ''),
        suggestion: cleanText(idea?.suggestion || idea?.summary || ''),
        platforms: Array.isArray(idea?.platforms) ? idea.platforms : [],
      }))
    : []

  return {
    ideas,
    items: ideas,
    source: search?.source || 'fallback',
  }
}

async function searchWorkspaceMemory(body = {}) {
  const workspaceId = cleanText(body.workspaceId || '')
  const query = getInputText(body)
  const topK = normalizeCount(body.topK, 6, 1, 20)
  if (!workspaceId || !query) {
    return { matches: [] }
  }
  const result = await searchWorkspaceKnowledge({ workspaceId, query, topK }).catch(() => ({ items: [] }))
  const matches = Array.isArray(result?.items)
    ? result.items.map((item, index) => ({
        id: item?.chunkId || `${workspaceId}-${index}`,
        type: 'knowledge',
        score: Number(item?.score || 0),
        metadata: {
          docId: item?.docId || null,
          chunkId: item?.chunkId || null,
        },
        text: cleanText(item?.text || ''),
      }))
    : []
  return { matches, items: matches, source: result?.source || 'fallback' }
}

async function orchestrateKnowledge(body = {}) {
  const workspaceId = cleanText(body.workspaceId || '')
  const prompt = getInputText(body.input || body)
  const query = prompt || 'Turn this into actionable tasks.'
  const search = workspaceId
    ? await searchWorkspaceKnowledge({ workspaceId, query, topK: 6 }).catch(() => ({ items: [] }))
    : { items: [] }

  const contextText = Array.isArray(search?.items)
    ? search.items.map((item) => cleanText(item.text || '')).filter(Boolean).join('\n')
    : ''

  const text = await chatWithFallback({
    messages: [
      {
        role: 'system',
        content:
          'Return valid JSON with tasks and actions. Each action should be a create_task action with payload.title and payload.description. Keep it concise.',
      },
      {
        role: 'user',
        content: [
          `Workspace ID: ${workspaceId || 'none'}`,
          `Prompt: ${prompt || 'Create tasks from the provided context.'}`,
          contextText ? `Context:\n${contextText}` : 'Context: none.',
        ].join('\n\n'),
      },
    ],
    temperature: 0.3,
  })

  const parsed = parseJsonSafely(text, {})
  const tasks = Array.isArray(parsed?.tasks)
    ? parsed.tasks.map((task, index) => ({
        id: task?.id || `task-${index}`,
        title: cleanText(task?.title || 'New Task'),
        description: cleanText(task?.description || task?.notes || ''),
        date: task?.date || task?.dueDate || null,
      }))
    : []

  const actions = tasks.map((task) => ({
    type: 'create_task',
    payload: {
      id: task.id,
      title: task.title,
      description: task.description,
      date: task.date,
    },
  }))

  return {
    response: {
      tasks,
      actions,
      decision: { actions },
      summary: cleanText(parsed?.summary || ''),
    },
    source: search?.source || 'fallback',
  }
}

function clusterContacts(body = {}) {
  const contacts = Array.isArray(body.contacts) ? body.contacts : []
  const clusters = []
  const byTag = new Map()

  contacts.forEach((contact) => {
    const tags = Array.isArray(contact?.tags) ? contact.tags : []
    const key = cleanText(tags[0] || contact?.groupId || contact?.email?.split('@')?.[1] || contact?.name?.[0] || 'Other')
    const normalizedKey = key || 'Other'
    if (!byTag.has(normalizedKey)) {
      byTag.set(normalizedKey, {
        id: normalizedKey,
        title: normalizedKey,
        contacts: [],
      })
    }
    byTag.get(normalizedKey).contacts.push(contact)
  })

  for (const cluster of byTag.values()) {
    clusters.push(cluster)
  }

  return { clusters, items: clusters }
}

async function generateImages(body = {}) {
  const prompt = getInputText(body) || 'High-quality social image'
  const count = normalizeCount(body.count, 1, 1, 4)
  const aspect = cleanText(body.aspect || '1:1')
  const size = imageSizeForAspect(aspect)

  const response = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size,
    response_format: 'b64_json',
    n: count,
  })

  const images = []
  const data = Array.isArray(response?.data) ? response.data : []
  for (let i = 0; i < data.length; i += 1) {
    const item = data[i] || {}
    const b64 = item.b64_json
    const url = item.url
    if (b64) {
      const buffer = Buffer.from(b64, 'base64')
      const filename = `nlp-images/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 10)}.png`
      const publicUrl = await uploadBufferToStorage(buffer, filename, 'image/png', true)
      images.push({ url: publicUrl, width: null, height: null, aspect })
    } else if (url) {
      images.push({ url, width: null, height: null, aspect })
    }
  }

  return {
    images,
  }
}

async function ingestImage(req) {
  const mode = cleanText(req.query?.mode || req.body?.mode || 'task')
  const imageUrl = getImageUrl(req.body || {})
  if (!imageUrl) {
    return { error: 'Missing imageUrl' }
  }

  const rawText = await transcribeImage(
    imageUrl,
    'Transcribe all visible text from this image. Return only the transcription.',
  )

  const basePrompt = (() => {
    if (mode === 'event') {
      return 'Extract event details from this image. Return valid JSON with title, date, startTime, locationText, notes, confidence, and optionally description.'
    }
    if (mode === 'occasion') {
      return 'Extract occasion details from this image. Return valid JSON with name, type, date, messageHint, confidence, and optionally description.'
    }
    return 'Extract actionable items from this image. Return valid JSON with items array. Each item should include title, description, type, and confidence.'
  })()

  const structuredText = await chatWithFallback({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: basePrompt },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      },
    ],
    temperature: 0.2,
    modelList: ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4o'],
    timeoutMs: 90000,
  })

  const parsed = parseJsonSafely(structuredText, {})
  const confidence = parsed?.confidence || 'medium'

  if (mode === 'event') {
    return {
      rawText,
      ocrText: rawText,
      event: {
        title: cleanText(parsed?.title || parsed?.name || 'Untitled event'),
        date: cleanText(parsed?.date || ''),
        startTime: cleanText(parsed?.startTime || parsed?.time || ''),
        locationText: cleanText(parsed?.locationText || parsed?.location || ''),
        notes: cleanText(parsed?.notes || parsed?.description || ''),
        confidence,
      },
      items: [
        {
          type: 'event',
          title: cleanText(parsed?.title || parsed?.name || 'Untitled event'),
          description: cleanText(parsed?.notes || parsed?.description || ''),
          confidence,
        },
      ],
    }
  }

  if (mode === 'occasion') {
    return {
      rawText,
      ocrText: rawText,
      occasion: {
        name: cleanText(parsed?.name || parsed?.title || 'Occasion'),
        type: cleanText(parsed?.type || 'occasion'),
        date: cleanText(parsed?.date || ''),
        messageHint: cleanText(parsed?.messageHint || parsed?.description || ''),
        confidence,
      },
      items: [
        {
          type: 'occasion',
          title: cleanText(parsed?.name || parsed?.title || 'Occasion'),
          description: cleanText(parsed?.messageHint || parsed?.description || ''),
          confidence,
        },
      ],
    }
  }

  const items = Array.isArray(parsed?.items)
    ? parsed.items.map((item, index) => ({
        id: item?.id || `item-${index}`,
        title: cleanText(item?.title || item?.name || 'Task'),
        description: cleanText(item?.description || ''),
        type: cleanText(item?.type || 'task'),
        confidence: item?.confidence || confidence,
      }))
    : []

  return {
    rawText,
    ocrText: rawText,
    items,
  }
}

router.use(requireAuth)

router.post('/generate/outreach-message', async (req, res) => {
  try {
    return res.json(await generateOutreachMessage(req.body || {}))
  } catch (error) {
    console.error('[NLP] outreach message failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to generate outreach message' })
  }
})

router.post('/generate-wish', async (req, res) => {
  try {
    return res.json(await generateWish(req.body || {}))
  } catch (error) {
    console.error('[NLP] wish generation failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to generate wish' })
  }
})

router.post('/extract-event', async (req, res) => {
  try {
    return res.json(await extractEventDetails(req.body || {}))
  } catch (error) {
    console.error('[NLP] event extraction failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to extract event details' })
  }
})

router.post('/ocr', async (req, res) => {
  try {
    const imageUrl = getImageUrl(req.body || {})
    if (!imageUrl) return res.status(400).json({ error: 'Missing imageUrl' })
    const rawText = await transcribeImage(imageUrl, 'Transcribe all visible text from this image. Return only the transcription.')
    return res.json({ text: rawText, rawText, ocrText: rawText })
  } catch (error) {
    console.error('[NLP] OCR failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to OCR image' })
  }
})

router.post('/workspace/summary', async (req, res) => {
  try {
    return res.json(await summarizeWorkspace(req.body || {}))
  } catch (error) {
    console.error('[NLP] workspace summary failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to summarize workspace' })
  }
})

router.post('/workspace/inspiration', async (req, res) => {
  try {
    return res.json(await workspaceInspiration(req.body || {}))
  } catch (error) {
    console.error('[NLP] workspace inspiration failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to generate inspiration' })
  }
})

router.post('/workspace/search', async (req, res) => {
  try {
    return res.json(await searchWorkspaceMemory(req.body || {}))
  } catch (error) {
    console.error('[NLP] workspace search failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to search workspace memory' })
  }
})

router.post('/workspace/ingest-image', async (req, res) => {
  try {
    const result = await ingestImage(req)
    if (result?.error) return res.status(400).json({ error: result.error })
    return res.json(result)
  } catch (error) {
    console.error('[NLP] ingest image failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to ingest image' })
  }
})

router.post('/cluster/contacts', async (req, res) => {
  try {
    return res.json(await clusterContacts(req.body || {}))
  } catch (error) {
    console.error('[NLP] cluster contacts failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to cluster contacts' })
  }
})

router.post('/orchestrate', async (req, res) => {
  try {
    return res.json(await orchestrateKnowledge(req.body || {}))
  } catch (error) {
    console.error('[NLP] orchestrate failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to orchestrate knowledge tasks' })
  }
})

router.post('/images/generate', async (req, res) => {
  try {
    return res.json(await generateImages(req.body || {}))
  } catch (error) {
    console.error('[NLP] image generation failed', error?.message || error)
    return res.status(500).json({ error: error?.message || 'Failed to generate images' })
  }
})

router.all('*', (_req, res) => {
  return res.status(404).json({ error: 'Unknown NLP route' })
})

export default router
