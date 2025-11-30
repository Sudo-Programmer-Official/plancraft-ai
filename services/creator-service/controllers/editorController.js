import { proxyAi } from '../services/aiClient.js'
import { saveContent } from '../firestore/contentRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

async function generate(type, req, res, next) {
  try {
    const data = await proxyAi(type, req.body || {})
    res.json({ success: true, ...data })
  } catch (err) {
    next(err)
  }
}

export const generateHook = (req, res, next) => generate('hook', req, res, next)
export const generateOutline = (req, res, next) => generate('outline', req, res, next)
export const generateCta = (req, res, next) => generate('cta', req, res, next)

export async function saveEditorContent(req, res, next) {
  try {
    const userId = uid(req)
    const { id, ...payload } = req.body || {}
    const content = await saveContent(userId, id || null, payload)
    res.json({ success: true, content })
  } catch (err) {
    next(err)
  }
}
