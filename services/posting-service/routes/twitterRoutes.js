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
router.post('/auth/twitter/refresh', verifyAuth, refreshTwitterToken)
router.post('/post/twitter', verifyAuth, postTwitter)

export default router
