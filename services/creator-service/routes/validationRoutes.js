import { Router } from 'express'
import { validatePostDraft } from '../controllers/validationController.js'

const router = Router()

router.post('/posts/validate', validatePostDraft)

export default router
