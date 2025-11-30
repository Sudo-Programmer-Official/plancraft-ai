import { Router } from 'express'
import { verifyAuth } from '../utils/auth.js'
import { getSocialStatus, disconnectSocial } from '../controllers/socialController.js'

const router = Router()

router.get('/social/status', verifyAuth, getSocialStatus)
router.post('/social/disconnect/:platform', verifyAuth, disconnectSocial)

export default router
