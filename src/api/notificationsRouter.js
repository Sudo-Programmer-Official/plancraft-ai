import express from 'express'
import { db } from '../../server/firebaseAdmin.js'
import withOrgAuth from './orgs/middlewares/withOrgAuth.js'
import { notifyOrgActivity, notifyTokens } from '../services/notifierService.js'

const router = express.Router()

router.post('/test', async (req, res) => {
  try {
    const uid = req.user?.uid
    if (!uid) return res.status(401).json({ error: 'Unauthenticated' })

    const userRef = db.doc(`users/${uid}`)
    const snap = await userRef.get()
    const token = snap.get('fcmToken')
    if (!token) return res.status(400).json({ error: 'No FCM token registered for this user' })

    const title = req.body?.title || 'Notifications ready'
    const body = req.body?.body || 'You will receive team updates in real time.'

    const response = await notifyTokens({
      tokens: [token],
      title,
      body,
      data: { channel: 'feed', test: '1' },
    })

    res.json({ ok: true, ...response })
  } catch (err) {
    console.error('POST /api/notifications/test error', err)
    res.status(500).json({ error: 'Failed to send test notification' })
  }
})

router.post('/orgs/:orgId', withOrgAuth, async (req, res) => {
  try {
    const { orgId } = req.params
    if (!['owner', 'admin'].includes(String(req.orgRole || '').toLowerCase())) {
      return res.status(403).json({ error: 'Only admins can broadcast notifications' })
    }

    const title = req.body?.title || 'Workspace update'
    const body = req.body?.body || 'A new update is available for your team.'
    const channel = req.body?.channel || 'feed'
    const data = req.body?.data || {}

    const response = await notifyOrgActivity({
      orgId,
      title,
      body,
      channel,
      data,
      excludeUid: req.user?.uid || null,
    })

    res.json({ ok: true, ...response })
  } catch (err) {
    console.error('POST /api/notifications/:orgId error', err)
    res.status(500).json({ error: 'Failed to broadcast notification' })
  }
})

export default router
