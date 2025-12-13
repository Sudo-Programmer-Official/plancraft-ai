import { generateImages } from '../services/imageClient.js'
import { saveGeneratedAssets } from '../firestore/mediaAssets.js'
import { incrementUsage } from '../firestore/usageRepository.js'

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.body?.workspaceId || req.query?.workspaceId || null
}

export async function generateAiImages(req, res, next) {
  try {
    const wsId = workspaceId(req)
    const userId = req.user?.uid || 'anon'
    const {
      prompt = '',
      style = 'photoreal',
      aspect = '1:1',
      count = 1,
      platform = 'instagram',
      postId = null,
    } = req.body || {}

    const { images, meta } = await generateImages({
      prompt,
      style,
      aspect,
      count: Math.min(Number(count) || 1, 5),
      platform,
      workspaceId: wsId,
      userId,
      postId,
    })

    try {
      await saveGeneratedAssets({
        workspaceId: wsId,
        userId,
        prompt,
        style,
        aspect,
        platform,
        postId,
        images,
      })
      await incrementUsage(wsId, images.length)
    } catch (err) {
      console.warn('[ai-image] failed to persist assets/usage', err?.message || err)
    }

    res.json({ success: true, images, meta })
  } catch (err) {
    next(err)
  }
}
