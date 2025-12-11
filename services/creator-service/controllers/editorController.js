import { proxyAi } from '../services/aiClient.js'
import { saveContent } from '../firestore/contentRepository.js'
import { createVariant, updateVariant } from '../firestore/variantsRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
}

async function generate(type, req, res, next) {
  try {
    const data = await proxyAi(type, { ...(req.body || {}), workspaceId: workspaceId(req) })
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
    const wsId = workspaceId(req)
    const { id, ...payload } = req.body || {}
    // Prefer variant documents; fallback to legacy content collection.
    const content = id
      ? await updateVariant(userId, id, { ...payload, workspaceId: wsId || payload.workspaceId || null })
      : await createVariant(userId, { ...payload, workspaceId: wsId || payload.workspaceId || null, status: payload.status || 'draft' })
    res.json({ success: true, content })
  } catch (err) {
    next(err)
  }
}
