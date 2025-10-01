import express from 'express'
import requireAdmin from '../middleware/requireAdmin.js'
import { dataStore } from './dataStore.js'

const router = express.Router()

// Admin: Notifications
router.get('/notifications', requireAdmin, (req, res) => {
  res.json(dataStore.notifications)
})

router.post('/notifications', requireAdmin, (req, res) => {
  const { title, message } = req.body || {}
  if (!title || !message) return res.status(400).json({ error: 'title and message required' })
  const note = { id: 'n' + (Date.now()), title, message, date: Date.now() }
  dataStore.notifications.unshift(note)
  res.json(note)
})

// Admin: Users
router.get('/users', requireAdmin, (req, res) => {
  res.json(dataStore.users)
})

router.patch('/users/:id', requireAdmin, (req, res) => {
  const id = req.params.id
  const { role } = req.body || {}
  const i = dataStore.users.findIndex(u => u.id === id)
  if (i === -1) return res.status(404).json({ error: 'User not found' })
  if (role && (role === 'admin' || role === 'user')) dataStore.users[i].role = role
  res.json(dataStore.users[i])
})

// Admin: Payments
router.get('/payments', requireAdmin, (req, res) => {
  res.json(dataStore.payments)
})

export default router
