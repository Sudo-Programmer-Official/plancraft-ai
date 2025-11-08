import express from 'express'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import { addJournalEntry } from '../services/journalService.js'
import { db } from '../services/firebaseAdmin.js'

const router = express.Router()

router.use(requireAuth, ensureUserMatches)

router.post('/journal/add', async (req, res) => {
  try {
    const { userId, ...payload } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    if (!payload?.text) return res.status(400).json({ error: 'Missing text' })
    const entry = await addJournalEntry(userId, payload)
    return res.json({ success: true, entry })
  } catch (err) {
    console.error('[JournalRoutes] add failed', err?.message || err)
    const status = err?.message === 'text required' ? 400 : 500
    return res.status(status).json({ error: err?.message || 'Failed to save journal entry' })
  }
})

router.get('/journal', async (req, res) => {
  try {
    const userId = req.query.userId || req?.user?.uid
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100)
    const snap = await db
      .collection('journalEntries')
      .where('userId', '==', String(userId))
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    const entries = []
    snap.forEach((doc) => {
      const data = doc.data() || {}
      entries.push({
        id: doc.id,
        title: data.title || '',
        text: data.text || '',
        mood: data.mood || null,
        tags: data.tags || [],
        date: data.date || null,
        summary: data.summary || null,
        createdAt: data.createdAt || null,
      })
    })
    return res.json({ entries })
  } catch (err) {
    console.error('[JournalRoutes] list failed', err?.message || err)
    return res.status(500).json({ error: 'Failed to load journal entries' })
  }
})

export default router
