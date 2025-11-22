import { Router } from 'express'
import {
  generateHook,
  generateRepurpose,
  generateReelScript,
  generateStoryFrames,
  generateThread,
  generateLinkedInPost,
} from '../controllers/aiController.js'

const router = Router()

router.post('/hook', generateHook)
router.post('/repurpose', generateRepurpose)
router.post('/reel-script', generateReelScript)
router.post('/story-frames', generateStoryFrames)
router.post('/thread', generateThread)
router.post('/linkedin-post', generateLinkedInPost)

export default router
