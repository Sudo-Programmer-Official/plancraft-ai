import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { buildUserReport, persistReport, renderReportHtml, generateReportPDF, msToHuman } from '../services/reportService.js'
import { sendReportEmail, initEmail } from '../services/emailService.js'
import { db } from '../services/firebaseAdmin.js'
import { extractWorkspaceId } from '../middleware/workspace.js'
import { getWorkspace, getWorkspaceMembership } from '../services/workspaceService.js'

initEmail()

const router = express.Router()

async function resolveWorkspaceContext(req) {
  const workspaceId = extractWorkspaceId(req)
  if (!workspaceId) return { workspaceId: null, workspace: null, membership: null }
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) {
    const err = new Error('Workspace not found')
    err.status = 404
    throw err
  }
  const membership = await getWorkspaceMembership(workspaceId, req.user.uid)
  if (!membership || membership.status !== 'active') {
    const err = new Error('Not a member of this workspace')
    err.status = 403
    throw err
  }
  return { workspaceId, workspace, membership }
}

// POST /api/reports/generate { period: 'weekly'|'monthly', sendEmail?: boolean }
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid
    const period = String(req.body?.period || '').toLowerCase()
    const send = req.body?.sendEmail === true || req.body?.sendEmail === '1'
    if (!['weekly', 'monthly'].includes(period)) return res.status(400).json({ success: false, error: 'Invalid period' })

    const { workspaceId, workspace, membership } = await resolveWorkspaceContext(req)

    const summary = await buildUserReport(uid, period, {
      workspaceId,
      workspace,
      membership,
      workspaceRole: membership?.role,
      generatedBy: uid,
      generatedByEmail: req.user?.email || null,
    })
    const saved = await persistReport(uid, period, summary)

    // Try to generate PDF (optional)
    try {
      const html = renderReportHtml(summary)
      const storageName = `${workspaceId || uid}/${period}-${summary.start}-${summary.end}-${Date.now()}`
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
          workspace: summary?.workspaceName || workspace?.name || null,
        }
        await sendReportEmail(req.user.email, saved?.urls?.html, saved?.urls?.pdf, metrics)
      }
    } catch {}

    return res.json({ success: true, report: saved })
  } catch (e) {
    if (e?.status) {
      return res.status(e.status).json({ success: false, error: e.message })
    }
    console.error('reports/generate failed:', e)
    return res.status(500).json({ success: false, error: 'Internal error' })
  }
})

// GET /api/reports/list?limit=3
router.get('/list', requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '3', 10) || 3, 10))
    let workspaceId = null
    try {
      const ctx = await resolveWorkspaceContext(req)
      workspaceId = ctx.workspaceId
    } catch (err) {
      if (err?.status) return res.status(err.status).json({ success: false, error: err.message })
      console.error('reports/list workspace resolve failed:', err?.message || err)
      return res.status(500).json({ success: false, error: 'Internal error' })
    }

    async function runQuery(orderByCreated = true) {
      let query = db.collection('reports')
      query = workspaceId ? query.where('workspaceId', '==', workspaceId) : query.where('userId', '==', uid)
      if (orderByCreated) query = query.orderBy('createdAt', 'desc')
      query = query.limit(limit)
      const snap = await query.get()
      const items = []
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
      return items
    }

    let items = []
    try {
      items = await runQuery(true)
    } catch (err) {
      console.warn('reports/list query fallback:', err?.message || err)
      items = await runQuery(false)
      items.sort((a, b) => {
        const aTs = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime()
        const bTs = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime()
        return bTs - aTs
      })
    }

    if ((!items || !items.length) && workspaceId) {
      try {
        let legacyQuery = db.collection('reports').where('userId', '==', uid)
        legacyQuery = legacyQuery.orderBy('createdAt', 'desc').limit(limit)
        const legacySnap = await legacyQuery.get()
        const legacy = []
        legacySnap.forEach((d) => legacy.push({ id: d.id, ...d.data() }))
        items = legacy
      } catch (err) {
        console.warn('reports/list legacy fallback failed:', err?.message || err)
      }
    }

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
    if (data.workspaceId) {
      try {
        const membership = await getWorkspaceMembership(data.workspaceId, req.user.uid)
        if (!membership || membership.status !== 'active') {
          return res.status(403).json({ success: false, error: 'Forbidden' })
        }
      } catch {
        return res.status(403).json({ success: false, error: 'Forbidden' })
      }
    } else if (data.userId !== req.user.uid) return res.status(403).json({ success: false, error: 'Forbidden' })
    return res.json({ success: true, report: { id: doc.id, ...data } })
  } catch (e) {
    console.error('reports/:id failed:', e)
    return res.status(500).json({ success: false, error: 'Internal error' })
  }
})

export default router
