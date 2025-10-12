import express from 'express'
import { dataStore } from './dataStore.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()
router.use(requireAuth)

// GET /api/notifications
router.get('/notifications', async (req, res) => {
  try {
    res.json(dataStore.notifications)
  } catch (err) {
    console.error('notifications error', err)
    res.json([])
  }
})

export default router
