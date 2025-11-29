import { Router } from 'express'
import { sendNow, schedule, getMessageStats } from '../controllers/messageController.js'

const router = Router()

router.post('/messages/send-now', sendNow)
router.post('/messages/schedule', schedule)
router.get('/messages/stats', getMessageStats)

export default router
