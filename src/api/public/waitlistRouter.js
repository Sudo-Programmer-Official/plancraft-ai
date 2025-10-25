import express from 'express'
import { db } from '../../../server/firebaseAdmin.js'

const router = express.Router()

function sanitize(value, limit = 250) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  if (!text) return null
  return text.slice(0, limit)
}

router.post('/teams', async (req, res) => {
  try {
    const { name = '', email = '', companySize = '', useCase = '', utm = {}, page = '' } = req.body || {}

    const trimmedEmail = sanitize(email, 160)
    if (!trimmedEmail || !/.+@.+\..+/.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Valid email is required.' })
    }

    const now = new Date()
    const doc = {
      name: sanitize(name, 120),
      email: trimmedEmail.toLowerCase(),
      companySize: sanitize(companySize, 64),
      useCase: sanitize(useCase, 1200),
      page: sanitize(page, 512),
      utm: {
        source: sanitize(utm?.source, 120),
        medium: sanitize(utm?.medium, 120),
        campaign: sanitize(utm?.campaign, 120),
        term: sanitize(utm?.term, 120),
        content: sanitize(utm?.content, 120),
        ref: sanitize(utm?.ref, 120),
      },
      referer: sanitize(req.headers.referer, 512),
      userAgent: sanitize(req.headers['user-agent'], 512),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    const ref = await db.collection('waitlist_teams').add(doc)
    res.status(201).json({ id: ref.id })
  } catch (err) {
    console.error('POST /api/waitlist/teams error', err)
    res.status(500).json({ error: 'Failed to submit waitlist entry.' })
  }
})

export default router
