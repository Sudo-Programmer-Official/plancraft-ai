import { Router } from 'express'
import { verifyAuth } from '../utils/auth.js'
import {
  socialConnect,
  socialCallback,
  socialStatus,
  socialDisconnect,
  socialPost,
  setWorkspaceSocialEnabled,
} from '../controllers/socialUnifiedController.js'
import { getSocialStatus, disconnectSocial } from '../controllers/socialController.js'

const router = Router()

// Legacy status/disconnect (kept for back-compat)
router.get('/social/status', verifyAuth, getSocialStatus)
router.post('/social/disconnect/:platform', verifyAuth, disconnectSocial)

// Unified social routes
router.get('/social/:provider/connect', verifyAuth, socialConnect)
router.get('/social/:provider/callback', socialCallback)
router.get('/social/:provider/status', verifyAuth, socialStatus)
router.post('/social/:provider/disconnect', verifyAuth, socialDisconnect)
router.post('/social/:provider/post', verifyAuth, socialPost)
router.post('/social/workspace-enabled', verifyAuth, setWorkspaceSocialEnabled)

export default router
