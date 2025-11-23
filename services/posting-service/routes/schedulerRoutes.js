import { Router } from 'express'
import { runScheduler } from '../controllers/schedulerController.js'

const router = Router()

router.get('/scheduler/run', runScheduler)

export default router
