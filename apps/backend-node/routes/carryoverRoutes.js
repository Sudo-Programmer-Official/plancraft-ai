import express from 'express'
import { db } from '../services/firebaseAdmin.js'

const router = express.Router()

// POST /api/carryover/apply { userId, limit? }
router.post('/carryover/apply', async (req, res) => {
  try {
    const userId = req.body?.userId || req.headers['x-user-id']
    const limit = parseInt(req.body?.limit, 10) || 0 // 0 = no limit
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' })

    const snap = await db
      .collection('tasks')
      .where('userId', '==', userId)
      .where('is_carryover', '==', true)
      .get()

    const tasks = []
    snap.forEach((d) => tasks.push({ id: d.id, ...d.data() }))
    const toMove = limit > 0 ? tasks.slice(0, limit) : tasks

    const tomorrow = (() => {
      const now = new Date()
      const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const y = dt.getFullYear()
      const m = String(dt.getMonth() + 1).padStart(2, '0')
      const d = String(dt.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    })()

    const batch = db.batch()
    toMove.forEach((t) => {
      batch.update(db.collection('tasks').doc(t.id), {
        date: tomorrow,
        is_carryover: false,
        carryoverAppliedAt: new Date(),
        previousDate: t.date || null,
      })
    })
    await batch.commit()
    return res.json({ success: true, moved: toMove.length, totalPending: tasks.length })
  } catch (e) {
    console.error('carryover/apply failed', e)
    return res.status(500).json({ success: false, error: 'Internal error' })
  }
})

// POST /api/carryover/ignore { userId }
router.post('/carryover/ignore', async (req, res) => {
  try {
    const userId = req.body?.userId || req.headers['x-user-id']
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' })
    const snap = await db
      .collection('tasks')
      .where('userId', '==', userId)
      .where('is_carryover', '==', true)
      .get()
    const batch = db.batch()
    let count = 0
    snap.forEach((d) => {
      batch.update(d.ref, { is_carryover: false, overdue: true, overdueAt: new Date() })
      count++
    })
    await batch.commit()
    return res.json({ success: true, archived: count })
  } catch (e) {
    console.error('carryover/ignore failed', e)
    return res.status(500).json({ success: false, error: 'Internal error' })
  }
})

export default router

