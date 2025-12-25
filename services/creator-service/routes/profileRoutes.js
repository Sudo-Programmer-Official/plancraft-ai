import { Router } from 'express'
import { getProfile, upsertProfile } from '../controllers/profileController.js'

const router = Router()

router.get('/profile', getProfile)
router.post('/profile', upsertProfile)

export default router
