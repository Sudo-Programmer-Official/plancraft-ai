import express from 'express'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import { buildUserReport, persistReport, renderReportHtml, generateReportPDF, msToHuman } from '../services/reportService.js'
import { sendReportEmail, initEmail } from '../services/emailService.js'
import { db } from '../services/firebaseAdmin.js'

initEmail()

const router = express.Router()

// POST /api/reports/generate { period: 'weekly'|'monthly', sendEmail?: boolean }
router.post('/generate', requireAuth, ensureUserMatches, async (req, res) => {
  try {
    const uid = req.user.uid
    const period = String(req.body?.period || '').toLowerCase()
    const send = req.body?.sendEmail === true || req.body?.sendEmail === '1'
    if (!['weekly', 'monthly'].includes(period)) return res.status(400).json({ success: false, error: 'Invalid period' })

    const summary = await buildUserReport(uid, period)
    const saved = await persistReport(uid, period, summary)

    // Try to generate PDF (optional)
    try {
      const html = renderReportHtml(summary)
      const storageName = `${uid}/${period}-${summary.start}-${summary.end}-${Date.now()}`
      const pdfUrl = await generateReportPDF(html, storageName)
      if (pdfUrl) {
        await db.collection('reports').doc(saved.id).update({ 'urls.pdf': pdfUrl })
        saved.urls = { ...(saved.urls || {}), pdf: pdfUrl }
      }
      if (send && req.user?.email) {
        const metrics = {
          period,
          name: req.user?.email?.split('@')[0],
          completed: summary?.metrics?.totalCompleted || 0,
          avgTime: msToHuman(summary?.metrics?.avgCompletionMs || 0),
          topMood: (summary?.metrics?.moods?.[0]?.mood) || 'N/A',
          carryover: '—',
        }
        await sendReportEmail(req.user.email, saved?.urls?.html, saved?.urls?.pdf, metrics)
      }
    } catch {}

    return res.json({ success: true, report: saved })
  } catch (e) {
    console.error('reports/generate failed:', e)
    return res.status(500).json({ success: false, error: 'Internal error' })
  }
})

// GET /api/reports/list?limit=3
router.get('/list', requireAuth, ensureUserMatches, async (req, res) => {
  try {
    const uid = req.user.uid
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '3', 10) || 3, 10))
    const snap = await db
      .collection('reports')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    const items = []
    snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
    return res.json({ success: true, items })
  } catch (e) {
    console.error('reports/list failed:', e)
    return res.status(500).json({ success: false, error: 'Internal error' })
  }
})

// GET /api/reports/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id
    const doc = await db.collection('reports').doc(id).get()
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Not found' })
    const data = doc.data()
    if (data.userId !== req.user.uid) return res.status(403).json({ success: false, error: 'Forbidden' })
    return res.json({ success: true, report: { id: doc.id, ...data } })
  } catch (e) {
    console.error('reports/:id failed:', e)
    return res.status(500).json({ success: false, error: 'Internal error' })
  }
})

export default router
