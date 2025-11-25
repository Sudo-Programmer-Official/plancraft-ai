import { Router } from 'express'
import {
  generateHook,
  generateRepurpose,
  generateReelScript,
  generateStoryFrame,
  generateLinkedInPost,
  generateTweetThread,
  generateOutreachMessage,
  ocrImage,
  extractEvent,
} from '../controllers/aiController.js'

const router = Router()

// OCR and structured extraction
router.post('/ocr', ocrImage)
router.post('/extract-event', extractEvent)

// Content generation
router.post('/generate/hook', generateHook)
router.post('/generate/repurpose', generateRepurpose)
router.post('/generate/reel-script', generateReelScript)
router.post('/generate/story-frame', generateStoryFrame)
router.post('/generate/linkedin-post', generateLinkedInPost)
router.post('/generate/tweet-thread', generateTweetThread)
router.post('/generate/outreach-message', generateOutreachMessage)

export default router
