import express from 'express'
import { db } from '../services/firebaseAdmin.js'

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const { userId, endpoint, keys } = req.body || {}
    if (!userId || !endpoint) return res.status(400).json({ ok: false, error: 'Missing fields' })

    const subId = Buffer.from(String(endpoint)).toString('base64').slice(0, 100)
    const userRef = db.collection('users').doc(String(userId))
    const snap = await userRef.get()
    const data = snap.exists ? (snap.data() || {}) : {}
    const existing = Array.isArray(data?.integrations?.pwa?.subscriptions) ? data.integrations.pwa.subscriptions : []
    const filtered = existing.filter((item) => item?.endpoint && item.endpoint !== endpoint)
    filtered.push({ endpoint, keys: keys || null, createdAt: new Date().toISOString() })

    await Promise.all([
      userRef
        .collection('pushSubscriptions')
        .doc(subId)
        .set({ endpoint, keys: keys || null, createdAt: new Date() }, { merge: true }),
      userRef.set(
        {
          integrations: {
            ...(data?.integrations || {}),
            pwa: {
              ...(data?.integrations?.pwa || {}),
              subscriptions: filtered,
            },
          },
        },
        { merge: true },
      ),
    ])

    res.json({ ok: true })
  } catch (err) {
    console.error('[Push] register failed:', err)
    res.status(500).json({ ok: false, error: err?.message || String(err) })
  }
})

export default router
