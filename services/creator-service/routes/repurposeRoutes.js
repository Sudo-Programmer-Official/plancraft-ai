import { Router } from 'express'
import { runRepurpose, saveRepurpose } from '../controllers/repurposeController.js'

const router = Router()

router.post('/repurpose/run', runRepurpose)
router.post('/repurpose/save', saveRepurpose)
router.post('/repurpose', runRepurpose)

export default router
