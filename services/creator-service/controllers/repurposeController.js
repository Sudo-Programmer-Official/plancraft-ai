import { proxyAi } from '../services/aiClient.js'
import { createDraft } from '../firestore/draftsRepository.js'
import { createVariantsFromMap } from '../firestore/variantsRepository.js'
import { fetchProfile } from '../firestore/profileRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
}

export async function runRepurpose(req, res, next) {
  try {
    const userId = uid(req)
    const wsId = workspaceId(req)
    const payload = req.body || {}
    const profile = await fetchProfile(userId, wsId || 'default')
    const aiPayload = {
      sourceContent: payload.source || payload.sourceContent || '',
      targetFormats: payload.formats || payload.targetFormats || ['linkedin_post', 'twitter_thread'],
      workspaceId: wsId,
      creatorProfile: profile,
    }
    const data = await proxyAi('repurpose', aiPayload, { headers: req.headers })
    const variants = data?.variants || data || {}
    const saved = await createVariantsFromMap(userId, variants, wsId)
    res.json({ success: true, variants: saved })
  } catch (err) {
    next(err)
  }
}

export async function saveRepurpose(req, res, next) {
  try {
    const userId = uid(req)
    const wsId = workspaceId(req)
    const variants = req.body?.variants || {}
    const saved = await createVariantsFromMap(userId, variants, wsId)
    // Keep legacy drafts for inspiration
    const drafts = []
    for (const [variant, content] of Object.entries(variants)) {
      const draft = await createDraft(userId, {
        title: content?.title || variant,
        type: content?.type || variant,
        body: content?.body || content?.text || '',
        variant,
      }, wsId)
      drafts.push(draft)
    }
    res.json({ success: true, saved, drafts })
  } catch (err) {
    next(err)
  }
}
