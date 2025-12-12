import { Router } from 'express'
import { verifyAuth } from '../utils/auth.js'
import {
  startTwitterAuth,
  handleTwitterCallback,
  refreshTwitterToken,
  postTwitter,
} from '../controllers/twitterController.js'

const router = Router()

router.get('/auth/twitter', verifyAuth, startTwitterAuth)
router.get('/auth/twitter/callback', handleTwitterCallback)
// Aliases for unified social path
router.get('/social/twitter/connect', verifyAuth, startTwitterAuth)
router.get('/social/twitter/callback', handleTwitterCallback)
router.post('/auth/twitter/refresh', verifyAuth, refreshTwitterToken)
router.post('/post/twitter', verifyAuth, postTwitter)

export default router
