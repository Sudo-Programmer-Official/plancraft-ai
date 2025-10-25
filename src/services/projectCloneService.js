import admin, { db } from '../../server/firebaseAdmin.js'
import { recordTemplateUsage } from './analyticsService.js'

const projectsCollection = (orgId) => db.collection(`orgs/${orgId}/projects`)
const projectTasksCollection = (orgId, projectId) =>
  db.collection(`orgs/${orgId}/projects/${projectId}/tasks`)
const templatesCollection = (orgId) => db.collection(`orgs/${orgId}/templates`)

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (value?.toDate) {
    try {
      return value.toDate()
    } catch {}
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function clampProgress(value) {
  if (typeof value !== 'number') return null
  return Math.min(100, Math.max(0, Math.round(value)))
}

function computeDueOffsetDays(dueDate, reference = new Date()) {
  const date = toDate(dueDate)
  if (!date) return null
  const diffMs = date.getTime() - reference.getTime()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
}

async function readProjectSnapshot(orgId, projectId) {
  const projectRef = projectsCollection(orgId).doc(projectId)
  const projectSnap = await projectRef.get()
  if (!projectSnap.exists) {
    const err = new Error('Project not found')
    err.status = 404
    throw err
  }

  const tasksSnap = await projectTasksCollection(orgId, projectId).get()
  const tasks = tasksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  return {
    ref: projectRef,
    data: projectSnap.data(),
    tasks,
  }
}

function normalizeTaskForTemplate(task) {
  const dueOffset = typeof task.dueOffsetDays === 'number' && Number.isFinite(task.dueOffsetDays)
    ? Math.round(task.dueOffsetDays)
    : computeDueOffsetDays(task.dueDate || task.due || null)
  return {
    title: task.title || 'Untitled task',
    description: task.description || '',
    status: task.status === 'completed' ? 'completed' : 'pending',
    assignedTo: task.assignedTo || null,
    assignees: Array.isArray(task.assignees) ? task.assignees : [],
    dueOffsetDays: dueOffset,
    metadata: task.metadata && typeof task.metadata === 'object' ? task.metadata : {},
    progress: clampProgress(task.progress),
    lastNote: task.lastNote || null,
  }
}

function buildTemplateDocument({
  orgId,
  payload,
  project,
  tasks,
  createdBy,
}) {
  const now = new Date()
  const {
    name,
    summary = '',
    type = 'general',
    industry = 'general',
    tags = [],
  } = payload

  return {
    orgId,
    name: name || `${project?.name || 'Project'} template`,
    summary,
    type,
    industry,
    tags: Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    basedOnProject: project
      ? {
        id: project.id || null,
        name: project.name || null,
        status: project.status || null,
      }
      : null,
    defaultProject: project
      ? {
        status: project.status || 'active',
        leadUid: project.leadUid || null,
        defaultAssignees: Array.isArray(project.defaultAssignees)
          ? project.defaultAssignees
          : [],
      }
      : {},
    tasks: tasks.map(normalizeTaskForTemplate),
    usageCount: 0,
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy || null,
  }
}

export async function saveTemplateFromProject({
  orgId,
  projectId,
  template,
  createdBy,
}) {
  if (!orgId || !projectId) {
    throw new Error('Missing orgId or projectId')
  }

  const { data: projectData, tasks } = await readProjectSnapshot(orgId, projectId)
  const templateDoc = buildTemplateDocument({
    orgId,
    payload: template,
    project: { id: projectId, ...projectData },
    tasks,
    createdBy,
  })

  const ref = await templatesCollection(orgId).add(templateDoc)
  return { id: ref.id, ...templateDoc }
}

export async function createTemplate({
  orgId,
  template,
  createdBy,
}) {
  if (!orgId) throw new Error('Missing orgId')
  const doc = buildTemplateDocument({
    orgId,
    payload: template,
    project: null,
    tasks: Array.isArray(template.tasks) ? template.tasks : [],
    createdBy,
  })
  const ref = await templatesCollection(orgId).add(doc)
  return { id: ref.id, ...doc }
}

export async function cloneTemplateToProject({
  orgId,
  templateId,
  overrides = {},
  createdBy,
}) {
  if (!orgId || !templateId) throw new Error('Missing orgId or templateId')

  const templateRef = templatesCollection(orgId).doc(templateId)
  const templateSnap = await templateRef.get()
  if (!templateSnap.exists) {
    const err = new Error('Template not found')
    err.status = 404
    throw err
  }

  const template = templateSnap.data()
  const now = new Date()
  const projectPayload = {
    name: overrides.name || template.name || 'New Project',
    key: overrides.key || (template.defaultProject?.key ?? (template.name || 'NP').slice(0, 3).toUpperCase()),
    status: overrides.status || template.defaultProject?.status || 'active',
    leadUid: overrides.leadUid || template.defaultProject?.leadUid || null,
    defaultAssignees: overrides.defaultAssignees || template.defaultProject?.defaultAssignees || [],
    createdAt: now,
    updatedAt: now,
    createdBy,
    templateId,
  }

  const projectRef = await projectsCollection(orgId).add(projectPayload)
  const projectId = projectRef.id

  const tasks = Array.isArray(template.tasks) ? template.tasks : []
  const batch = db.batch()
  tasks.forEach((task, index) => {
    const taskRef = projectTasksCollection(orgId, projectId).doc()
    const dueDate =
      typeof task.dueOffsetDays === 'number'
        ? admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + task.dueOffsetDays * 24 * 60 * 60 * 1000),
          )
        : null

    batch.set(taskRef, {
      title: task.title || `Task ${index + 1}`,
      description: task.description || '',
      status: task.status === 'completed' ? 'completed' : 'pending',
      assignedTo: task.assignedTo || null,
      assignees: Array.isArray(task.assignees) ? task.assignees : [],
      dueDate,
      metadata: task.metadata && typeof task.metadata === 'object' ? task.metadata : {},
      progress: clampProgress(task.progress),
      lastNote: task.lastNote || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      projectId,
      teamId: orgId,
      createdBy: createdBy || null,
      lastUpdatedBy: createdBy || null,
      lastUpdateAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  })

  batch.set(
    templateRef,
    {
      usageCount: admin.firestore.FieldValue.increment(1),
      lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  await batch.commit()

  await recordTemplateUsage({
    orgId,
    templateId,
    type: template.type || 'general',
    industry: template.industry || 'general',
  }).catch((err) => {
    console.warn('[projectCloneService] Failed to record template usage', err)
  })

  return {
    projectId,
    project: { id: projectId, ...projectPayload },
    tasksCount: tasks.length,
  }
}

export async function listTemplates(orgId, { type, industry } = {}) {
  if (!orgId) throw new Error('Missing orgId')
  let ref = templatesCollection(orgId)
  if (type) {
    ref = ref.where('type', '==', type)
  }
  if (industry) {
    ref = ref.where('industry', '==', industry)
  }
  ref = ref.orderBy('updatedAt', 'desc')
  const snap = await ref.limit(100).get()
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

export async function updateTemplate({ orgId, templateId, updates }) {
  if (!orgId || !templateId) throw new Error('Missing orgId or templateId')
  const ref = templatesCollection(orgId).doc(templateId)
  const snap = await ref.get()
  if (!snap.exists) {
    const err = new Error('Template not found')
    err.status = 404
    throw err
  }

  const payload = {
    ...updates,
    updatedAt: new Date(),
  }
  await ref.set(payload, { merge: true })
  const fresh = await ref.get()
  return { id: templateId, ...fresh.data() }
}

export async function deleteTemplate({ orgId, templateId }) {
  if (!orgId || !templateId) throw new Error('Missing orgId or templateId')
  await templatesCollection(orgId).doc(templateId).delete()
  return { ok: true }
}

export default {
  saveTemplateFromProject,
  createTemplate,
  cloneTemplateToProject,
  listTemplates,
  updateTemplate,
  deleteTemplate,
}
