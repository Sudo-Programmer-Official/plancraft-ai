import {
  saveCampaign,
  updateCampaignById,
  deleteCampaignById,
} from '../firestore/growthCampaignRepository.js'
import { logOutreach } from '../firestore/outreachLogsRepository.js'
import { runOutreachEngine } from '../services/outreachEngine.js'
import { findProspects, findInvestors } from '../services/prospectDiscovery.js'

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
}

export async function createCampaign(req, res, next) {
  try {
    const payload = req.body || {}
    const userId = req.user?.uid || 'anon'
    const wsId = workspaceId(req)
    const result = await saveCampaign({ ...payload, userId, workspaceId: wsId }, { userId, workspaceId: wsId })
    res.json({ success: true, campaign: result })
  } catch (err) {
    next(err)
  }
}

export async function updateCampaign(req, res, next) {
  try {
    const { id } = req.params
    const payload = req.body || {}
    const wsId = workspaceId(req)
    const result = await updateCampaignById(id, payload, { userId: req.user?.uid, workspaceId: wsId })
    if (!result) return res.status(404).json({ success: false, error: 'Campaign not found' })
    res.json({ success: true, campaign: result })
  } catch (err) {
    next(err)
  }
}

export async function deleteCampaign(req, res, next) {
  try {
    const { id } = req.params
    const wsId = workspaceId(req)
    const deleted = await deleteCampaignById(id, { userId: req.user?.uid, workspaceId: wsId })
    if (!deleted) return res.status(404).json({ success: false, error: 'Campaign not found' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function generateOutreach(req, res, next) {
  await handleOutreach('outreach', req, res, next)
}

export async function generateComment(req, res, next) {
  await handleOutreach('comment', req, res, next)
}

export async function generateCommunityPost(req, res, next) {
  await handleOutreach('community-post', req, res, next)
}

async function handleOutreach(kind, req, res, next) {
  try {
    const input = req.body?.input || ''
    const channel = req.body?.channel || kind
    const user = req.user || {}
    const wsId = workspaceId(req)
    const output = await runOutreachEngine(kind, input, user)
    try {
      await logOutreach({
        userId: user?.uid || 'anon',
        type: kind,
        input,
        output,
        channel,
        workspaceId: wsId,
      })
    } catch {}
    res.json({ success: true, output })
  } catch (err) {
    next(err)
  }
}

export async function searchProspects(req, res, next) {
  try {
    const results = await findProspects(req.body || {})
    res.json({ success: true, results })
  } catch (err) {
    next(err)
  }
}

export async function searchInvestors(req, res, next) {
  try {
    const results = await findInvestors(req.body || {})
    res.json({ success: true, results })
  } catch (err) {
    next(err)
  }
}
