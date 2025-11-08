import { db } from './firebaseAdmin.js'
import { updateStreakOnEntry } from './streakService.js'

function sanitizeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback
  const text = String(value).trim()
  return text || fallback
}

function normalizeDateKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim()
  }
  const date = value instanceof Date ? value : new Date(value || Date.now())
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function coerceTags(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((tag) => sanitizeString(tag))
    .filter(Boolean)
    .slice(0, 12)
}

export async function addJournalEntry(userId, payload = {}) {
  if (!userId) throw new Error('userId required')
  if (!payload?.text) throw new Error('text required')

  const entry = {
    userId: String(userId),
    title: sanitizeString(payload.title),
    text: sanitizeString(payload.text),
    mood: sanitizeString(payload.mood),
    tags: coerceTags(payload.tags),
    date: normalizeDateKey(payload.date || new Date()),
    summary: sanitizeString(payload.summary),
    source: payload.source ? sanitizeString(payload.source) : 'gpt',
    meta: typeof payload.meta === 'object' && payload.meta ? payload.meta : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  Object.keys(entry).forEach((key) => {
    if (entry[key] === undefined) delete entry[key]
  })

  const ref = await db.collection('journalEntries').add(entry)

  // Update streak counts asynchronously; failures should not block journal save.
  try {
    await updateStreakOnEntry(userId, entry.date)
  } catch (err) {
    console.warn('[JournalService] streak update failed', err?.message || err)
  }

  return { id: ref.id, ...entry }
}
