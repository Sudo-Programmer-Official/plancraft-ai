import { listInspiration } from '../firestore/draftsRepository.js'
import { listVariants } from '../firestore/variantsRepository.js'
import { listSlots } from '../firestore/slotsRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
}

export async function getBoard(req, res, next) {
  try {
    const userId = uid(req)
    const wsId = workspaceId(req)
    const [variants, slots, inspiration] = await Promise.all([
      listVariants(userId, { workspaceId: wsId }),
      listSlots(userId, { workspaceId: wsId }),
      listInspiration(userId, wsId),
    ])
    const now = new Date()
    const drafts = variants.filter((v) => (v.status || 'draft') === 'draft')
    const scheduled = slots.filter((s) => {
      const status = (s.status || '').toLowerCase()
      const scheduledAt = s.scheduledAt ? new Date(s.scheduledAt) : null
      return status === 'scheduled' && (!scheduledAt || scheduledAt >= now)
    })
    res.json({
      success: true,
      drafts,
      inspiration,
      scheduled,
    })
  } catch (err) {
    next(err)
  }
}
