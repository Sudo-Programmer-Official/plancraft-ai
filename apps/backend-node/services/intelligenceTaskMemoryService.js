import { createHash } from 'node:crypto'
import { db } from './firebaseAdmin.js'

const COLLECTION = 'task_research'
const MAX_TASK_ID_LENGTH = 200
const MAX_AGENT_ID_LENGTH = 120
const MAX_AGENT_LABEL_LENGTH = 160
const MAX_USER_QUESTION_LENGTH = 220
const MAX_QUESTION_LENGTH = 500
const MAX_INTERESTS_LENGTH = 300
const MAX_TITLE_LENGTH = 180
const MAX_NOTES_LENGTH = 180
const MAX_SYNTHESIS_LENGTH = 30000
const MAX_SOURCE_COUNT = 24
const MAX_AGENT_COUNT = 4
const MAX_AGENT_TEXT_LENGTH = 12000
const MAX_SUGGESTED_TASK_COUNT = 5

function text(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max)
}

function normalizedText(value, max) {
  return text(value, max).toLowerCase()
}

function safeUrl(value) {
  const url = text(value, 1200)
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : ''
  } catch {
    return ''
  }
}

function isoTimestamp(value, fallback = new Date()) {
  if (value?.toDate) return value.toDate().toISOString()
  const date = value instanceof Date ? value : new Date(value || fallback)
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString()
}

function sourceList(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((source) => ({
      title: text(source?.title || source?.name || '', 300),
      url: safeUrl(source?.url || source?.link),
      domain: text(source?.domain || '', 160),
      publishedAt: text(source?.publishedAt || source?.published || '', 80),
    }))
    .filter((source) => source.url)
    .filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index)
    .slice(0, MAX_SOURCE_COUNT)
}

function agentList(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_AGENT_COUNT).map((agent) => ({
    id: text(agent?.id, MAX_AGENT_ID_LENGTH),
    label: text(agent?.label || agent?.name, MAX_AGENT_LABEL_LENGTH),
    description: text(agent?.description, 300),
    text: text(agent?.text || agent?.synthesis, MAX_AGENT_TEXT_LENGTH),
    sources: sourceList(agent?.sources),
    provider: text(agent?.provider, 80),
    cached: agent?.cached === true,
  }))
}

function suggestedTaskList(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_SUGGESTED_TASK_COUNT).map((task) => ({
    title: text(task?.title || task?.task, 240),
    details: text(task?.details || task?.description, 600),
    date: text(task?.date || task?.dueDate, 40) || null,
    category: text(task?.category, 80),
  })).filter((task) => task.title)
}

function contextPayload({ taskId = '', agentId = '', userQuestion = '', title = '', notes = '' } = {}) {
  return {
    version: 1,
    taskId: normalizedText(taskId, MAX_TASK_ID_LENGTH),
    agentId: normalizedText(agentId, MAX_AGENT_ID_LENGTH),
    userQuestion: normalizedText(userQuestion, MAX_USER_QUESTION_LENGTH),
    title: normalizedText(title, MAX_TITLE_LENGTH),
    notes: normalizedText(notes, MAX_NOTES_LENGTH),
  }
}

export function buildTaskResearchSnapshotHash({ taskId, title, notes } = {}) {
  const payload = contextPayload({ taskId, title, notes })
  delete payload.agentId
  delete payload.userQuestion
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function buildTaskResearchContextHash({ taskId, agentId, userQuestion, title, notes } = {}) {
  return createHash('sha256')
    .update(JSON.stringify(contextPayload({ taskId, agentId, userQuestion, title, notes })))
    .digest('hex')
}

function normalizeMemory(taskId, payload = {}) {
  const now = new Date()
  const titleSnapshot = text(payload.titleSnapshot || payload.title, MAX_TITLE_LENGTH)
  const notesSnapshot = text(payload.notesSnapshot || payload.notes, MAX_NOTES_LENGTH)
  const agentId = text(payload.agentId, MAX_AGENT_ID_LENGTH)
  const userQuestion = text(payload.userQuestion, MAX_USER_QUESTION_LENGTH)

  return {
    taskId: text(taskId, MAX_TASK_ID_LENGTH),
    agentId,
    agentLabel: text(payload.agentLabel, MAX_AGENT_LABEL_LENGTH),
    userQuestion,
    question: text(payload.question, MAX_QUESTION_LENGTH),
    interests: text(payload.interests, MAX_INTERESTS_LENGTH),
    titleSnapshot,
    notesSnapshot,
    synthesis: text(payload.synthesis, MAX_SYNTHESIS_LENGTH),
    sources: sourceList(payload.sources),
    agents: agentList(payload.agents),
    suggestedTasks: suggestedTaskList(payload.suggestedTasks),
    generatedAt: isoTimestamp(payload.generatedAt, now),
    savedAt: now.toISOString(),
    taskSnapshotHash: buildTaskResearchSnapshotHash({ taskId, title: titleSnapshot, notes: notesSnapshot }),
    contextHash: buildTaskResearchContextHash({
      taskId,
      agentId,
      userQuestion,
      title: titleSnapshot,
      notes: notesSnapshot,
    }),
    schemaVersion: 1,
  }
}

function publicMemory(id, data = {}) {
  return {
    ...data,
    id,
    generatedAt: isoTimestamp(data.generatedAt),
    savedAt: isoTimestamp(data.savedAt || data.createdAt || data.generatedAt),
  }
}

function memorySortValue(memory) {
  const value = Date.parse(memory?.savedAt || memory?.generatedAt || '')
  return Number.isFinite(value) ? value : 0
}

export async function saveTaskResearchMemory(userId, taskId, payload = {}) {
  const uid = text(userId, 200)
  const normalizedTaskId = text(taskId, MAX_TASK_ID_LENGTH)
  if (!uid || !normalizedTaskId) throw new Error('A user and task are required')

  const memory = normalizeMemory(normalizedTaskId, payload)
  if (!memory.synthesis) throw new Error('A successful research answer is required')

  const ref = await db.collection('users').doc(uid).collection(COLLECTION).add({
    ...memory,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  return publicMemory(ref.id, memory)
}

export async function getTaskResearchMemory(userId, taskId, { title = '', notes = '' } = {}) {
  const uid = text(userId, 200)
  const normalizedTaskId = text(taskId, MAX_TASK_ID_LENGTH)
  if (!uid || !normalizedTaskId) return { memory: null, history: [] }

  const snapshot = await db.collection('users').doc(uid).collection(COLLECTION)
    .where('taskId', '==', normalizedTaskId)
    .limit(50)
    .get()

  const records = snapshot.docs
    .map((doc) => publicMemory(doc.id, doc.data()))
    .sort((left, right) => memorySortValue(right) - memorySortValue(left))
  const hasTaskSnapshot = Boolean(text(title, MAX_TITLE_LENGTH) || text(notes, MAX_NOTES_LENGTH))
  const expectedSnapshotHash = hasTaskSnapshot
    ? buildTaskResearchSnapshotHash({ taskId: normalizedTaskId, title, notes })
    : ''
  const matching = expectedSnapshotHash
    ? records.filter((record) => record.taskSnapshotHash === expectedSnapshotHash)
    : records

  return {
    memory: matching[0] || null,
    history: matching.slice(0, 10),
  }
}
