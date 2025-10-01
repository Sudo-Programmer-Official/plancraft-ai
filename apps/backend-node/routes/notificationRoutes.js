import express from 'express'
import { dataStore } from './dataStore.js'

const router = express.Router()

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
