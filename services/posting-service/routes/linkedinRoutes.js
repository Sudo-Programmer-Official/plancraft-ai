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
// Alias for new unified social path
router.get('/social/linkedin/connect', verifyAuth, startLinkedInAuth)
// OAuth callback (public; state token protects it)
router.get('/auth/linkedin/callback', handleLinkedInCallback)
// Alias callback for unified path
router.get('/social/linkedin/callback', handleLinkedInCallback)
// Refresh token
router.post('/auth/linkedin/refresh', verifyAuth, refreshLinkedInToken)
// Post content to LinkedIn for the current user
router.post('/post/linkedin', verifyAuth, postLinkedIn)

export default router
