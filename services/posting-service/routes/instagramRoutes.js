import { Router } from 'express'
import { verifyAuth } from '../utils/auth.js'
import { startInstagramAuth, handleInstagramAuthCallback, postInstagram } from '../controllers/instagramController.js'

const router = Router()

router.get('/auth/instagram', verifyAuth, startInstagramAuth)
router.get('/auth/instagram/callback', handleInstagramAuthCallback)
router.get('/social/instagram/connect', verifyAuth, startInstagramAuth)
router.get('/social/instagram/callback', handleInstagramAuthCallback)
router.post('/post/instagram', verifyAuth, postInstagram)

export default router
