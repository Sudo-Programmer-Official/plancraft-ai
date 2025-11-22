import { proxyAi } from '../services/aiClient.js'
import { logAiOutput } from '../firestore/aiOutputsRepository.js'

async function handle(type, req, res, next) {
  try {
    const payload = req.body || {}
    const data = await proxyAi(type, payload)
    try {
      await logAiOutput({
        input: payload,
        output: data,
        type,
        userId: req.user?.uid,
      })
    } catch {}
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const generateHook = (req, res, next) => handle('hook', req, res, next)
export const generateRepurpose = (req, res, next) => handle('repurpose', req, res, next)
export const generateReelScript = (req, res, next) => handle('reel_script', req, res, next)
export const generateStoryFrames = (req, res, next) => handle('story_frames', req, res, next)
export const generateThread = (req, res, next) => handle('thread', req, res, next)
export const generateLinkedInPost = (req, res, next) => handle('linkedin_post', req, res, next)
