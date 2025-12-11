import { saveCampaign, fetchCampaign } from '../firestore/campaignRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
}

export async function createPlan(req, res, next) {
  try {
    const userId = uid(req)
    const wsId = workspaceId(req)
    const payload = req.body || {}
    const result = await saveCampaign(null, { ...payload, userId, workspaceId: wsId }, { userId, workspaceId: wsId })
    res.json({ success: true, plan: result })
  } catch (err) {
    next(err)
  }
}

export async function updatePlan(req, res, next) {
  try {
    const userId = uid(req)
    const wsId = workspaceId(req)
    const payload = req.body || {}
    const { id } = req.params
    const result = await saveCampaign(id, { ...payload, workspaceId: wsId }, { userId, workspaceId: wsId })
    if (!result) return res.status(404).json({ success: false, error: 'Plan not found' })
    res.json({ success: true, plan: result })
  } catch (err) {
    next(err)
  }
}

export async function getPlan(req, res, next) {
  try {
    const { id } = req.params
    const result = await fetchCampaign(id, { userId: uid(req), workspaceId: workspaceId(req) })
    if (!result) return res.status(404).json({ success: false, error: 'Plan not found' })
    res.json({ success: true, plan: result })
  } catch (err) {
    next(err)
  }
}
