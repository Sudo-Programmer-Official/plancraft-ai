import { Router } from 'express'
import { verifyAuth } from '../utils/auth.js'
import {
  startLinkedInAuth,
  handleLinkedInCallback,
  refreshLinkedInToken,
  postLinkedIn,
} from '../controllers/linkedinController.js'

const router = Router()

// Auth initiation (requires signed-in user)
router.get('/auth/linkedin', verifyAuth, startLinkedInAuth)
// OAuth callback (public; state token protects it)
router.get('/auth/linkedin/callback', handleLinkedInCallback)
// Refresh token
router.post('/auth/linkedin/refresh', verifyAuth, refreshLinkedInToken)
// Post content to LinkedIn for the current user
router.post('/post/linkedin', verifyAuth, postLinkedIn)

export default router
