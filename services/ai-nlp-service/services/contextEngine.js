import admin from 'firebase-admin'
import { ensureApp } from '../utils/firebase.js'
import { logger } from '../utils/logger.js'
import { embedText } from './embeddings.js'
import { searchSimilar } from './vectorStore.js'

/**
 * Expected Firestore indexes (create in UI if errors surface):
 * - tasks: workspaceId ASC, dueDate ASC; workspaceId ASC, createdAt DESC
 * - napkin/items: workspaceId ASC, createdAt DESC
 * - creator_drafts: workspaceId ASC, updatedAt DESC; workspaceId ASC, scheduledAt ASC
 * - leaders/{uid}/events: workspaceId ASC, start ASC
 * - leaders/{uid}/issues: workspaceId ASC, updatedAt DESC
 * - ai_logs: workspaceId ASC, createdAt DESC
 */

function getDb() {
  ensureApp()
  return admin.firestore()
}

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000)
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function toIso(value) {
  const d = toDate(value)
  return d ? d.toISOString() : null
}

function toYmd(date = new Date(), tz = 'UTC') {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const year = parts.find((p) => p.type === 'year')?.value
    const month = parts.find((p) => p.type === 'month')?.value
    const day = parts.find((p) => p.type === 'day')?.value
    if (year && month && day) return `${year}-${month}-${day}`
  } catch (err) {
    logger.error('[contextEngine] Failed to format YMD', err?.message || err)
  }
  return date.toISOString().slice(0, 10)
}

function normalizeDate(value) {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)
  const iso = toIso(value)
  return iso ? iso.slice(0, 10) : null
}

function filterByWorkspace(list = [], workspaceId = null) {
  if (!workspaceId) return list
  return list.filter((item) => !item?.workspaceId || item.workspaceId === workspaceId)
}

function take(list = [], count = 5) {
  if (!Array.isArray(list)) return []
  return list.slice(0, count)
}

// --- scoring utils ---
function normalizeScore(value, min, max) {
  if (value == null || max === min) return 0
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

function daysFromNow(date) {
  if (!date) return null
  const d = date.toDate ? date.toDate() : new Date(date)
  const now = new Date()
  return (d - now) / (1000 * 60 * 60 * 24)
}

// simple text cleanup
function cleanText(str, maxLen = 220) {
  if (!str) return ''
  let s = String(str)
    .replace(/\s+/g, ' ')
    .replace(/```[\s\S]*?```/g, '')
    .trim()
  if (s.length > maxLen) s = s.slice(0, maxLen - 1) + '…'
  return s
}

function scoreTask(task) {
  const now = new Date()
  const due = task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate)) : null
  const daysToDue = due ? (due - now) / (1000 * 60 * 60 * 24) : null

  const priorityWeight = { high: 1, medium: 0.6, low: 0.3 }[task.priority] || 0.4
  const overdueBoost = daysToDue != null && daysToDue < 0 ? 0.5 : 0
  const soonBoost = daysToDue != null && daysToDue >= 0 && daysToDue <= 2 ? 0.3 : 0

  const createdAt = task.createdAt ? (task.createdAt.toDate ? task.createdAt.toDate() : new Date(task.createdAt)) : null
  const ageDays = createdAt ? (now - createdAt) / (1000 * 60 * 60 * 24) : null
  const recencyWeight = ageDays != null ? (ageDays < 1 ? 0.4 : ageDays < 7 ? 0.25 : 0.1) : 0.2

  const base = 0.3
  return base + priorityWeight + overdueBoost + soonBoost + recencyWeight
}

function rankAndSelectTasks(tasks, limit = 8) {
  return tasks
    .map((t) => ({
      ...t,
      _pcScore: scoreTask(t),
      title: cleanText(t.title, 120),
    }))
    .sort((a, b) => b._pcScore - a._pcScore)
    .slice(0, limit)
}

function rankNotes(notes, limit = 12) {
  const now = new Date()
  return (notes || [])
    .map((n) => {
      const created = n.createdAt ? (n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt)) : null
      const ageDays = created ? (now - created) / (1000 * 60 * 60 * 24) : null
      const recency = ageDays != null ? (ageDays < 1 ? 1 : ageDays < 7 ? 0.7 : 0.3) : 0.5
      const tagBoost = (n.tags?.includes('idea') || n.tags?.includes('content')) ? 0.4 : 0
      return {
        ...n,
        _pcScore: recency + tagBoost,
        text: cleanText(n.text, 260),
      }
    })
    .sort((a, b) => b._pcScore - a._pcScore)
    .slice(0, limit)
}

function rankDrafts(drafts, limit = 8) {
  const now = new Date()
  return (drafts || [])
    .map((d) => {
      const scheduled = d.scheduledAt ? (d.scheduledAt.toDate ? d.scheduledAt.toDate() : new Date(d.scheduledAt)) : null
      const daysTo = scheduled ? (scheduled - now) / (1000 * 60 * 60 * 24) : null
      const statusBoost = d.status === 'scheduled' ? 1 : 0.5
      const soonBoost = daysTo != null && daysTo >= 0 && daysTo <= 3 ? 0.4 : 0
      return {
        ...d,
        _pcScore: statusBoost + soonBoost,
        title: cleanText(d.title, 120),
        summary: cleanText(d.summary || d.body, 260),
      }
    })
    .sort((a, b) => b._pcScore - a._pcScore)
    .slice(0, limit)
}

function rankEvents(events, limit = 6) {
  const now = new Date()
  return (events || [])
    .map((e) => {
      const d = e.date ? (e.date.toDate ? e.date.toDate() : new Date(e.date)) : null
      const daysTo = d ? (d - now) / (1000 * 60 * 60 * 24) : null
      const soonBoost = daysTo != null && daysTo >= 0 ? 1 / (1 + daysTo) : 0.1
      const typeBoost = e.type === 'deadline' ? 0.4 : 0
      return {
        ...e,
        _pcScore: soonBoost + typeBoost,
        title: cleanText(e.title, 120),
      }
    })
    .sort((a, b) => b._pcScore - a._pcScore)
    .slice(0, limit)
}

export async function fetchWorkspaceMeta(userId, workspaceId) {
  if (!userId || !workspaceId) return null
  try {
    const db = getDb()
    const ref = db.doc(`users/${userId}/workspaces/${workspaceId}`)
    const snap = await ref.get()
    if (!snap.exists) return null
    const data = snap.data() || {}
    return {
      workspaceId,
      workspaceName: data.name || 'Workspace',
      workspaceType: data.workspaceType || 'personal',
      description: data.description || '',
    }
  } catch (err) {
    logger.error('[contextEngine] fetchWorkspaceMeta failed', err?.message || err)
    return null
  }
}

export async function fetchTasks(userId, workspaceId, options = {}) {
  if (!userId) return { open: [], upcoming: [], overdue: [] }
  const db = getDb()
  const limitCount = options.limit || 40
  const bucketLimit = options.bucketLimit || 10
  const timezone = options.timezone || 'UTC'
  const today = toYmd(new Date(), timezone)
  const tasks = []

  async function queryTasks(path) {
    try {
      const snap = await db
        .collection(path)
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .limit(limitCount)
        .get()
      tasks.push(
        ...snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      )
    } catch (err) {
      logger.error('[contextEngine] task query failed', path, err?.message || err)
    }
  }

  if (workspaceId) {
    await queryTasks(`users/${userId}/workspaces/${workspaceId}/tasks`)
  }
  if (!tasks.length) {
    await queryTasks('tasks')
  }

  const scoped = filterByWorkspace(tasks, workspaceId).map((task) => {
    const due = normalizeDate(task.date || task.dueDate || task.start || task.scheduledTime)
    const priority = (task.priority || task.importance || task.urgency || '').toString().toLowerCase()
    return {
      id: task.id,
      title: task.title || task.text || task.name || 'Task',
      status: task.completed ? 'done' : 'open',
      dueDate: due || null,
      dueDateStr: due || null,
      priority: priority || null,
      category: task.category || task.type || null,
      createdAt: task.createdAt || task.createdAtMs || null,
    }
  })

  const open = scoped.filter((task) => task.status !== 'done' && (!task.dueDate || task.dueDate === today))
  const upcoming = scoped.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate > today)
  const overdue = scoped.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today)

  return {
    open: rankAndSelectTasks(open, bucketLimit),
    upcoming: rankAndSelectTasks(upcoming, bucketLimit),
    overdue: rankAndSelectTasks(overdue, bucketLimit),
  }
}

export async function fetchNapkin(userId, workspaceId, options = {}) {
  if (!userId) return []
  const db = getDb()
  const limitCount = options.limit || 8
  const notes = []

  async function queryNapkin(path) {
    try {
      const snap = await db
        .collection(path)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get()
      notes.push(
        ...snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })),
      )
    } catch (err) {
      logger.error('[contextEngine] napkin query failed', path, err?.message || err)
    }
  }

  if (workspaceId) {
    await queryNapkin(`users/${userId}/workspaces/${workspaceId}/napkin/items`)
  }
  if (!notes.length) {
    await queryNapkin(`napkin/${userId}/items`)
  }

  const scoped = filterByWorkspace(notes, workspaceId)
  const normalized = scoped.map((note) => ({
    id: note.id,
    text: note.text || '',
    tags: Array.isArray(note.tags) ? note.tags : [],
    createdAt: toIso(note.createdAt) || note.createdAt || note.createdAtMs || null,
  }))
  return rankNotes(normalized, limitCount)
}

export async function fetchDrafts(userId, workspaceId, options = {}) {
  if (!userId) return []
  const db = getDb()
  const limitCount = options.limit || 6
  let drafts = []
  try {
    let query = db.collection('creator_drafts').where('userId', '==', userId)
    query = workspaceId ? query.where('workspaceId', '==', workspaceId) : query
    query = query.orderBy('updatedAt', 'desc').limit(limitCount)
    let snap = await query.get()
    if (snap.empty && workspaceId) {
      snap = await db
        .collection('creator_drafts')
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .limit(limitCount * 2)
        .get()
    }
    drafts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    logger.error('[contextEngine] drafts query failed', err?.message || err)
    drafts = []
  }

  const scoped = filterByWorkspace(drafts, workspaceId)
  const normalized = scoped.map((draft) => {
    const scheduledAt = toIso(draft.scheduledAt) || draft.scheduledAt || null
    const updatedAt = toIso(draft.updatedAt) || toIso(draft.createdAt) || null
    return {
      id: draft.id,
      title: draft.title || 'Draft',
      status: draft.status || draft.variant || 'draft',
      scheduledAt,
      scheduledAtStr: scheduledAt,
      platforms: Array.isArray(draft.platforms) ? draft.platforms : draft.tags || [],
      updatedAt,
      summary: draft.summary || draft.body || '',
      body: undefined, // strip heavy fields
    }
  })
  return rankDrafts(normalized, limitCount)
}

export async function fetchEventsIssues(userId, workspaceId, options = {}) {
  if (!userId) return { events: [], issues: [] }
  const db = getDb()
  const limitCount = options.limit || 6
  const now = new Date()
  const events = []
  const issues = []

  async function queryEvents(path) {
    try {
      const snap = await db
        .collection(path)
        .orderBy('start', 'asc')
        .limit(limitCount * 2)
        .get()
      events.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      logger.error('[contextEngine] events query failed', path, err?.message || err)
    }
  }

  async function queryIssues(path) {
    try {
      const snap = await db
        .collection(path)
        .orderBy('updatedAt', 'desc')
        .limit(limitCount * 2)
        .get()
      issues.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (err) {
      logger.error('[contextEngine] issues query failed', path, err?.message || err)
    }
  }

  if (workspaceId) {
    await queryEvents(`leaders/${userId}/events`)
    await queryIssues(`leaders/${userId}/issues`)
  } else {
    await queryEvents(`leaders/${userId}/events`)
    await queryIssues(`leaders/${userId}/issues`)
  }

  const scopedEvents = filterByWorkspace(events, workspaceId)
    .map((event) => {
      const dateIso = toIso(event.start) || toIso(event.startDateTime) || event.date || null
      return {
        id: event.id,
        title: event.title || event.name || 'Event',
        date: dateIso,
        dateStr: dateIso,
        category: event.category || event.type || null,
        type: event.type || null,
      }
    })
    .filter((e) => {
      const d = toDate(e.date || null)
      return d ? d >= now : true
    })

  const scopedIssues = filterByWorkspace(issues, workspaceId)
    .filter((issue) => {
      const status = (issue.status || '').toLowerCase()
      return status !== 'resolved' && status !== 'closed'
    })
    .map((issue) => {
      const dateIso = toIso(issue.updatedAt) || toIso(issue.createdAt) || null
      return {
        id: issue.id,
        title: issue.title || issue.summary || 'Issue',
        category: issue.category || issue.priority || null,
        date: dateIso,
        dateStr: dateIso,
        status: issue.status || 'open',
      }
    })

  return {
    events: rankEvents(scopedEvents, limitCount),
    issues: rankEvents(scopedIssues, limitCount),
  }
}

export async function buildWorkspaceContext(userId, workspaceId, options = {}) {
  const [meta, tasks, napkin, drafts, eventsIssues] = await Promise.all([
    fetchWorkspaceMeta(userId, workspaceId),
    fetchTasks(userId, workspaceId, options.tasks || {}),
    fetchNapkin(userId, workspaceId, options.napkin || {}),
    fetchDrafts(userId, workspaceId, options.drafts || {}),
    fetchEventsIssues(userId, workspaceId, options.events || {}),
  ])

  return {
    workspaceId,
    workspaceName: meta?.workspaceName || 'Workspace',
    workspaceType: meta?.workspaceType || 'personal',
    description: meta?.description || '',
    tasks: tasks || { open: [], upcoming: [], overdue: [] },
    napkin: napkin || [],
    drafts: drafts || [],
    events: eventsIssues?.events || [],
    issues: eventsIssues?.issues || [],
  }
}

export async function searchWorkspaceMemory(userId, workspaceId, query, opts = {}) {
  if (!query || !userId || !workspaceId) return []
  const embedding = await embedText(query)
  if (!embedding.length) return []
  const matches = await searchSimilar(embedding, {
    userId,
    workspaceId,
    topK: opts.topK || 6,
    types: opts.types,
  })
  return matches.map((m) => ({
    id: m.id,
    type: m.type,
    score: m.score,
    title: cleanText(m.metadata?.title || m.metadata?.text || '', 140),
    preview: cleanText(m.metadata?.text || '', 260),
    tags: m.metadata?.tags || [],
    createdAt: m.metadata?.createdAt || null,
  }))
}
