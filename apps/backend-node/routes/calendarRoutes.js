import express from "express"
import dayjs from "dayjs"
import { requireAuth, ensureUserMatches } from "../middleware/auth.js"
import { listEventsForWindow } from "../services/externalEventsService.js"
import { db } from "../services/firebaseAdmin.js"
import { detectJoinProvider } from "../utils/joinLink.js"

const router = express.Router()
const ENABLE_GOOGLE = String(process.env.ENABLE_GOOGLE_CALENDAR || '').toLowerCase()
const ENABLE_OUTLOOK = String(process.env.ENABLE_OUTLOOK_CALENDAR || '').toLowerCase()
const DEFAULT_WINDOW_HOURS = Number(process.env.UPCOMING_MEETINGS_WINDOW_HOURS || 24)
const MAX_LIMIT = 20

function formatEvent(provider, raw) {
  if (!raw?.startTime) return null
  const joinUrl = raw.joinUrl || null
  const eventUrl = raw.eventUrl || raw.raw?.htmlLink || null
  return {
    id: `${provider}:${raw.accountId || 'default'}:${raw.externalId}`,
    provider: provider === 'google_calendar' ? 'google' : 'outlook',
    accountId: raw.accountId || 'default',
    calendarId: raw.calendarId || null,
    title: raw.title || 'Meeting',
    description: raw.description || '',
    startTime: raw.startTime,
    endTime: raw.endTime || null,
    timezone: raw.timezone || null,
    joinUrl,
    joinProvider: raw.joinProvider || detectJoinProvider(joinUrl) || detectJoinProvider(eventUrl) || null,
    eventUrl,
    location: raw.location || '',
    allDay: !!raw.allDay,
    status: raw.status || 'confirmed',
    taskId: raw.taskId || null,
    providerEventId: raw.externalId,
  }
}

function buildKey(event) {
  if (!event) return null
  return `${event.provider || ''}:${event.providerEventId || event.id || ''}`
}

async function fetchTaskFallback(userId, windowStart, windowEnd) {
  const results = []
  try {
    let ref = db
      .collection('tasks')
      .where('userId', '==', userId)
      .where('source', 'in', ['google_calendar', 'outlook_calendar'])
    ref = ref.limit(50)
    const snap = await ref.get()
    const fallback = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
    const startTs = new Date(windowStart).getTime()
    const endTs = new Date(windowEnd).getTime()
    fallback.forEach((task) => {
      const meta = task?.metadata?.externalEvent || {}
      const provider = (task.source || '').includes('outlook') ? 'outlook' : 'google'
      const startTime = meta.startTime || task.start || null
      if (!startTime) return
      const ts = new Date(startTime).getTime()
      if (Number.isFinite(startTs) && ts < startTs) return
      if (Number.isFinite(endTs) && ts > endTs) return
      results.push({ task, meta, provider })
    })
  } catch (err) {
    console.warn('[CalendarRoutes] fallback tasks query failed', err?.message || err)
  }
  return results
}

router.get('/calendar/upcoming', requireAuth, ensureUserMatches, async (req, res) => {
  try {
    const userId = String(req.query.userId || req?.user?.uid || '')
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), MAX_LIMIT)
    const hours = Math.min(Math.max(Number(req.query.hours) || DEFAULT_WINDOW_HOURS, 1), 168)
    const windowStart = new Date().toISOString()
    const windowEnd = dayjs().add(hours, 'hour').toISOString()
    const providers = []
    if (ENABLE_GOOGLE === '1' || ENABLE_GOOGLE === 'true') providers.push('google_calendar')
    if (ENABLE_OUTLOOK === '1' || ENABLE_OUTLOOK === 'true') providers.push('outlook_calendar')

    const events = []
    const existingKeys = new Set()
    for (const provider of providers) {
      try {
        const providerEvents = await listEventsForWindow(userId, provider, {
          windowStart,
          windowEnd,
          statuses: ['confirmed', 'tentative'],
        })
        providerEvents.forEach((evt) => {
          const formatted = formatEvent(provider, evt)
          if (formatted) {
            const key = buildKey(formatted)
            if (key) existingKeys.add(key)
            events.push(formatted)
          }
        })
      } catch (err) {
        console.warn(`[CalendarRoutes] provider ${provider} failed`, err?.message || err)
      }
    }

    if (!events.length) {
      const fallback = await fetchTaskFallback(userId, windowStart, windowEnd)
      fallback.forEach(({ task, meta, provider }) => {
        const startTime = meta.startTime || task.start || null
        if (!startTime) return
        const joinUrl = meta.joinUrl || task.link || null
        const eventUrl = meta.eventUrl || task.link || null
        const event = {
          id: `fallback:${task.id}`,
          provider,
          accountId: meta.accountId || 'default',
          calendarId: meta.calendarId || null,
          title: task.title || 'Meeting',
          description: task.details || '',
          startTime,
          endTime: meta.endTime || task.end || null,
          timezone: meta.timezone || task.timezone || null,
          joinUrl,
          joinProvider:
            meta.joinProvider ||
            task.join?.provider ||
            detectJoinProvider(joinUrl) ||
            detectJoinProvider(eventUrl) ||
            null,
          eventUrl,
          location: meta.location || task.location || '',
          allDay: !!meta.allDay,
          status: 'confirmed',
          taskId: task.id,
          providerEventId: meta.externalId || task.id,
        }
        const key = buildKey(event)
        if (key && existingKeys.has(key)) return
        if (key) existingKeys.add(key)
        events.push(event)
      })
    }

    events.sort((a, b) => {
      const at = new Date(a.startTime || 0).getTime()
      const bt = new Date(b.startTime || 0).getTime()
      return at - bt
    })

    return res.json({ events: events.slice(0, limit) })
  } catch (e) {
    console.error('GET /calendar/upcoming failed', e?.message || e)
    return res.status(500).json({ error: 'Failed to load upcoming meetings' })
  }
})

export default router
