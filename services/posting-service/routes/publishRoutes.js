import { Router } from 'express'
import { publishContent, processScheduled } from '../controllers/publishController.js'

const router = Router()

router.post('/publish', publishContent)
router.post('/cron/publish-now', processScheduled)

export default router
