import { enqueueJob, processJob, validateJob } from '../services/jobQueueService.js'
import { markJobStatus } from '../firestore/jobsRepository.js'
import { ensureApp } from '../utils/firebase.js'
import admin from 'firebase-admin'

function shouldSendInline(job) {
  if (!job) return false
  if ((job.jobType || '').toLowerCase() !== 'notification') return false
  const scheduled =
    job.scheduledAt instanceof Date ? job.scheduledAt : new Date(job.scheduledAt || Date.now())
  if (!(scheduled instanceof Date) || Number.isNaN(scheduled.getTime())) return true
  return scheduled.getTime() <= Date.now() + 2000 // small skew allowance
}

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
    console.log('[posting-service] job:enqueue', {
      jobType: payload.jobType,
      channel: payload.channel,
      workspaceId,
      scheduledAt: payload.scheduledAt || 'now',
      metaKeys: Object.keys(payload.meta || {}),
    })
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
    if (shouldSendInline(job)) {
      try {
        await processJob(job)
        await markJobStatus(job.id, 'done', { lastResult: 'inline' })
        console.log('[posting-service] job:sent-inline', {
          id: job.id,
          channel: job.channel,
          jobType: job.jobType,
        })
      } catch (err) {
        console.warn('[posting-service] inline send failed; will retry via scheduler', {
          id: job.id,
          channel: job.channel,
          jobType: job.jobType,
          error: err?.message || err,
        })
      }
    }
    res.status(201).json({ success: true, job })
  } catch (err) {
    next(err)
  }
}
