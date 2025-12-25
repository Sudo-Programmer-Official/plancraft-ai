import { Router } from 'express'
import { runAutopilotDrafts } from '../controllers/autopilotController.js'

const router = Router()

router.post('/autopilot/run', runAutopilotDrafts)

export default router
