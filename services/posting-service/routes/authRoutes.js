import { Router } from 'express'
import { getTokens, saveTokens } from '../controllers/authController.js'

const router = Router()

router.get('/:userId', getTokens)
router.post('/:userId', saveTokens)

export default router
