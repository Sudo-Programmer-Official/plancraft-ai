import { enqueueJob, validateJob } from '../services/jobQueueService.js'
import { ensureApp } from '../utils/firebase.js'
import admin from 'firebase-admin'

export async function listPostingJobs(req, res, next) {
  try {
    ensureApp()
    const db = admin.firestore()
    let query = db.collection('posting_jobs')
    if (req.query.uid) query = query.where('uid', '==', req.query.uid)
    if (req.query.source) query = query.where('source', '==', req.query.source)
    if (req.headers['x-workspace-id']) {
      query = query.where('workspaceId', '==', req.headers['x-workspace-id'])
    }
    const snap = await query.orderBy('scheduledAt', 'desc').limit(100).get()
    const jobs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json({ success: true, jobs })
  } catch (err) {
    next(err)
  }
}

export async function createPostingJob(req, res, next) {
  try {
    const payload = req.body || {}
    const workspaceId = req.headers['x-workspace-id'] || payload.workspaceId || null
    validateJob(payload)
    const job = await enqueueJob({
      ...payload,
      scheduledAt: payload.scheduledAt || new Date().toISOString(),
      meta: {
        ...(payload.meta || {}),
        createdBy: payload.meta?.createdBy || req.user?.uid || 'unknown',
      },
      workspaceId,
    })
    res.status(201).json({ success: true, job })
  } catch (err) {
    next(err)
  }
}
