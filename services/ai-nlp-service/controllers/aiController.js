import { runLlm } from '../services/llmClient.js'
import {
  HOOK_TEMPLATE,
  REPURPOSE_TEMPLATE,
  REEL_SCRIPT_TEMPLATE,
  STORY_FRAME_TEMPLATE,
  LINKEDIN_POST_TEMPLATE,
  TWEET_THREAD_TEMPLATE,
  OUTREACH_TEMPLATE,
  EXTRACT_EVENT_TEMPLATE,
} from '../services/aiTemplates.js'
import { logAi } from '../firestore/aiLogsRepository.js'
import { embedTexts } from '../services/embeddings.js'

async function handle(type, template, req, res, next) {
  try {
    const input = req.body?.input || ''
    const userId = req.user?.uid || 'anon'
    const workspaceId =
      req.headers['x-workspace-id'] || req.body?.workspaceId || req.query?.workspaceId || null
    const output = await runLlm(template, input)
    console.log('LLM output:', output)

    try { await logAi({ userId, workspaceId, type, input, output }) } catch {}
    res.json({ success: true, output, workspaceId })
  } catch (err) {
    console.error('Error in AI controller:', err)
    next(err)
  }
}

export const generateHook = (req, res, next) => handle('hook', HOOK_TEMPLATE, req, res, next)
export const generateRepurpose = (req, res, next) => handle('repurpose', REPURPOSE_TEMPLATE, req, res, next)
export const generateReelScript = (req, res, next) => handle('reel_script', REEL_SCRIPT_TEMPLATE, req, res, next)
export const generateStoryFrame = (req, res, next) => handle('story_frame', STORY_FRAME_TEMPLATE, req, res, next)
export const generateLinkedInPost = (req, res, next) => handle('linkedin_post', LINKEDIN_POST_TEMPLATE, req, res, next)
export const generateTweetThread = (req, res, next) => handle('tweet_thread', TWEET_THREAD_TEMPLATE, req, res, next)
export const generateOutreachMessage = (req, res, next) => handle('outreach_message', OUTREACH_TEMPLATE, req, res, next)

// OCR and structured event extraction (stub + LLM assisted)
export async function ocrImage(req, res, next) {
  try {
    // For now, accept text directly or base64 image string and return stubbed text.
    const text = req.body?.text || '(ocr-placeholder)'
    res.json({ success: true, text })
  } catch (err) {
    next(err)
  }
}

export async function extractEvent(req, res, next) {
  try {
    const input = req.body?.text || ''
    const output = await runLlm(EXTRACT_EVENT_TEMPLATE, input || 'Extract event details from this text.')
    try { await logAi({ userId: req.user?.uid || 'anon', type: 'extract_event', input, output }) } catch {}
    res.json({ success: true, output })
  } catch (err) {
    next(err)
  }
}

export async function embedTextsHandler(req, res, next) {
  try {
    const texts = req.body?.texts
    if (!Array.isArray(texts) || !texts.length) {
      return res.status(400).json({ success: false, error: 'texts[] is required' })
    }
    const embeddings = await embedTexts(texts)
    res.json({ success: true, embeddings })
  } catch (err) {
    next(err)
  }
}
