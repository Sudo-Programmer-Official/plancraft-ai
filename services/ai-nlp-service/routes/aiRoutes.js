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
import { summarizeWorkspace, workspaceInspiration } from '../controllers/workspaceController.js'
import { deleteMemory, searchWorkspaceMemory, upsertMemory } from '../controllers/memoryController.js'
import { getForwardPulse, getMemoryPulse, getTodayPulse } from '../controllers/pulseController.js'

const router = Router()

// OCR and structured extraction
router.post('/ocr', ocrImage)
router.post('/extract-event', extractEvent)

// Workspace-aware AI
router.post('/workspace/summary', summarizeWorkspace)
router.post('/workspace/inspiration', workspaceInspiration)
router.post('/workspace/search', searchWorkspaceMemory)

// Vector memory maintenance
router.post('/memory/upsert', upsertMemory)
router.post('/memory/delete', deleteMemory)

// Pulse V2
router.post('/workspace/pulse/today', getTodayPulse)
router.post('/workspace/pulse/memory', getMemoryPulse)
router.post('/workspace/pulse/forward', getForwardPulse)

// Content generation
router.post('/generate/hook', generateHook)
router.post('/generate/repurpose', generateRepurpose)
router.post('/generate/reel-script', generateReelScript)
router.post('/generate/story-frame', generateStoryFrame)
router.post('/generate/linkedin-post', generateLinkedInPost)
router.post('/generate/tweet-thread', generateTweetThread)
router.post('/generate/outreach-message', generateOutreachMessage)

export default router
