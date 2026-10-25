import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../services/firebaseAdmin.js'

const router = express.Router()
const MAX_LINKED_TASKS = 30

function serializeValue(value) {
  if (!value) return value ?? null
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return value
}

function serializeGoal(snapshot) {
  const data = snapshot.data() || {}
  return {
    id: snapshot.id,
    goalId: snapshot.id,
    ...data,
    createdAt: serializeValue(data.createdAt),
    updatedAt: serializeValue(data.updatedAt),
    targetDate: serializeValue(data.targetDate),
  }
}

function normalizeLinkedTasks(value) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(
    value
      .map((taskId) => String(taskId || '').trim())
      .filter(Boolean),
  )).slice(0, MAX_LINKED_TASKS)
}

router.use(requireAuth)

// Intelligence only needs a read-only view of the user's goals. The backend
// derives the user ID from the verified auth token, so the browser cannot
// request another user's goals by changing a query parameter.
router.get('/intelligence/goals', async (req, res) => {
  try {
    const snapshot = await db
      .collection('goals')
      .where('userId', '==', req.user.uid)
      .get()

    const goals = snapshot.docs
      .map(serializeGoal)
      .sort((left, right) => {
        const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime()
        const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime()
        return rightTime - leftTime
      })

    return res.json({ goals })
  } catch (error) {
    console.error('[Intelligence] failed to list goals', error?.message || error)
    return res.status(500).json({ error: 'Could not load goals' })
  }
})

// Intelligence may append an approved task to a goal. Keep this endpoint
// intentionally narrow so it cannot mutate arbitrary goal fields.
router.patch('/intelligence/goals/:goalId', async (req, res) => {
  try {
    const goalRef = db.collection('goals').doc(String(req.params.goalId || ''))
    const snapshot = await goalRef.get()

    if (!snapshot.exists) return res.status(404).json({ error: 'Goal not found' })

    const current = snapshot.data() || {}
    if (current.userId !== req.user.uid) return res.status(403).json({ error: 'Forbidden' })

    const linkedTasks = normalizeLinkedTasks(req.body?.linkedTasks)
    await goalRef.update({ linkedTasks, updatedAt: new Date() })

    const updated = await goalRef.get()
    return res.json({ goal: serializeGoal(updated) })
  } catch (error) {
    console.error('[Intelligence] failed to link task to goal', error?.message || error)
    return res.status(500).json({ error: 'Could not update goal' })
  }
})

export default router
