import express from 'express'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import { getEffectiveAccess } from '../services/planService.js'

const router = express.Router()

router.use(requireAuth, ensureUserMatches)

router.get('/effective', async (req, res) => {
  try {
    const uid = String(req.query?.uid || req.query?.userId || req?.user?.uid || '')
    if (!uid) return res.status(400).json({ error: 'Missing uid' })

    const access = await getEffectiveAccess(uid)
    return res.json({ access })
  } catch (error) {
    console.error('[Access] effective failed', error?.message || error)
    return res.status(500).json({ error: 'Failed to compute access' })
  }
})

export default router
