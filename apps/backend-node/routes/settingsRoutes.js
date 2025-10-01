import express from 'express'
import { db } from '../services/firebaseAdmin.js'

const router = express.Router()

// POST /api/settings/updatePreferences
router.post('/settings/updatePreferences', async (req, res) => {
  try {
    const { userId, preferences } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    await db.collection('users').doc(userId).set(
      {
        preferences: {
          notifications: {
            email: !!preferences?.notifications?.email,
            push: !!preferences?.notifications?.push,
            whatsapp: !!preferences?.notifications?.whatsapp,
            discord: !!preferences?.notifications?.discord,
            calls: !!preferences?.notifications?.calls,
          },
          integrations: {
            googleCalendar: !!preferences?.integrations?.googleCalendar,
            slack: !!preferences?.integrations?.slack,
            discord: !!preferences?.integrations?.discord,
            outlook: !!preferences?.integrations?.outlook,
            whatsapp: !!preferences?.integrations?.whatsapp,
          },
        },
        updatedAt: new Date(),
      },
      { merge: true }
    )

    res.json({ success: true })
  } catch (err) {
    console.error('❌ updatePreferences error:', err)
    res.status(500).json({ error: 'Failed to update preferences' })
  }
})

// GET /api/settings/preferences?userId=...
router.get('/settings/preferences', async (req, res) => {
  try {
    const { userId } = req.query || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    res.json({ preferences: data?.preferences || {} })
  } catch (err) {
    console.error('❌ getPreferences error:', err)
    res.status(500).json({ error: 'Failed to fetch preferences' })
  }
})

export default router

