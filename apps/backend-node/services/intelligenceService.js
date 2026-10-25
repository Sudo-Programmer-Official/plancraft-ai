import OpenAI from 'openai'
import { createHash } from 'node:crypto'
import { chatWithFallback } from './openaiService.js'
import { db } from './firebaseAdmin.js'

const MAX_AGENTS = 4
const MAX_QUESTION_LENGTH = 500
const MAX_INTERESTS_LENGTH = 300
const MAX_GOAL_FIELD_LENGTH = 500
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000
const MAX_CACHE_ENTRIES = 500
const INTELLIGENCE_CACHE_COLLECTION = 'intelligence_cache'
const intelligenceCache = new Map()
const specialistCache = new Map()
const specialistInflight = new Map()

const AGENT_PROFILES = {
  'general-task-helper': {
    id: 'general-task-helper',
    label: 'General task helper',
    description: 'Find the current context, resources, and next steps for this task.',
    searchQuery:
      'current public information, practical resources, relevant places, people, services, deadlines, and next steps that can help complete the user task described below',
    instructions: [
      'Act as a general-purpose task research assistant.',
      'Use the task title, notes, and user question to determine what information would genuinely unblock progress.',
      'Return the most useful current facts, links, places, tools, contacts, requirements, or preparation steps for this specific task.',
      'If the task involves travel or a destination, prioritize current location, route, hours, booking, or access information from reliable public sources.',
      'If the task is not researchable or current web information would not help, say so and give a practical next action instead.',
      'Separate confirmed facts from suggestions and clearly call out missing or uncertain information.',
    ],
  },
  'tech-news': {
    id: 'tech-news',
    label: 'Tech news',
    description: 'The most important technology stories and product moves.',
    searchQuery:
      'latest technology news from the last 24 hours: AI, cloud, software, cybersecurity, semiconductors, developer platforms, and major product launches',
    instructions: [
      'Find the most important technology stories from the last 24 hours.',
      'Prioritize primary sources and high-quality reporting.',
      'Return 3 to 5 concise items with the exact publication date, what changed, and why it matters.',
    ],
  },
  'capital-flows': {
    id: 'capital-flows',
    label: 'Capital flows',
    description: 'Where funding, acquisitions, capex, and market attention are moving.',
    searchQuery:
      'latest technology capital flows from the last 7 days: venture funding, acquisitions, IPOs, AI infrastructure deals, semiconductor capex, and major corporate investment',
    instructions: [
      'Track where money is moving in technology.',
      'Cover venture rounds, acquisitions, IPO or filing activity, AI infrastructure spending, semiconductor capex, and major corporate investment.',
      'Distinguish announced, signed, and completed transactions. Do not give investment advice.',
    ],
  },
  'ai-chips': {
    id: 'ai-chips',
    label: 'AI & chips',
    description: 'Models, compute, data centers, chips, and supply-chain signals.',
    searchQuery:
      'latest AI and semiconductor signals from the last 7 days: model releases, chip launches, data center buildouts, cloud capacity, supply chain, and power demand',
    instructions: [
      'Focus on AI infrastructure and semiconductor signals.',
      'Connect product announcements to compute, supply, pricing, capacity, or power implications.',
      'Separate confirmed facts from interpretation and include publication dates.',
    ],
  },
  'startup-signals': {
    id: 'startup-signals',
    label: 'Startup signals',
    description: 'Startup launches, funding, hiring, and market-shaping moves.',
    searchQuery:
      'latest startup ecosystem signals from the last 7 days: notable launches, venture rounds, hiring, layoffs, acquisitions, and new developer products',
    instructions: [
      'Surface startup stories that could change markets, workflows, or opportunities.',
      'Prioritize concrete launches, financing, hiring, acquisitions, and measurable traction.',
      'Avoid hype-only stories and state when evidence is limited.',
    ],
  },
  'tech-frontier': {
    id: 'tech-frontier',
    label: 'Tech frontier',
    description: 'Company projects, research, strategy, and leaders.',
    searchQuery:
      'latest publicly verifiable technology company activity from the last 30 days: active projects, research programs, product launches, acquisitions, hiring, partnerships, capex, patents, papers, developer releases, and evidence of competitive leadership',
    instructions: [
      'Map what named technology companies are actively building, researching, launching, acquiring, hiring for, partnering on, or investing in.',
      'Prefer concrete projects, products, research programs, papers, patents, filings, earnings commentary, developer activity, and measurable actions over vague predictions.',
      'Compare who has an edge in the requested capability using evidence such as product availability, benchmarks, customers, distribution, capacity, talent, patents, research quality, funding, or adoption.',
      'Only describe a company as leading or dominant when the evidence supports that claim. Include the time window, confidence, and what would change the conclusion.',
      'Use only public information. Never imply access to confidential roadmaps, internal projects, or non-public research.',
    ],
  },
}

function cleanText(value, maxLength = 2000) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeGoalContext(value) {
  if (!value || typeof value !== 'object') return null
  const title = cleanText(value.title, 180)
  if (!title) return null
  return {
    title,
    description: cleanText(value.description, MAX_GOAL_FIELD_LENGTH),
    category: cleanText(value.category, 100),
    targetDate: cleanText(value.targetDate, 40),
  }
}

function parseJsonSafely(text, fallback = null) {
  const raw = cleanText(text, 12000)
  if (!raw) return fallback
  try {
    const first = raw.indexOf('{')
    const last = raw.lastIndexOf('}')
    return first !== -1 && last > first ? JSON.parse(raw.slice(first, last + 1)) : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function normalizeSuggestedTasks(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((task) => task && typeof task === 'object')
    .map((task) => ({
      title: cleanText(task.title, 180),
      details: cleanText(task.details || task.description, 1000),
      reason: cleanText(task.reason, 500),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(task.date || '').trim()) ? String(task.date).trim() : null,
    }))
    .filter((task) => task.title)
    .slice(0, 5)
}

function cacheTtlMs() {
  const parsed = Number(process.env.INTELLIGENCE_CACHE_TTL_MS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CACHE_TTL_MS
}

function cacheEntryValue(entry) {
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry.value || null
}

function getMemoryCache(cache, cacheKey) {
  const key = String(cacheKey || '')
  const entry = cache.get(key)
  const value = cacheEntryValue(entry)
  if (!value && entry) cache.delete(key)
  return value
}

function setMemoryCache(cache, cacheKey, value) {
  const key = String(cacheKey || '')
  if (!key || !value) return
  if (cache.size >= MAX_CACHE_ENTRIES && !cache.has(key)) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) cache.delete(oldestKey)
  }
  cache.delete(key)
  cache.set(key, { value, expiresAt: Date.now() + cacheTtlMs() })
}

function firestoreCacheKey(kind, cacheKey) {
  return `${kind}:${String(cacheKey || '')}`
}

function firestoreMillis(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (value instanceof Date) return value.getTime()
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function readSharedCache(kind, cacheKey) {
  const key = String(cacheKey || '')
  if (!key) return null
  try {
    const snapshot = await db.collection(INTELLIGENCE_CACHE_COLLECTION)
      .doc(firestoreCacheKey(kind, key))
      .get()
    if (!snapshot.exists) return null
    const data = snapshot.data() || {}
    if (firestoreMillis(data.expiresAt) <= Date.now()) return null
    return data.value || null
  } catch (error) {
    // Cache availability must never make live research fail.
    console.warn('[Intelligence] shared cache read failed', error?.message || error)
    return null
  }
}

async function writeSharedCache(kind, cacheKey, value) {
  const key = String(cacheKey || '')
  if (!key || !value) return
  try {
    await db.collection(INTELLIGENCE_CACHE_COLLECTION)
      .doc(firestoreCacheKey(kind, key))
      .set({
        value,
        expiresAt: new Date(Date.now() + cacheTtlMs()),
        updatedAt: new Date(),
      })
  } catch (error) {
    console.warn('[Intelligence] shared cache write failed', error?.message || error)
  }
}

export function buildIntelligenceCacheKey({
  question = '',
  interests = '',
  agentIds,
  customAgentIds = [],
  customAgentVersions = [],
  goalContext = null,
} = {}) {
  const normalizedGoal = normalizeGoalContext(goalContext)
  const payload = {
    version: 2,
    question: cleanText(question, MAX_QUESTION_LENGTH).toLowerCase(),
    interests: cleanText(interests, MAX_INTERESTS_LENGTH).toLowerCase(),
    agentIds: (Array.isArray(agentIds) ? normalizeRequestedAgentIds(agentIds) : normalizeAgentIds(agentIds)).sort(),
    customAgents: normalizeCustomAgentIds(customAgentIds)
      .map((id, index) => `${id}:${cleanText(customAgentVersions[index], 120)}`)
      .sort(),
    goalContext: normalizedGoal,
  }
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function buildIntelligenceSpecialistCacheKey({
  agentId = '',
  agentVersion = '',
  question = '',
  interests = '',
  goalContext = null,
} = {}) {
  const payload = {
    version: 2,
    agentId: cleanText(agentId, 40),
    agentVersion: cleanText(agentVersion, 120),
    question: cleanText(question, MAX_QUESTION_LENGTH).toLowerCase(),
    interests: cleanText(interests, MAX_INTERESTS_LENGTH).toLowerCase(),
    goalContext: normalizeGoalContext(goalContext),
  }
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function getCachedIntelligenceBrief(cacheKey) {
  return getMemoryCache(intelligenceCache, cacheKey)
}

export function cacheIntelligenceBrief(cacheKey, value) {
  setMemoryCache(intelligenceCache, cacheKey, value)
}

export async function getSharedCachedIntelligenceBrief(cacheKey) {
  const local = getCachedIntelligenceBrief(cacheKey)
  if (local) return local
  const shared = await readSharedCache('brief', cacheKey)
  if (shared) cacheIntelligenceBrief(cacheKey, shared)
  return shared
}

export async function cacheSharedIntelligenceBrief(cacheKey, value) {
  cacheIntelligenceBrief(cacheKey, value)
  await writeSharedCache('brief', cacheKey, value)
}

export function listIntelligenceAgents() {
  return Object.values(AGENT_PROFILES).map(({ id, label, description }) => ({ id, label, description }))
}

export function normalizeAgentIds(value) {
  const normalized = normalizeRequestedAgentIds(value)
  return normalized.length ? normalized : ['general-task-helper']
}

function normalizeRequestedAgentIds(value) {
  const requested = Array.isArray(value) ? value : []
  return unique(requested.map((id) => cleanText(id, 40)))
    .filter((id) => AGENT_PROFILES[id])
    .slice(0, MAX_AGENTS)
}

function normalizeCustomAgentIds(value) {
  return unique((Array.isArray(value) ? value : []).map((id) => cleanText(id, 80)))
    .slice(0, MAX_AGENTS)
}

export function buildAgentQuery(profile, { question = '', interests = '', goalContext = null } = {}) {
  const parts = [profile.searchQuery]
  const cleanQuestion = cleanText(question, MAX_QUESTION_LENGTH)
  const cleanInterests = cleanText(interests, MAX_INTERESTS_LENGTH)
  if (cleanQuestion) parts.push(`Answer this user question as part of the research: ${cleanQuestion}`)
  if (cleanInterests) parts.push(`Prioritize these user interests when relevant: ${cleanInterests}`)
  if (goalContext?.title) {
    parts.push(
      `This research supports the PlanCraft goal "${goalContext.title}". Find recent signals that could materially affect progress on this goal, and explain the practical implication for the person pursuing it`,
    )
    if (goalContext.description) parts.push(`Goal context: ${goalContext.description}`)
    if (goalContext.category) parts.push(`Goal category: ${goalContext.category}`)
    if (goalContext.targetDate) parts.push(`Goal target date: ${goalContext.targetDate}`)
  }
  return parts.join('. ')
}

function normalizeUrl(value) {
  const url = cleanText(value, 1000)
  if (!/^https?:\/\//i.test(url)) return ''
  return url
}

function addSource(sources, candidate) {
  const url = normalizeUrl(candidate?.url || candidate?.link || candidate)
  if (!url || sources.some((source) => source.url === url)) return
  sources.push({
    title: cleanText(candidate?.title || candidate?.name || url, 220),
    url,
  })
}

function collectSources(response, text = '') {
  const sources = []
  const output = Array.isArray(response?.output) ? response.output : []

  for (const item of output) {
    if (item?.type === 'web_search_call') {
      for (const source of item?.action?.sources || []) addSource(sources, source)
    }
    for (const part of item?.content || []) {
      for (const annotation of part?.annotations || []) {
        if (annotation?.type === 'url_citation') addSource(sources, annotation.url_citation || annotation)
      }
    }
  }

  const message = response?.choices?.[0]?.message
  for (const annotation of message?.annotations || []) {
    if (annotation?.type === 'url_citation') addSource(sources, annotation.url_citation || annotation)
  }

  // Keep a useful source link even if an older API response only returns inline URLs.
  for (const url of String(text || '').match(/https?:\/\/[^\s)\]>]+/g) || []) addSource(sources, url)
  return sources.slice(0, 12)
}

function getResponseText(response) {
  return cleanText(
    response?.output_text || response?.choices?.[0]?.message?.content || '',
    9000,
  )
}

function shouldUseSearchFallback(error) {
  const status = Number(error?.status || error?.response?.status || 0)
  const code = String(error?.code || error?.error?.code || '').toLowerCase()
  const message = String(error?.message || error?.error?.message || '').toLowerCase()
  if (status === 404 || code === 'model_not_found' || code === 'unsupported_parameter') return true
  return /(?:web.?search|tool|model).*(?:not supported|unsupported|unavailable|not found)/i.test(message)
}

async function runLiveSearch(query, instructions) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  // GPT-5.4 Mini keeps web-search support while being designed for high-volume
  // workloads. Set OPENAI_INTELLIGENCE_MODEL=gpt-5.5 for maximum-depth research.
  const model = process.env.OPENAI_INTELLIGENCE_MODEL || 'gpt-5.4-mini'
  const prompt = [
    'You are a read-only research specialist inside a personal intelligence desk.',
    'Use live web search. Never invent current events, numbers, dates, or sources.',
    'Return concise plain text with clear headings. Include source links through web citations when available.',
    ...instructions,
    `Research query: ${query}`,
  ].join('\n')

  try {
    const response = await openai.responses.create(
      {
        model,
        input: prompt,
        tools: [
          {
            type: 'web_search',
            search_context_size: 'medium',
            external_web_access: true,
          },
        ],
        include: ['web_search_call.action.sources'],
        tool_choice: 'required',
      },
      { timeout: 90000 },
    )
    const text = getResponseText(response)
    return { text, sources: collectSources(response, text), provider: 'responses-web-search' }
  } catch (error) {
    if (!shouldUseSearchFallback(error)) throw error
    // Keep a compatibility path for deployments whose OpenAI SDK/project has not
    // enabled the current Responses web_search tool yet.
    const fallbackModel = process.env.OPENAI_INTELLIGENCE_SEARCH_MODEL || 'gpt-5-search-api'
    const response = await openai.chat.completions.create(
      {
        model: fallbackModel,
        web_search_options: {},
        messages: [{ role: 'user', content: prompt }],
      },
      { timeout: 90000 },
    )
    const text = getResponseText(response)
    return { text, sources: collectSources(response, text), provider: 'chat-search-fallback' }
  }
}

async function getSpecialistResult({ profile, query, researchContext }) {
  const cacheKey = buildIntelligenceSpecialistCacheKey({
    agentId: profile.id,
    agentVersion: profile.agentVersion,
    ...researchContext,
  })
  const local = getMemoryCache(specialistCache, cacheKey)
  if (local) return { result: local, cached: true }

  const existing = specialistInflight.get(cacheKey)
  if (existing) return { result: await existing, cached: true }

  const shared = await readSharedCache('specialist', cacheKey)
  if (shared) {
    setMemoryCache(specialistCache, cacheKey, shared)
    return { result: shared, cached: true }
  }

  const inflightAfterRead = specialistInflight.get(cacheKey)
  if (inflightAfterRead) return { result: await inflightAfterRead, cached: true }

  const promise = runLiveSearch(query, profile.instructions).then(async (result) => {
    setMemoryCache(specialistCache, cacheKey, result)
    // Do not make the user wait for the cache write.
    void writeSharedCache('specialist', cacheKey, result)
    return result
  })
  specialistInflight.set(cacheKey, promise)

  try {
    return { result: await promise, cached: false }
  } finally {
    if (specialistInflight.get(cacheKey) === promise) specialistInflight.delete(cacheKey)
  }
}

async function synthesizeBrief(results, { question = '', interests = '', goalContext = null } = {}) {
  const packets = results
    .map((result) => [
      `SPECIALIST: ${result.label}`,
      `RESEARCH:\n${cleanText(result.text, 7000)}`,
      `SOURCES:\n${result.sources.map((source) => `- ${source.title}: ${source.url}`).join('\n') || '- none returned'}`,
    ].join('\n'))
    .join('\n\n---\n\n')

  const goalMode = Boolean(goalContext?.title)
  const generalTaskMode = results.some((result) => result.id === 'general-task-helper')
  const frontierMode = results.some((result) => result.id === 'tech-frontier')
  const prompt = [
    goalMode
      ? `Create a concise goal watchlist brief for the PlanCraft goal "${goalContext.title}".`
      : generalTaskMode
        ? 'Create a concise, task-specific research answer that helps the user make progress now.'
      : 'Create a concise morning intelligence brief for a tech-focused user.',
    'Use only the specialist research packets below; do not add outside facts.',
    goalMode
      ? 'Lead with the 3 to 5 most important external signals, explain exactly why each matters to this goal, and identify a practical next move only when the evidence supports it.'
      : generalTaskMode
        ? 'Lead with the most useful current facts or resources for this task, then give a short ordered list of practical next steps. Do not force a technology or market angle when the task does not need one.'
      : 'Lead with the 3 to 5 most important signals, explain why each matters to a builder or operator, and call out disagreements or low-confidence items.',
    frontierMode
      ? 'For the technology frontier material, include a compact comparison of Company, active project or research, latest evidence and date, strategic edge, and leadership status with confidence. Do not rank companies without evidence and do not present private-roadmap speculation as fact.'
      : '',
    'For capital flows, describe movement and implications without recommending investments or securities.',
    'Include exact dates when the packets provide them. Keep the answer under 700 words.',
    goalMode
      ? [
          'Return ONLY valid JSON with this shape: {"brief":"...","suggestedTasks":[{"title":"...","details":"...","reason":"...","date":null}]}',
          'suggestedTasks must contain at most 5 concrete, user-approvable planner tasks. Use date only as YYYY-MM-DD when the research gives a clear deadline; otherwise use null.',
          'Do not invent facts, dates, people, companies, or commitments. If no task is justified, return an empty suggestedTasks array.',
        ].join(' ')
      : '',
    goalMode && goalContext.description ? `Goal context: ${goalContext.description}` : '',
    goalMode && goalContext.category ? `Goal category: ${goalContext.category}` : '',
    goalMode && goalContext.targetDate ? `Goal target date: ${goalContext.targetDate}` : '',
    question ? `User question: ${cleanText(question, MAX_QUESTION_LENGTH)}` : '',
    interests ? `User interests: ${cleanText(interests, MAX_INTERESTS_LENGTH)}` : '',
    packets,
  ].filter(Boolean).join('\n\n')

  try {
    const raw = await chatWithFallback({
      messages: [
        { role: 'system', content: 'You are the editor for a source-backed personal intelligence desk.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.25,
      modelList: [
        process.env.OPENAI_INTELLIGENCE_SUMMARY_MODEL || 'gpt-4.1-mini',
        process.env.OPENAI_MODEL || 'gpt-4o-mini',
      ],
      timeoutMs: 60000,
    })
    if (!goalMode) return { text: cleanText(raw, 9000), suggestedTasks: [] }
    const parsed = parseJsonSafely(raw, {})
    return {
      text: cleanText(parsed?.brief || raw, 9000),
      suggestedTasks: normalizeSuggestedTasks(parsed?.suggestedTasks),
    }
  } catch (error) {
    console.warn('[Intelligence] synthesis failed', error?.message || error)
    return {
      text: 'The specialist research is ready below. Review each source-backed signal for the latest details.',
      suggestedTasks: [],
    }
  }
}

export async function createIntelligenceBrief({
  question = '',
  interests = '',
  agentIds,
  customAgents = [],
  goalContext: rawGoalContext = null,
} = {}) {
  const normalizedQuestion = cleanText(question, MAX_QUESTION_LENGTH)
  const normalizedInterests = cleanText(interests, MAX_INTERESTS_LENGTH)
  const goalContext = normalizeGoalContext(rawGoalContext)
  const fixedProfiles = (Array.isArray(agentIds) ? normalizeRequestedAgentIds(agentIds) : normalizeAgentIds(agentIds))
    .map((id) => AGENT_PROFILES[id])
  const profiles = [
    ...fixedProfiles,
    ...(Array.isArray(customAgents) ? customAgents : []),
  ].slice(0, MAX_AGENTS)
  const settled = await Promise.allSettled(
    profiles.map(async (profile) => {
      const query = buildAgentQuery(profile, {
        question: normalizedQuestion,
        interests: normalizedInterests,
        goalContext,
      })
      const startedAt = Date.now()
      const specialist = await getSpecialistResult({
        profile,
        query,
        researchContext: {
          question: normalizedQuestion,
          interests: normalizedInterests,
          goalContext,
          agentVersion: profile.agentVersion,
        },
      })
      const result = specialist.result
      return {
        id: profile.id,
        label: profile.label,
        description: profile.description,
        query,
        text: result.text,
        sources: result.sources,
        provider: result.provider,
        cached: specialist.cached,
        elapsedMs: Date.now() - startedAt,
      }
    }),
  )

  const results = settled
    .filter((entry) => entry.status === 'fulfilled' && entry.value?.text)
    .map((entry) => entry.value)
  const failures = settled
    .filter((entry) => entry.status === 'rejected')
    .map((entry) => cleanText(entry.reason?.message || 'Specialist unavailable', 240))

  if (!results.length) {
    throw new Error(failures[0] || 'No intelligence specialists returned a result')
  }

  const synthesis = await synthesizeBrief(results, {
    question: normalizedQuestion,
    interests: normalizedInterests,
    goalContext,
  })
  const sources = results.flatMap((result) => result.sources).filter((source, index, all) => (
    all.findIndex((candidate) => candidate.url === source.url) === index
  )).slice(0, 24)

  return {
    generatedAt: new Date().toISOString(),
    question: normalizedQuestion,
    interests: normalizedInterests,
    synthesis: synthesis.text,
    suggestedTasks: synthesis.suggestedTasks,
    goal: goalContext,
    agents: results,
    sources,
    failures,
  }
}

