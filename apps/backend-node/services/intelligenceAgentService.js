import { db } from './firebaseAdmin.js'

export const INTELLIGENCE_AGENTS_COLLECTION = 'intelligence_agents'
export const DEFAULT_CUSTOM_AGENT_LIMIT = 10
export const MAX_CUSTOM_AGENT_NAME_LENGTH = 80
export const MAX_CUSTOM_AGENT_DESCRIPTION_LENGTH = 240
export const MAX_CUSTOM_AGENT_PROMPT_LENGTH = 1800
export const MAX_CUSTOM_AGENT_SEARCH_FOCUS_LENGTH = 360
export const INTELLIGENCE_OUTPUT_STYLES = new Set(['brief', 'table', 'timeline', 'checklist'])
const DEFAULT_AGENT_SCHEDULE = Object.freeze({ enabled: false, time: '08:00', timezone: 'UTC' })
const AGENT_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function cleanText(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function timestampValue(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function customAgentLimit() {
  const configured = Number(process.env.INTELLIGENCE_CUSTOM_AGENTS_LIMIT)
  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.floor(configured), 50)
    : DEFAULT_CUSTOM_AGENT_LIMIT
}

function normalizeTimezone(value, fallback = 'UTC') {
  const timezone = String(value || '').trim()
  if (!timezone) return fallback
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return timezone
  } catch {
    return fallback
  }
}

export function normalizeAgentSchedule(value = {}, fallback = DEFAULT_AGENT_SCHEDULE) {
  if (value === null) return { ...DEFAULT_AGENT_SCHEDULE }
  const input = value && typeof value === 'object' ? value : {}
  const time = AGENT_TIME_RE.test(String(input.time || fallback.time || DEFAULT_AGENT_SCHEDULE.time))
    ? String(input.time || fallback.time || DEFAULT_AGENT_SCHEDULE.time)
    : DEFAULT_AGENT_SCHEDULE.time
  return {
    enabled: input.enabled === undefined ? Boolean(fallback.enabled) : Boolean(input.enabled),
    time,
    timezone: normalizeTimezone(input.timezone || fallback.timezone || DEFAULT_AGENT_SCHEDULE.timezone),
  }
}

export function normalizeCustomAgentPayload(input = {}, { partial = false } = {}) {
  const output = {}
  const fields = [
    ['name', MAX_CUSTOM_AGENT_NAME_LENGTH],
    ['description', MAX_CUSTOM_AGENT_DESCRIPTION_LENGTH],
    ['prompt', MAX_CUSTOM_AGENT_PROMPT_LENGTH],
    ['searchFocus', MAX_CUSTOM_AGENT_SEARCH_FOCUS_LENGTH],
  ]

  for (const [field, maxLength] of fields) {
    if (partial && !Object.prototype.hasOwnProperty.call(input, field)) continue
    output[field] = cleanText(input[field], maxLength)
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, 'outputStyle')) {
    const outputStyle = cleanText(input.outputStyle || 'brief', 20).toLowerCase()
    if (!INTELLIGENCE_OUTPUT_STYLES.has(outputStyle)) throw new Error('Unsupported output style')
    output.outputStyle = outputStyle
  }

  if (!partial || Object.prototype.hasOwnProperty.call(input, 'schedule')) {
    output.schedule = normalizeAgentSchedule(input.schedule, DEFAULT_AGENT_SCHEDULE)
  }

  if (!partial && !output.name) throw new Error('Agent name is required')
  if (!partial && !output.prompt) throw new Error('Agent prompt is required')
  if (partial && Object.prototype.hasOwnProperty.call(input, 'name') && !output.name) {
    throw new Error('Agent name cannot be empty')
  }
  if (partial && Object.prototype.hasOwnProperty.call(input, 'prompt') && !output.prompt) {
    throw new Error('Agent prompt cannot be empty')
  }

  return output
}

export function serializeCustomIntelligenceAgent(snapshot) {
  const data = snapshot?.data?.() || {}
  return {
    id: snapshot.id,
    label: data.name || 'Custom desk',
    name: data.name || 'Custom desk',
    description: data.description || data.searchFocus || 'A personal source-backed research desk.',
    prompt: data.prompt || '',
    searchFocus: data.searchFocus || '',
    outputStyle: data.outputStyle || 'brief',
    capabilities: ['web_search'],
    schedule: normalizeAgentSchedule(data.schedule),
    custom: true,
    createdAt: timestampValue(data.createdAt),
    updatedAt: timestampValue(data.updatedAt),
  }
}

function toResearchProfile(snapshot) {
  const data = snapshot?.data?.() || {}
  const name = cleanText(data.name || 'Custom desk', MAX_CUSTOM_AGENT_NAME_LENGTH)
  const description = cleanText(
    data.description || data.searchFocus || 'A personal source-backed research desk.',
    MAX_CUSTOM_AGENT_DESCRIPTION_LENGTH,
  )
  const prompt = cleanText(data.prompt || '', MAX_CUSTOM_AGENT_PROMPT_LENGTH)
  const searchFocus = cleanText(data.searchFocus || name, MAX_CUSTOM_AGENT_SEARCH_FOCUS_LENGTH)
  const outputStyle = INTELLIGENCE_OUTPUT_STYLES.has(data.outputStyle) ? data.outputStyle : 'brief'
  const updatedAt = timestampValue(data.updatedAt) || timestampValue(data.createdAt) || ''

  return {
    id: snapshot.id,
    label: name,
    description,
    searchQuery: `latest information about ${searchFocus}`,
    instructions: [
      prompt,
      'Use live web search and prioritize primary sources and high-quality reporting.',
      'Separate confirmed facts from interpretation, include exact publication dates, and avoid unsupported claims.',
      'Return 3 to 5 concise signals with a clear explanation of why each matters to the user.',
      `Format the response as a ${outputStyle}.`,
    ].filter(Boolean),
    custom: true,
    capabilities: ['web_search'],
    outputStyle,
    agentVersion: updatedAt,
  }
}

export async function listCustomIntelligenceAgents(userId) {
  const uid = String(userId || '').trim()
  if (!uid) return []
  const snapshot = await db.collection(INTELLIGENCE_AGENTS_COLLECTION)
    .where('userId', '==', uid)
    .get()

  return snapshot.docs
    .map(serializeCustomIntelligenceAgent)
    .sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime()
      const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime()
      return rightTime - leftTime
    })
}

export async function createCustomIntelligenceAgent(userId, input = {}) {
  const uid = String(userId || '').trim()
  if (!uid) throw new Error('User is required')
  const payload = normalizeCustomAgentPayload(input)
  const existing = await db.collection(INTELLIGENCE_AGENTS_COLLECTION)
    .where('userId', '==', uid)
    .get()
  if (existing.size >= customAgentLimit()) {
    const error = new Error(`You can create up to ${customAgentLimit()} custom desks`)
    error.code = 'intelligence_agent_limit_reached'
    throw error
  }

  const now = new Date()
  const reference = await db.collection(INTELLIGENCE_AGENTS_COLLECTION).add({
    userId: uid,
    ...payload,
    createdAt: now,
    updatedAt: now,
    schedule: payload.schedule || { ...DEFAULT_AGENT_SCHEDULE },
  })
  return serializeCustomIntelligenceAgent(await reference.get())
}

export async function updateCustomIntelligenceAgent(userId, agentId, input = {}) {
  const uid = String(userId || '').trim()
  const id = String(agentId || '').trim()
  if (!uid || !id) throw new Error('User and agent are required')
  const reference = db.collection(INTELLIGENCE_AGENTS_COLLECTION).doc(id)
  const snapshot = await reference.get()
  if (!snapshot.exists) return null
  if (snapshot.data()?.userId !== uid) {
    const error = new Error('Forbidden')
    error.code = 'forbidden'
    throw error
  }
  const payload = normalizeCustomAgentPayload(input, { partial: true })
  await reference.update({ ...payload, updatedAt: new Date() })
  return serializeCustomIntelligenceAgent(await reference.get())
}

export async function deleteCustomIntelligenceAgent(userId, agentId) {
  const uid = String(userId || '').trim()
  const id = String(agentId || '').trim()
  if (!uid || !id) throw new Error('User and agent are required')
  const reference = db.collection(INTELLIGENCE_AGENTS_COLLECTION).doc(id)
  const snapshot = await reference.get()
  if (!snapshot.exists) return false
  if (snapshot.data()?.userId !== uid) {
    const error = new Error('Forbidden')
    error.code = 'forbidden'
    throw error
  }
  await reference.delete()
  return true
}

export async function resolveCustomIntelligenceProfiles(userId, agentIds = []) {
  const uid = String(userId || '').trim()
  const ids = Array.from(new Set(
    (Array.isArray(agentIds) ? agentIds : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean),
  )).slice(0, 4)
  if (!uid || !ids.length) return []

  const snapshots = await Promise.all(ids.map((id) => db.collection(INTELLIGENCE_AGENTS_COLLECTION).doc(id).get()))
  return snapshots
    .filter((snapshot) => snapshot.exists && snapshot.data()?.userId === uid)
    .map(toResearchProfile)
}

function titleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 7)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}

export function buildIntelligenceAgentDraft(input = {}) {
  const useCase = cleanText(input.useCase || input.goal || input.description, 900)
  if (useCase.length < 8) throw new Error('Tell us a little more about what this agent should help with')

  const subject = useCase
    .replace(/^(i want|i need|help me)\s+(?:to\s+)?/i, '')
    .replace(/^(track|monitor|research|understand|find|watch)\s+/i, '')
    .replace(/[.!?]+$/, '')
    .trim()
  const marketTokens = Array.from(new Set(
    useCase.match(/BANK\s+NIFTY|NIFTY(?:\s+50)?|SENSEX|F&O|OPTIONS?|FUTURES?/gi) || [],
  )).map((token) => token.toUpperCase())
  const label = (marketTokens.length
    ? `${marketTokens.join(' + ')} Market Watch`
    : `${titleCase(subject || useCase)} Watch`).slice(0, MAX_CUSTOM_AGENT_NAME_LENGTH)
  const outputStyle = INTELLIGENCE_OUTPUT_STYLES.has(input.outputStyle) ? input.outputStyle : 'brief'
  const frontierMode = /(?:company|companies|competitor|competitors|working on|building|research|project|projects|edge|dominat|leader|lead)/i.test(useCase)

  if (frontierMode && !marketTokens.length) {
    return {
      name: 'Tech Frontier Radar',
      description: `A public-signal radar for ${subject || useCase}.`,
      searchFocus: `public company projects, research, launches, acquisitions, hiring, partnerships, investment, competitive edge, and leadership signals for ${useCase}`.slice(0, MAX_CUSTOM_AGENT_SEARCH_FOCUS_LENGTH),
      outputStyle: outputStyle === 'brief' ? 'table' : outputStyle,
      prompt: [
        'Act as a source-backed technology strategy and company activity analyst.',
        `User need: "${useCase}"`,
        'Use live web search to map the latest publicly verifiable projects, research programs, launches, acquisitions, hiring, partnerships, investment, filings, papers, patents, and developer activity.',
        'Compare companies using measurable evidence such as product availability, benchmarks, customers, distribution, capacity, talent, research quality, funding, or adoption.',
        'Explain who appears to have an edge or lead only when evidence supports it; include dates, confidence, conflicting evidence, and what remains unknown.',
        'Never claim access to confidential roadmaps or invent facts, numbers, dates, projects, rankings, or sources.',
        `Present the result as a ${outputStyle === 'brief' ? 'table' : outputStyle} that is concise and easy to scan.`,
      ].join(' '),
    }
  }

  return {
    name: label,
    description: `A focused research agent for ${subject || useCase}.`,
    searchFocus: useCase.slice(0, MAX_CUSTOM_AGENT_SEARCH_FOCUS_LENGTH),
    outputStyle,
    prompt: [
      'Act as a read-only personal intelligence agent.',
      `User need: "${useCase}"`,
      'Use live web search to investigate the need, prioritizing primary sources and high-quality reporting.',
      'Return the most relevant recent signals, include exact dates and source links, distinguish confirmed facts from interpretation, and explain why each signal matters.',
      'State what is unknown or conflicting instead of guessing. Do not invent facts, numbers, dates, or recommendations.',
      `Present the result as a ${outputStyle} that is concise and easy to scan.`,
    ].join(' '),
  }
}
