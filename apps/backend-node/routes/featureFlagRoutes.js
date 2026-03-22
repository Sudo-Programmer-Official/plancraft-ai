import express from 'express'
import requireAdmin from '../middleware/requireAdmin.js'
import {
  getRemoteFeatureFlags,
  updateRemoteFeatureFlags,
} from '../services/featureFlagService.js'

const router = express.Router()

router.get('/feature-flags', async (_req, res) => {
  try {
    const payload = await getRemoteFeatureFlags()
    return res.json(payload)
  } catch (error) {
    console.error('[FeatureFlags] public fetch failed', error?.message || error)
    return res.status(500).json({ error: 'Failed to load feature flags' })
  }
})

router.get('/admin/feature-flags', requireAdmin, async (_req, res) => {
  try {
    const payload = await getRemoteFeatureFlags()
    return res.json(payload)
  } catch (error) {
    console.error('[FeatureFlags] admin fetch failed', error?.message || error)
    return res.status(500).json({ error: 'Failed to load feature flags' })
  }
})

router.patch('/admin/feature-flags', requireAdmin, async (req, res) => {
  try {
    const payload = await updateRemoteFeatureFlags(req.body?.flags || req.body || {}, req.user?.uid || null)
    return res.json(payload)
  } catch (error) {
    console.error('[FeatureFlags] update failed', error?.message || error)
    return res.status(500).json({ error: 'Failed to update feature flags' })
  }
})

export default router
