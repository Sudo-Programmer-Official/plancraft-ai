import { createSlot, listSlots, updateSlot } from '../firestore/slotsRepository.js'
import { enqueuePostingJob } from '../services/postingClient.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
}

function serializeSlot(slot) {
  const scheduledAt =
    slot?.scheduledAt && slot.scheduledAt.toDate ? slot.scheduledAt.toDate() : slot?.scheduledAt || null
  return {
    ...slot,
    scheduledAt,
  }
}

export async function listSlotsController(req, res, next) {
  try {
    const slots = await listSlots(uid(req), { from: req.query.from, to: req.query.to, workspaceId: workspaceId(req) })
    res.json({ success: true, slots: slots.map(serializeSlot) })
  } catch (err) {
    next(err)
  }
}

async function queuePostingJob(userId, slot) {
  if ((slot.status || '').toLowerCase() !== 'scheduled') return null
  const scheduledAt = slot.scheduledAt instanceof Date ? slot.scheduledAt : slot.scheduledAt?.toDate?.() || null
  const job = {
    jobType: 'creator_post',
    channel: slot.platform || slot.channel || 'instagram',
    scheduledAt: (scheduledAt || new Date()).toISOString(),
    payload: {
      slotId: `creators/${userId}/slots/${slot.id}`,
      platform: slot.platform || slot.channel,
      variantId: slot.variantId || slot.contentRef,
      caption: slot.caption || '',
      mediaUrls: slot.mediaUrls || [],
    },
    meta: { createdBy: userId, source: 'creator', workspaceId: slot.workspaceId || null },
  }
  try {
    return await enqueuePostingJob(job)
  } catch (err) {
    console.error('[creator] Failed to enqueue posting job', err?.message || err)
    return null
  }
}

export async function createSlotController(req, res, next) {
  try {
    const userId = uid(req)
    const slot = await createSlot(userId, { ...(req.body || {}), workspaceId: workspaceId(req) })
    const job = await queuePostingJob(userId, slot)
    res.status(201).json({ success: true, slot: serializeSlot(slot), job })
  } catch (err) {
    next(err)
  }
}

export async function updateSlotController(req, res, next) {
  try {
    const userId = uid(req)
    const slot = await updateSlot(userId, req.params.id, { ...(req.body || {}), workspaceId: workspaceId(req) })
    if (!slot) return res.status(404).json({ success: false, error: 'Slot not found' })
    const job = await queuePostingJob(userId, slot)
    res.json({ success: true, slot: serializeSlot(slot), job })
  } catch (err) {
    next(err)
  }
}
