import axios from 'axios'
import { createScheduledMessages, fetchMessageStats } from '../firestore/scheduledMessagesRepository.js'
import { handleJob } from '../services/deliveryService.js'

const GROWTH_BASE = process.env.GROWTH_SERVICE_URL || 'http://growth-service'

function mergeRecipients(direct = [], groupContacts = []) {
  const map = new Map()
  direct.forEach((c) => {
    if (c.contactId) map.set(c.contactId, c)
  })
  groupContacts.forEach((c) => {
    if (c.contactId && !map.has(c.contactId)) map.set(c.contactId, c)
  })
  return Array.from(map.values())
}

async function resolveGroupContacts(groups = [], headers = {}) {
  if (!groups.length) return []
  try {
    const groupIds = groups.map((g) => g.groupId).filter(Boolean)
    const url = `${GROWTH_BASE}/contacts/groups/resolve`
    const { data } = await axios.get(url, {
      params: { groupIds },
      paramsSerializer: (p) => groupIds.map((id) => `groupIds[]=${id}`).join('&'),
      headers,
    })
    return data || []
  } catch (err) {
    console.warn('Group resolve failed', err?.message || err)
    return []
  }
}

function buildJobs(userId, payload, recipients) {
  const now = new Date()
  const jobs = recipients.map((rcpt) => ({
    userId,
    channel: payload.channel,
    mode: payload.mode,
    recipients: [rcpt],
    message: payload.message || null,
    audioUrl: payload.audioUrl || null,
    scheduleAt: payload.scheduleAt ? new Date(payload.scheduleAt) : now,
    context: payload.context || {},
    status: 'pending',
    createdAt: now,
  }))
  return jobs
}

export async function sendNow(req, res, next) {
  try {
    const userId = req.user?.uid || 'anon'
    const payload = req.body || {}
    const authHeader = req.headers.authorization || ''
    const groupContacts = await resolveGroupContacts(payload.groups || [], { Authorization: authHeader })
    const merged = mergeRecipients(payload.recipients || [], groupContacts)
    const jobs = buildJobs(userId, payload, merged)
    const results = []
    for (const job of jobs) {
      try {
        await handleJob(job)
        results.push({ recipient: job.recipients[0]?.contactId, status: 'sent' })
      } catch (err) {
        results.push({ recipient: job.recipients[0]?.contactId, status: 'failed', error: err?.message })
      }
    }
    res.json({ success: true, results })
  } catch (err) {
    next(err)
  }
}

export async function schedule(req, res, next) {
  try {
    const userId = req.user?.uid || 'anon'
    const payload = req.body || {}
    const authHeader = req.headers.authorization || ''
    const groupContacts = await resolveGroupContacts(payload.groups || [], { Authorization: authHeader })
    const merged = mergeRecipients(payload.recipients || [], groupContacts)
    const jobs = buildJobs(userId, payload, merged)
    const saved = await createScheduledMessages(userId, jobs)
    res.json({ success: true, scheduled: saved.length })
  } catch (err) {
    next(err)
  }
}

export async function getMessageStats(req, res, next) {
  try {
    const userId = req.user?.uid || 'anon'
    const stats = await fetchMessageStats(userId)
    res.json({ success: true, ...stats })
  } catch (err) {
    next(err)
  }
}
