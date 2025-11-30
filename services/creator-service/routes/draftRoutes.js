import { Router } from 'express'
import {
  getDrafts,
  postDraft,
  putDraft,
  removeDraft,
  getInspiration,
  postInspiration,
} from '../controllers/draftController.js'

const router = Router()

router.get('/drafts', getDrafts)
router.post('/drafts', postDraft)
router.patch('/drafts/:id', putDraft)
router.delete('/drafts/:id', removeDraft)

router.get('/inspiration', getInspiration)
router.post('/inspiration', postInspiration)

export default router
