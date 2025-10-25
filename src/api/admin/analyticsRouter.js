import express from 'express'
import { db } from '../../../server/firebaseAdmin.js'
import { getCrossOrgAnalytics } from '../../services/analyticsService.js'

const router = express.Router()

async function ensurePlatformAdmin(req, res, next) {
  try {
    const uid = req.user?.uid
    if (!uid) return res.status(401).json({ error: 'Unauthenticated' })
    const userSnap = await db.doc(`users/${uid}`).get()
    const role = userSnap.get('role') || 'user'
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    req.adminProfile = { uid, ...userSnap.data() }
    next()
  } catch (err) {
    console.error('ensurePlatformAdmin error', err)
    res.status(500).json({ error: 'Admin auth check failed' })
  }
}

router.use(ensurePlatformAdmin)

router.get('/', async (req, res) => {
  try {
    const range = typeof req.query.range === 'string' ? req.query.range : '30d'
    const limit = Number(req.query.limit || 10)
    const analytics = await getCrossOrgAnalytics({ range, limit: Number.isFinite(limit) ? limit : 10 })
    res.json(analytics)
  } catch (err) {
    console.error('GET /api/admin/analytics error', err)
    res.status(500).json({ error: 'Failed to load cross-org analytics' })
  }
})

export default router
