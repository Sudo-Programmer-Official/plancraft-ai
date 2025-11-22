import {
  saveCampaign,
  updateCampaignById,
  deleteCampaignById,
} from '../firestore/growthCampaignRepository.js'
import { logOutreach } from '../firestore/outreachLogsRepository.js'
import { runOutreachEngine } from '../services/outreachEngine.js'
import { findProspects, findInvestors } from '../services/prospectDiscovery.js'

export async function createCampaign(req, res, next) {
  try {
    const payload = req.body || {}
    const userId = req.user?.uid || 'anon'
    const result = await saveCampaign({ ...payload, userId })
    res.json({ success: true, campaign: result })
  } catch (err) {
    next(err)
  }
}

export async function updateCampaign(req, res, next) {
  try {
    const { id } = req.params
    const payload = req.body || {}
    const result = await updateCampaignById(id, payload)
    res.json({ success: true, campaign: result })
  } catch (err) {
    next(err)
  }
}

export async function deleteCampaign(req, res, next) {
  try {
    const { id } = req.params
    await deleteCampaignById(id)
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
    const output = await runOutreachEngine(kind, input, user)
    try {
      await logOutreach({
        userId: user?.uid || 'anon',
        type: kind,
        input,
        output,
        channel,
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
