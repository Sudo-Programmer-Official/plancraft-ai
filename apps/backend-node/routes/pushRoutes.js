import express from 'express'
import { db } from '../services/firebaseAdmin.js'

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const { userId, endpoint, keys } = req.body || {}
    if (!userId || !endpoint) return res.status(400).json({ ok: false, error: 'Missing fields' })

    const subId = Buffer.from(String(endpoint)).toString('base64').slice(0, 100)
    await db
      .collection('users')
      .doc(String(userId))
      .collection('pushSubscriptions')
      .doc(subId)
      .set({ endpoint, keys: keys || null, createdAt: new Date() }, { merge: true })

    res.json({ ok: true })
  } catch (err) {
    console.error('[Push] register failed:', err)
    res.status(500).json({ ok: false, error: err?.message || String(err) })
  }
})

export default router

