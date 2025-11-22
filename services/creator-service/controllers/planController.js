import { saveCampaign, fetchCampaign } from '../firestore/campaignRepository.js'

export async function createPlan(req, res, next) {
  try {
    const payload = req.body || {}
    const result = await saveCampaign(null, { ...payload, userId: req.user?.uid })
    res.json({ success: true, plan: result })
  } catch (err) {
    next(err)
  }
}

export async function updatePlan(req, res, next) {
  try {
    const payload = req.body || {}
    const { id } = req.params
    const result = await saveCampaign(id, payload)
    res.json({ success: true, plan: result })
  } catch (err) {
    next(err)
  }
}

export async function getPlan(req, res, next) {
  try {
    const { id } = req.params
    const result = await fetchCampaign(id)
    res.json({ success: true, plan: result })
  } catch (err) {
    next(err)
  }
}
