import { saveJob, fetchDueJobs, markJobStatus } from '../firestore/jobsRepository.js'
import { handleJob } from './deliveryService.js'

function normalizeChannel(channel) {
  const lower = (channel || '').toLowerCase()
  if (lower === 'call' || lower === 'voice') return 'voice_call'
  return lower
}

function buildRecipient(job) {
  const to = job.payload?.to || null
  return {
    contactId: job.payload?.contactIds?.[0] || to || null,
    phoneNumber: to,
    email: to,
  }
}

export function validateJob(job = {}) {
  if (!job.channel) throw new Error('channel is required')
  if (!job.jobType) throw new Error('jobType is required')
  return true
}

export async function enqueueJob(job = {}) {
  validateJob(job)
  return saveJob(job)
}

export async function processJob(job) {
  const channel = normalizeChannel(job.channel)
  // Lightweight send: use existing deliveryService for text/call, log for others.
  if (['sms', 'whatsapp', 'voice_call'].includes(channel)) {
    const recipient = buildRecipient(job)
    return handleJob({
      channel,
      recipients: [recipient],
      message: job.payload?.body || job.payload?.caption || '',
      audioUrl: job.payload?.audioUrl || null,
      context: job.meta || {},
    })
  }
  console.info('[posting-service] stub send for job', {
    id: job.id || job.jobId,
    jobType: job.jobType,
    channel,
  })
  return { status: 'sent', channel, stub: true }
}

export async function processDueJobs(now = new Date()) {
  const due = await fetchDueJobs(now)
  const results = []
  for (const job of due) {
    try {
      await processJob(job)
      await markJobStatus(job.id, 'done', { lastResult: 'ok' })
      results.push({ id: job.id, status: 'done' })
    } catch (err) {
      await markJobStatus(job.id, 'failed', { error: err?.message || 'failed' })
      results.push({ id: job.id, status: 'failed', error: err?.message })
    }
  }
  return results
}
