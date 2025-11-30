import { Router } from 'express'
import { publish, schedule } from '../controllers/publishController.js'

const router = Router()

router.post('/publish', publish)
router.post('/publish/schedule', schedule)

export default router
