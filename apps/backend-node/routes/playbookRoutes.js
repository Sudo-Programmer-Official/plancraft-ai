import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  addPlaybookStep,
  createPlaybook,
  getPlaybookDetail,
  listPlaybooks,
  updatePlaybookStep,
} from '../services/playbookService.js'

const router = express.Router()

router.get('/playbooks', requireAuth, async (req, res) => {
  try {
    const playbooks = await listPlaybooks(req.user.uid)
    return res.json({ playbooks })
  } catch (error) {
    console.error('[Playbooks] list failed', error?.message || error)
    return res.status(error?.statusCode || 500).json({ error: error?.message || 'Failed to load playbooks' })
  }
})

router.post('/playbooks', requireAuth, async (req, res) => {
  try {
    const payload = await createPlaybook(req.user.uid, req.body || {})
    return res.status(201).json(payload)
  } catch (error) {
    console.error('[Playbooks] create failed', error?.message || error)
    return res.status(error?.statusCode || 500).json({ error: error?.message || 'Failed to create playbook' })
  }
})

router.get('/playbooks/:playbookId', requireAuth, async (req, res) => {
  try {
    const payload = await getPlaybookDetail(req.user.uid, req.params.playbookId)
    return res.json(payload)
  } catch (error) {
    console.error('[Playbooks] detail failed', error?.message || error)
    return res.status(error?.statusCode || 500).json({ error: error?.message || 'Failed to load playbook' })
  }
})

router.post('/playbooks/:playbookId/steps', requireAuth, async (req, res) => {
  try {
    const payload = await addPlaybookStep(req.user.uid, req.params.playbookId, req.body || {})
    return res.status(201).json(payload)
  } catch (error) {
    console.error('[Playbooks] add step failed', error?.message || error)
    return res.status(error?.statusCode || 500).json({ error: error?.message || 'Failed to add step' })
  }
})

router.patch('/playbooks/:playbookId/steps/:stepId', requireAuth, async (req, res) => {
  try {
    const payload = await updatePlaybookStep(req.user.uid, req.params.playbookId, req.params.stepId, req.body || {})
    return res.json(payload)
  } catch (error) {
    console.error('[Playbooks] update step failed', error?.message || error)
    return res.status(error?.statusCode || 500).json({ error: error?.message || 'Failed to update step' })
  }
})

export default router
