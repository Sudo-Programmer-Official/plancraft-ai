import express from 'express'
import withOrgAuth from './middlewares/withOrgAuth.js'
import { db } from '../../../server/firebaseAdmin.js'
import {
  saveTemplateFromProject,
  cloneTemplateToProject,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../../services/projectCloneService.js'
import { getTemplateSuggestions } from '../../services/aiSuggestService.js'

const router = express.Router({ mergeParams: true })

router.use(withOrgAuth)

function ensureAdmin(req, res) {
  const role = String(req.orgRole || '').toLowerCase()
  if (!['owner', 'admin'].includes(role)) {
    res.status(403).json({ error: 'Requires admin or owner role' })
    return false
  }
  return true
}

const templatesCollection = (orgId) => db.collection(`orgs/${orgId}/templates`)

function sanitizeTasks(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((task) => ({
      title: String(task?.title || '').trim() || 'Untitled task',
      description: String(task?.description || ''),
      status: task?.status === 'completed' ? 'completed' : 'pending',
      assignedTo: task?.assignedTo || null,
      assignees: Array.isArray(task?.assignees) ? task.assignees : [],
      dueOffsetDays:
        typeof task?.dueOffsetDays === 'number' && Number.isFinite(task?.dueOffsetDays)
          ? Math.round(task.dueOffsetDays)
          : null,
      metadata: task?.metadata && typeof task.metadata === 'object' ? task.metadata : {},
      progress:
        typeof task?.progress === 'number' && Number.isFinite(task.progress)
          ? Math.min(100, Math.max(0, Math.round(task.progress)))
          : null,
      lastNote: task?.lastNote || null,
    }))
}

router.get('/', async (req, res) => {
  try {
    const { orgId } = req.params
    const { type = null, industry = null } = req.query || {}

    let ref = templatesCollection(orgId).orderBy('updatedAt', 'desc')
    if (type) ref = ref.where('type', '==', String(type))
    if (industry) ref = ref.where('industry', '==', String(industry))

    const snap = await ref.limit(50).get()
    const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    res.json(list)
  } catch (err) {
    console.error('GET /api/orgs/:orgId/templates error', err)
    res.status(500).json({ error: 'Failed to load templates' })
  }
})

router.get('/suggestions', async (req, res) => {
  try {
    const { orgId } = req.params
    const { type = null, industry = null, limit = 5 } = req.query || {}
    const suggestions = await getTemplateSuggestions({
      orgId,
      limit: Number(limit) || 5,
      filters: { type, industry },
    })
    res.json(suggestions)
  } catch (err) {
    console.error('GET /api/orgs/:orgId/templates/suggestions error', err)
    res.status(500).json({ error: 'Failed to load template suggestions' })
  }
})

router.post('/', async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return
    const { orgId } = req.params
    const { name, summary, type, industry, tags = [], tasks = [] } = req.body || {}

    if (!name) return res.status(400).json({ error: 'Missing template name' })

    const template = await createTemplate({
      orgId,
      createdBy: req.user?.uid || null,
      template: { name, summary, type, industry, tags, tasks: sanitizeTasks(tasks) },
    })

    res.status(201).json(template)
  } catch (err) {
    console.error('POST /api/orgs/:orgId/templates error', err)
    res.status(500).json({ error: 'Failed to create template' })
  }
})

router.post('/from-project', async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return
    const { orgId } = req.params
    const { projectId, name, summary = '', type = 'general', industry = 'general', tags = [] } = req.body || {}
    if (!projectId) return res.status(400).json({ error: 'Missing projectId' })
    if (!name) return res.status(400).json({ error: 'Missing template name' })

    const template = await saveTemplateFromProject({
      orgId,
      projectId,
      createdBy: req.user?.uid || null,
      template: { name, summary, type, industry, tags },
    })

    res.status(201).json(template)
  } catch (err) {
    console.error('POST /api/orgs/:orgId/templates/from-project error', err)
    const status = err?.status || 500
    res.status(status).json({ error: err?.message || 'Failed to save template' })
  }
})

router.post('/:templateId/instantiate', async (req, res) => {
  try {
    const { orgId, templateId } = req.params
    const { name, key, status, leadUid, defaultAssignees } = req.body || {}

    const result = await cloneTemplateToProject({
      orgId,
      templateId,
      createdBy: req.user?.uid || null,
      overrides: { name, key, status, leadUid, defaultAssignees },
    })

    res.status(201).json(result)
  } catch (err) {
    console.error('POST /api/orgs/:orgId/templates/:templateId/instantiate error', err)
    const status = err?.status || 500
    res.status(status).json({ error: err?.message || 'Failed to create project from template' })
  }
})

router.patch('/:templateId', async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return
    const { orgId, templateId } = req.params
    const allowed = ['name', 'summary', 'type', 'industry', 'tags', 'tasks']
    const updates = {}
    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
        updates[key] = req.body[key]
      }
    })
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }
    if (updates.tasks) {
      updates.tasks = sanitizeTasks(updates.tasks)
    }

    const updated = await updateTemplate({ orgId, templateId, updates })
    res.json(updated)
  } catch (err) {
    console.error('PATCH /api/orgs/:orgId/templates/:templateId error', err)
    const status = err?.status || 500
    res.status(status).json({ error: err?.message || 'Failed to update template' })
  }
})

router.delete('/:templateId', async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return
    const { orgId, templateId } = req.params
    await deleteTemplate({ orgId, templateId })
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/orgs/:orgId/templates/:templateId error', err)
    const status = err?.status || 500
    res.status(status).json({ error: err?.message || 'Failed to delete template' })
  }
})

export default router
