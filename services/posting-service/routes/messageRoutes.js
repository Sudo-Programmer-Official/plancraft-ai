import { Router } from 'express'
import { sendNow, schedule } from '../controllers/messageController.js'

const router = Router()

router.post('/messages/send-now', sendNow)
router.post('/messages/schedule', schedule)

export default router
