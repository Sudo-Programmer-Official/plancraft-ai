import express from 'express'
import { db } from '../services/firebaseAdmin.js'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth, ensureUserMatches)

// GET /api/usage/status?uid=...
router.get('/status', async (req, res) => {
  try {
    const { uid, userId } = req.query || {}
    const finalUid = String(uid || userId || req?.user?.uid || '')
    if (!finalUid) return res.status(400).json({ error: 'Missing uid' })
    const snap = await db.collection('users').doc(finalUid).get()
    const data = snap.exists ? snap.data() : {}
    const today = new Date().toISOString().slice(0, 10)
    const todayUsage = data?.usage?.[today] || {}
    const aiGenerations = Number(todayUsage?.aiGenerations || 0)
    const reminders = Number(todayUsage?.reminders || 0)
    res.json({ today: { aiGenerations, reminders } })
  } catch (e) {
    console.error('usage/status error:', e)
    res.status(500).json({ error: 'Failed to fetch usage status' })
  }
})

export default router
