import { Router } from 'express'
import {
  generateHook,
  generateRepurpose,
  generateReelScript,
  generateStoryFrame,
  generateLinkedInPost,
  generateTweetThread,
  generateOutreachMessage,
} from '../controllers/aiController.js'

const router = Router()

router.post('/generate/hook', generateHook)
router.post('/generate/repurpose', generateRepurpose)
router.post('/generate/reel-script', generateReelScript)
router.post('/generate/story-frame', generateStoryFrame)
router.post('/generate/linkedin-post', generateLinkedInPost)
router.post('/generate/tweet-thread', generateTweetThread)
router.post('/generate/outreach-message', generateOutreachMessage)

export default router
