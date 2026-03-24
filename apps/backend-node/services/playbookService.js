import { db } from './firebaseAdmin.js'
import { getFeatureUsageStatus } from './planService.js'

export const PLAYBOOK_COLLECTION = 'playbooks'
export const PLAYBOOK_STEP_COLLECTION = 'steps'

function normalizeDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function serializeTimestamp(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate().toISOString()
    } catch {
      return null
    }
  }
  const date = normalizeDate(value)
  return date ? date.toISOString() : null
}

function sanitizeTitle(value) {
  return String(value || '').trim()
}

function buildProgress(steps = []) {
  const total = Array.isArray(steps) ? steps.length : 0
  const completed = (steps || []).filter((step) => step?.completed === true).length
  return { total, completed }
}

async function getPlaybookSnapshot(playbookId) {
  return db.collection(PLAYBOOK_COLLECTION).doc(String(playbookId || '')).get()
}

async function ensurePlaybookOwner(playbookId, userId) {
  const snap = await getPlaybookSnapshot(playbookId)
  if (!snap.exists) {
    const error = new Error('Playbook not found')
    error.statusCode = 404
    throw error
  }
  const data = snap.data() || {}
  if (String(data.userId || '') !== String(userId || '')) {
    const error = new Error('Forbidden')
    error.statusCode = 403
    throw error
  }
  return { id: snap.id, ...data }
}

export async function listPlaybookSteps(playbookId) {
  const snap = await db
    .collection(PLAYBOOK_STEP_COLLECTION)
    .where('playbookId', '==', String(playbookId || ''))
    .get()

  return snap.docs
    .map((doc) => {
      const data = doc.data() || {}
      return {
        id: doc.id,
        playbookId: data.playbookId,
        title: data.title || '',
        order: Number.isFinite(Number(data.order)) ? Number(data.order) : 0,
        completed: data.completed === true,
        dueDate: serializeTimestamp(data.dueDate),
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      }
    })
    .sort((a, b) => a.order - b.order || String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
}

export async function listPlaybooks(userId) {
  const snap = await db.collection(PLAYBOOK_COLLECTION).where('userId', '==', String(userId || '')).get()
  const rows = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data() || {}
      const steps = await listPlaybookSteps(doc.id)
      return {
        id: doc.id,
        userId: data.userId,
        name: data.name || 'Untitled playbook',
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt),
        progress: buildProgress(steps),
      }
    }),
  )

  return rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
}

export async function getPlaybookDetail(userId, playbookId) {
  const playbook = await ensurePlaybookOwner(playbookId, userId)
  const steps = await listPlaybookSteps(playbookId)
  return {
    playbook: {
      id: playbook.id,
      userId: playbook.userId,
      name: playbook.name || 'Untitled playbook',
      createdAt: serializeTimestamp(playbook.createdAt),
      updatedAt: serializeTimestamp(playbook.updatedAt),
      progress: buildProgress(steps),
    },
    steps,
  }
}

export async function createPlaybook(userId, payload = {}) {
  const name = sanitizeTitle(payload.name)
  if (!name) {
    const error = new Error('Playbook name is required')
    error.statusCode = 400
    throw error
  }

  const usageStatus = await getFeatureUsageStatus(userId, 'playbooks')
  if (usageStatus.atLimit) {
    const limit = usageStatus.limit ?? 0
    const error = new Error(`You’ve reached your free limit (${limit} playbooks). Upgrade your account on our website to continue.`)
    error.statusCode = 403
    error.code = 'playbook_limit_reached'
    error.details = usageStatus
    throw error
  }

  const steps = Array.isArray(payload.steps) ? payload.steps : []
  const now = new Date()
  const playbookRef = db.collection(PLAYBOOK_COLLECTION).doc()
  const batch = db.batch()

  batch.set(playbookRef, {
    userId: String(userId || ''),
    name,
    createdAt: now,
    updatedAt: now,
  })

  steps.forEach((step, index) => {
    const title = sanitizeTitle(step?.title)
    if (!title) return
    const stepRef = db.collection(PLAYBOOK_STEP_COLLECTION).doc()
    batch.set(stepRef, {
      playbookId: playbookRef.id,
      userId: String(userId || ''),
      title,
      order: index,
      completed: false,
      dueDate: normalizeDate(step?.dueDate),
      createdAt: now,
      updatedAt: now,
    })
  })

  await batch.commit()
  return getPlaybookDetail(userId, playbookRef.id)
}

export async function addPlaybookStep(userId, playbookId, payload = {}) {
  await ensurePlaybookOwner(playbookId, userId)
  const title = sanitizeTitle(payload.title)
  if (!title) {
    const error = new Error('Step title is required')
    error.statusCode = 400
    throw error
  }

  const existingSteps = await listPlaybookSteps(playbookId)
  const nextOrder =
    existingSteps.length > 0 ? Math.max(...existingSteps.map((step) => Number(step.order || 0))) + 1 : 0
  const now = new Date()
  const stepRef = db.collection(PLAYBOOK_STEP_COLLECTION).doc()

  await stepRef.set({
    playbookId: String(playbookId || ''),
    userId: String(userId || ''),
    title,
    order: nextOrder,
    completed: payload.completed === true,
    dueDate: normalizeDate(payload.dueDate),
    createdAt: now,
    updatedAt: now,
  })

  await db.collection(PLAYBOOK_COLLECTION).doc(String(playbookId || '')).set(
    {
      updatedAt: now,
    },
    { merge: true },
  )

  return getPlaybookDetail(userId, playbookId)
}

export async function updatePlaybookStep(userId, playbookId, stepId, payload = {}) {
  await ensurePlaybookOwner(playbookId, userId)
  const stepRef = db.collection(PLAYBOOK_STEP_COLLECTION).doc(String(stepId || ''))
  const snap = await stepRef.get()
  if (!snap.exists) {
    const error = new Error('Step not found')
    error.statusCode = 404
    throw error
  }

  const current = snap.data() || {}
  if (String(current.playbookId || '') !== String(playbookId || '') || String(current.userId || '') !== String(userId || '')) {
    const error = new Error('Forbidden')
    error.statusCode = 403
    throw error
  }

  const next = {
    updatedAt: new Date(),
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
    const title = sanitizeTitle(payload.title)
    if (!title) {
      const error = new Error('Step title is required')
      error.statusCode = 400
      throw error
    }
    next.title = title
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'completed')) {
    next.completed = payload.completed === true
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'order')) {
    next.order = Number.isFinite(Number(payload.order)) ? Number(payload.order) : current.order || 0
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'dueDate')) {
    next.dueDate = normalizeDate(payload.dueDate)
  }

  await stepRef.set(next, { merge: true })
  await db.collection(PLAYBOOK_COLLECTION).doc(String(playbookId || '')).set(
    {
      updatedAt: new Date(),
    },
    { merge: true },
  )

  return getPlaybookDetail(userId, playbookId)
}
