import cron from 'node-cron'
import dayjs from '../utils/dayjs.js'
import { db } from '../services/firebaseAdmin.js'
import { sendEmail } from '../services/emailService.js'
import { getRemoteFeatureFlags } from '../services/featureFlagService.js'
import { getIntelligenceAccess, reserveIntelligenceRequest } from '../services/intelligenceUsageService.js'
import {
  buildIntelligenceCacheKey,
  cacheSharedIntelligenceBrief,
  createIntelligenceBrief,
  getSharedCachedIntelligenceBrief,
} from '../services/intelligenceService.js'
import { normalizeAgentSchedule, resolveCustomIntelligenceProfiles } from '../services/intelligenceAgentService.js'
import { normalizeCronSpec } from '../utils/cronSpec.js'

const AGENTS_COLLECTION = 'intelligence_agents'
const USERS_COLLECTION = 'users'
const DEFAULT_CRON = '*/5 * * * *'
const DEFAULT_MAX_AGENTS_PER_USER = 3

function enabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function schedulerEnabled() {
  return enabled(process.env.ENABLE_INTELLIGENCE_MORNING_EMAILS)
}

function maxAgentsPerUser() {
  const configured = Number(process.env.INTELLIGENCE_MORNING_EMAIL_MAX_AGENTS_PER_USER)
  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.floor(configured), 10)
    : DEFAULT_MAX_AGENTS_PER_USER
}

function parseTime(value) {
  const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : { hour: 8, minute: 0 }
}

function timestampMillis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function scheduleFor(agent) {
  const data = agent?.data?.() || agent || {}
  return normalizeAgentSchedule(data.schedule, {
    enabled: false,
    time: '08:00',
    timezone: data.timezone || 'UTC',
  })
}

function userEmail(user) {
  return String(user?.email || user?.profile?.email || user?.settings?.email || '').trim()
}

function userTimezone(user) {
  return user?.timezone || user?.profile?.timezone || user?.settings?.timezone || user?.preferences?.timezone || 'UTC'
}

function isDueNow(agent, user, now = dayjs.utc()) {
  const schedule = scheduleFor(agent)
  if (!schedule.enabled) return null
  const { hour, minute } = parseTime(schedule.time)
  const timezone = schedule.timezone || userTimezone(user)
  const localNow = now.tz(timezone)
  const nowTotal = localNow.hour() * 60 + localNow.minute()
  const targetTotal = hour * 60 + minute
  if (nowTotal < targetTotal || nowTotal >= targetTotal + 5) return null
  return { schedule, localDate: localNow.format('YYYY-MM-DD'), timezone }
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeUrl(value) {
  const url = String(value || '').trim()
  return /^https?:\/\//i.test(url) ? url : ''
}

function appUrl() {
  return String(process.env.INTELLIGENCE_APP_URL || process.env.APP_URL || 'https://plancraftai.com/intelligence').replace(/\/$/, '')
}

function renderSummaryHtml(value) {
  return escapeHtml(value)
    .replace(/^###?\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/\n/g, '<br>')
}

function buildEmail(agent, brief) {
  const data = agent?.data?.() || agent || {}
  const name = String(data.name || 'Your intelligence desk').trim()
  const summary = String(brief?.synthesis || '').trim()
  const sources = Array.isArray(brief?.sources) ? brief.sources.filter((source) => safeUrl(source?.url)).slice(0, 12) : []
  const subject = `Morning intelligence · ${name}`
  const link = appUrl()
  const htmlSources = sources.length
    ? `<h2 style="font-size:18px;margin:28px 0 12px;color:#172033">Reference links</h2><ul style="padding-left:20px;margin:0">${sources.map((source) => `<li style="margin:8px 0"><a href="${escapeHtml(safeUrl(source.url))}" style="color:#5146e5">${escapeHtml(source.title || source.url)}</a></li>`).join('')}</ul>`
    : '<p style="color:#667085">No source links were returned for this brief.</p>'
  const textSources = sources.length
    ? `\n\nReference links:\n${sources.map((source) => `- ${source.title || source.url}: ${source.url}`).join('\n')}`
    : '\n\nNo source links were returned for this brief.'

  return {
    subject,
    html: `<div style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:680px;margin:0 auto;padding:32px 24px;color:#172033;background:#ffffff"><p style="margin:0 0 10px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#5146e5;font-weight:700">PlanCraft Intelligence</p><h1 style="margin:0 0 8px;font-size:28px;line-height:1.2">${escapeHtml(name)}</h1><p style="margin:0 0 24px;color:#667085">Your scheduled morning brief · ${escapeHtml(new Date(brief.generatedAt || Date.now()).toLocaleDateString())}</p><div style="border:1px solid #e4e7ec;border-radius:16px;padding:20px;background:#f8f9fc;font-size:15px;line-height:1.7">${renderSummaryHtml(summary)}</div>${htmlSources}<p style="margin:28px 0 0"><a href="${escapeHtml(link)}" style="display:inline-block;background:#5b3df5;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700">Open in PlanCraft</a></p><p style="margin:24px 0 0;font-size:12px;color:#98a2b3">This is read-only research. Verify important details at the linked sources.</p></div>`,
    text: `${name}\n\n${summary}\n\nOpen in PlanCraft: ${link}${textSources}\n\nThis is read-only research. Verify important details at the linked sources.`,
  }
}

async function fetchScheduledAgents() {
  const snapshot = await db.collection(AGENTS_COLLECTION).get()
  return snapshot.docs.filter((doc) => scheduleFor(doc).enabled)
}

async function fetchUser(userId) {
  const snapshot = await db.collection(USERS_COLLECTION).doc(String(userId)).get()
  return snapshot.exists ? { id: snapshot.id, ...(snapshot.data() || {}) } : null
}

async function acquireAgentRun(agentRef, localDate) {
  let acquired = false
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(agentRef)
    if (!snapshot.exists) return
    const data = snapshot.data() || {}
    const schedule = scheduleFor(data)
    if (!schedule.enabled || data?.schedule?.lastRunDate === localDate) return
    const runningDate = data?.schedule?.runningDate
    const runningAt = timestampMillis(data?.schedule?.runningAt)
    if (runningDate === localDate && runningAt && Date.now() - runningAt < 30 * 60 * 1000) return
    transaction.update(agentRef, {
      'schedule.runningDate': localDate,
      'schedule.runningAt': new Date(),
    })
    acquired = true
  })
  return acquired
}

async function finishAgentRun(agentRef, localDate, status, details = {}) {
  await agentRef.update({
    'schedule.lastRunDate': localDate,
    'schedule.lastRunAt': new Date(),
    'schedule.lastRunStatus': status,
    'schedule.lastRunError': details.error || null,
    'schedule.runningDate': null,
    'schedule.runningAt': null,
  })
}

async function clearAgentRun(agentRef, details = {}) {
  await agentRef.update({
    'schedule.lastRunStatus': 'failed',
    'schedule.lastRunError': details.error || 'Morning email failed',
    'schedule.runningDate': null,
    'schedule.runningAt': null,
  })
}

async function createScheduledBrief(userId, agentId) {
  const customAgents = await resolveCustomIntelligenceProfiles(userId, [agentId])
  if (!customAgents.length) throw new Error('Intelligence desk is no longer available')
  const access = await getIntelligenceAccess(userId)
  if (!access.ok) {
    const error = new Error('Intelligence Desk requires a Premium plan')
    error.code = 'intelligence_premium_required'
    throw error
  }
  const customAgentVersions = customAgents.map((agent) => agent.agentVersion || '')
  const cacheInput = {
    question: '',
    interests: '',
    agentIds: [],
    customAgentIds: customAgents.map((agent) => agent.id),
    customAgentVersions,
    goalContext: null,
  }
  const cacheKey = buildIntelligenceCacheKey(cacheInput)
  const cached = await getSharedCachedIntelligenceBrief(cacheKey)
  if (cached) return { brief: cached, cached: true }

  const reservation = await reserveIntelligenceRequest(userId, { access: access.access })
  if (!reservation.ok) {
    const error = new Error(reservation.code === 'intelligence_monthly_limit_reached'
      ? 'Monthly Intelligence Desk limit reached'
      : 'Could not reserve Intelligence Desk usage')
    error.code = reservation.code
    throw error
  }

  const brief = await createIntelligenceBrief({ customAgents })
  await cacheSharedIntelligenceBrief(cacheKey, brief)
  return { brief, cached: false }
}

async function sendAgentMorningEmail(agent, user) {
  const email = userEmail(user)
  if (!email) return { status: 'skipped', reason: 'no_email' }

  const { brief, cached } = await createScheduledBrief(user.id, agent.id)
  const message = buildEmail(agent, brief)
  const result = await sendEmail({
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text,
    tags: ['intelligence', 'morning-brief'],
    metadata: { agentId: agent.id, userId: user.id, cached: String(cached) },
  })
  if (result?.success !== true) {
    const error = new Error(result?.error || result?.reason || 'Email provider did not send the message')
    error.code = result?.reason || 'email_delivery_failed'
    throw error
  }
  return { status: 'sent', cached }
}

export async function runIntelligenceMorningEmailsOnce(now = dayjs.utc()) {
  if (!schedulerEnabled()) {
    console.log('[IntelligenceEmail] skipped (ENABLE_INTELLIGENCE_MORNING_EMAILS is off)')
    return { sent: 0, skipped: 0, failed: 0, reason: 'flag_off' }
  }

  const flags = await getRemoteFeatureFlags()
  if (!flags?.flags?.INTELLIGENCE_DESK) {
    console.log('[IntelligenceEmail] skipped (INTELLIGENCE_DESK remote flag is off)')
    return { sent: 0, skipped: 0, failed: 0, reason: 'feature_flag_off' }
  }

  const agents = await fetchScheduledAgents()
  const users = new Map()
  const dueByUser = new Map()
  for (const agent of agents) {
    const userId = String(agent.data()?.userId || '').trim()
    if (!userId) continue
    const user = users.has(userId) ? users.get(userId) : await fetchUser(userId)
    users.set(userId, user)
    if (!user) continue
    const due = isDueNow(agent, user, now)
    if (!due) continue
    const list = dueByUser.get(userId) || []
    if (list.length < maxAgentsPerUser()) list.push({ agent, due })
    dueByUser.set(userId, list)
  }

  const stats = { sent: 0, skipped: 0, failed: 0 }
  for (const [userId, entries] of dueByUser.entries()) {
    const user = users.get(userId)
    for (const { agent, due } of entries) {
      const reference = db.collection(AGENTS_COLLECTION).doc(agent.id)
      try {
        if (!(await acquireAgentRun(reference, due.localDate))) {
          stats.skipped += 1
          continue
        }
        const result = await sendAgentMorningEmail(agent, user)
        await finishAgentRun(reference, due.localDate, result.status, { error: result.reason })
        if (result.status === 'sent') stats.sent += 1
        else stats.skipped += 1
      } catch (error) {
        stats.failed += 1
        console.error('[IntelligenceEmail] delivery failed', { userId, agentId: agent.id, error: error?.message || error })
        try {
          await clearAgentRun(reference, { error: error?.message || 'Morning email failed' })
        } catch (lockError) {
          console.error('[IntelligenceEmail] failed to clear run lock', lockError?.message || lockError)
        }
      }
    }
  }
  console.log('[IntelligenceEmail] morning run finished', { agents: agents.length, ...stats })
  return stats
}

export function initIntelligenceMorningEmailScheduler() {
  if (!schedulerEnabled()) {
    console.log('[IntelligenceEmail] scheduler disabled (set ENABLE_INTELLIGENCE_MORNING_EMAILS=1 to enable)')
    return
  }
  const spec = normalizeCronSpec(process.env.INTELLIGENCE_MORNING_EMAIL_CRON, DEFAULT_CRON)
  console.log(`[IntelligenceEmail] scheduler enabled (spec=${spec})`)
  cron.schedule(spec, async () => {
    try {
      await runIntelligenceMorningEmailsOnce()
    } catch (error) {
      console.error('[IntelligenceEmail] cron error', error?.message || error)
    }
  })
}

export default {
  initIntelligenceMorningEmailScheduler,
  runIntelligenceMorningEmailsOnce,
}
