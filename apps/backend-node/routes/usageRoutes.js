import express from 'express'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import { getFeatureUsageStatus, getPlanUsageSnapshot } from '../services/planService.js'

const router = express.Router()
router.use(requireAuth, ensureUserMatches)

// GET /api/usage/status?uid=...
router.get('/status', async (req, res) => {
  try {
    const { uid, userId, feature } = req.query || {}
    const finalUid = String(uid || userId || req?.user?.uid || '')
    if (!finalUid) return res.status(400).json({ error: 'Missing uid' })
    if (feature) {
      const featureStatus = await getFeatureUsageStatus(finalUid, String(feature))
      return res.json({ feature: featureStatus })
    }
    const snapshot = await getPlanUsageSnapshot(finalUid)
    return res.json(snapshot)
  } catch (e) {
    console.error('usage/status error:', e)
    res.status(500).json({ error: 'Failed to fetch usage status' })
  }
})

export default router
