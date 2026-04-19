import dayjs from '../utils/dayjs.js'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import nodeFetch from 'node-fetch'
import { db } from './firebaseAdmin.js'
import { extractJoinLink } from '../utils/joinLink.js'
import { ensureFreshAccessToken, getUserGoogleIntegration, saveUserGoogleIntegration } from './googleOAuth.js'

dayjs.extend(utc)
dayjs.extend(timezone)

const CAL_LIST_URL = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'
const EVENTS_URL = (calId) => `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`
const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : nodeFetch

function headers(tok) {
  return { Authorization: `Bearer ${tok?.access_token}`, 'Content-Type': 'application/json' }
}

function toYMD(d, tz) {
  try {
    const z = tz || (dayjs.tz && dayjs.tz.guess && dayjs.tz.guess()) || 'UTC'
    return dayjs(d).tz(z).format('YYYY-MM-DD')
  } catch { return dayjs(d).format('YYYY-MM-DD') }
}

export async function listCalendars(uid, tokens, accountId = 'primary', profile = null) {
  const resp = await fetchFn(CAL_LIST_URL, { headers: headers(tokens) })
  if (resp.status === 401) throw new Error('Unauthorized with Google; reconnect')
  if (!resp.ok) throw new Error(`Failed to list calendars: ${resp.status}`)
  const json = await resp.json()
  const items = Array.isArray(json?.items) ? json.items : []
  const integration = (await getUserGoogleIntegration(uid)) || {}
  const targetAccountId = accountId || integration.primaryAccountId || 'primary'
  const prevAccount = (integration.accounts || []).find((a) => String(a.accountId) === String(targetAccountId)) || {}
  const prev = Array.isArray(prevAccount.calendars) ? prevAccount.calendars : []
  const prevSel = new Map(prev.map((c) => [String(c.id), !!c.selected]))
  const calendars = items.map((it) => ({
    id: it.id,
    selected: prevSel.get(String(it.id)) ?? (it.primary === true),
    summary: it.summary || it.id,
    timeZone: it.timeZone || prevAccount?.timeZone || undefined,
    primary: !!it.primary,
  }))
  const primaryCalendar = items.find((it) => it.primary)
  const accountEmail = profile?.email || prevAccount?.accountEmail || primaryCalendar?.id || null
  const updatedAccount = {
    ...prevAccount,
    accountId: targetAccountId,
    accountEmail,
    calendars,
    connected: true,
    sync: {
      windowDays: Number.isFinite(prevAccount?.sync?.windowDays) ? Number(prevAccount.sync.windowDays) : 30,
      perCal: prevAccount?.sync?.perCal || {},
      lastRun: prevAccount?.sync?.lastRun || null,
      status: prevAccount?.sync?.status || 'ok',
    },
    updatedAt: new Date(),
  }
  const accounts = Array.isArray(integration.accounts) ? integration.accounts.slice() : []
  const idx = accounts.findIndex((a) => String(a.accountId) === String(targetAccountId))
  if (idx >= 0) accounts.splice(idx, 1, updatedAccount)
  else accounts.push(updatedAccount)
  await saveUserGoogleIntegration(uid, {
    ...integration,
    accounts,
    primaryAccountId: integration.primaryAccountId || targetAccountId,
    connected: accounts.some((a) => a.connected),
    updatedAt: new Date(),
  })
  return calendars
}

function eventTimes(event) {
  const start = event?.start || {}
  const end = event?.end || {}
  // All-day
  if (start?.date) {
    const s = start.date
    const e = end?.date || s
    return { start: s, end: e, allDay: true, tz: start.timeZone || event?.timeZone }
  }
  return {
    start: start.dateTime || start?.date,
    end: end.dateTime || end?.date || start.dateTime || start?.date,
    allDay: false,
    tz: start.timeZone || end.timeZone || event?.timeZone,
  }
}

function stableTaskId(uid, calendarId, eventId) {
  const raw = `gcal_${uid}_${calendarId}_${eventId}`
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 500)
}

export async function upsertTaskFromEvent(uid, calendarId, event, calendarMeta = {}) {
  const { start, end, allDay, tz } = eventTimes(event)
  const ymd = allDay
    ? String(start)
    : toYMD(start, tz || calendarMeta.timeZone || undefined)
  const join = extractJoinLink(event)
  const status = String(event?.status || '').toLowerCase() === 'cancelled' ? 'cancelled' : 'scheduled'
  const id = stableTaskId(uid, calendarId, event.id)
  const payload = {
    userId: uid,
    title: event.summary || 'Meeting',
    details: event.description || event.location || 'Imported from Google Calendar',
    completed: false,
    date: ymd,
    order: 0,
    updatedAt: new Date(),
    // Calendar specific fields (additive, safe for Firestore)
    source: 'google_calendar',
    sourceRef: { provider: 'google', calendarId, eventId: event.id },
    start: start || null,
    end: end || null,
    timezone: tz || calendarMeta.timeZone || null,
    join: join || null,
    attendees: Array.isArray(event?.attendees) ? event.attendees.map(a => ({ email: a.email, responseStatus: a.responseStatus })) : [],
    status,
    visibility: event.visibility || 'private',
    createdFrom: 'importer_v1',
    remind: true,
    allDay: !!allDay,
    organizer: event?.organizer?.email || null,
    htmlLink: event?.htmlLink || null,
  }
  // Merge if exists
  await db.collection('tasks').doc(id).set({ ...payload, createdAt: new Date() }, { merge: true })
  return id
}

async function initialSync(uid, calendar, tokens, windowDays = 30) {
  const timeMin = new Date(Date.now() - 60 * 60 * 1000).toISOString() // now - 1h
  const timeMax = new Date(Date.now() + Number(windowDays) * 24 * 60 * 60 * 1000).toISOString()
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    showDeleted: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
  })
  const resp = await fetchFn(`${EVENTS_URL(calendar.id)}?${params.toString()}`, { headers: headers(tokens) })
  if (resp.status === 401) throw new Error('Unauthorized with Google; reconnect')
  if (!resp.ok) throw new Error(`events.list failed: ${resp.status}`)
  const json = await resp.json()
  const items = Array.isArray(json.items) ? json.items : []
  for (const ev of items) {
    await upsertTaskFromEvent(uid, calendar.id, ev, calendar)
  }
  return json.nextSyncToken || null
}

async function incrementalSync(uid, calendar, tokens, syncToken) {
  const params = new URLSearchParams({ syncToken })
  const resp = await fetchFn(`${EVENTS_URL(calendar.id)}?${params.toString()}`, { headers: headers(tokens) })
  if (resp.status === 401) throw new Error('Unauthorized with Google; reconnect')
  if (resp.status === 410) return { reset: true, nextSyncToken: null, count: 0 } // token invalidated; force full
  if (!resp.ok) throw new Error(`events.list (sync) failed: ${resp.status}`)
  const json = await resp.json()
  const items = Array.isArray(json.items) ? json.items : []
  let count = 0
  for (const ev of items) {
    // Handle deletions/cancellations
    await upsertTaskFromEvent(uid, calendar.id, ev, calendar)
    count++
  }
  return { reset: false, nextSyncToken: json.nextSyncToken || null, count }
}

export async function syncCalendar(uid, calendarId, tokens, accountId = 'primary') {
  const { integration } = await ensureFreshAccessToken(uid, accountId)
  const integ = integration || (await getUserGoogleIntegration(uid)) || {}
  const account = (integ.accounts || []).find((a) => String(a.accountId) === String(accountId)) || {}
  const windowDays = account?.sync?.windowDays || integ?.sync?.windowDays || 30
  const calendars = Array.isArray(account?.calendars) ? account.calendars : []
  const calendar = calendars.find((c) => String(c.id) === String(calendarId))
  if (!calendar) throw new Error('Calendar not found or not authorized')
  const perCal = (account?.sync?.perCal || {})
  const st = perCal[calendarId]?.syncToken || null
  try {
    let nextToken = st
    let count = 0
    if (!st) {
      nextToken = await initialSync(uid, calendar, tokens, windowDays)
    } else {
      const r = await incrementalSync(uid, calendar, tokens, st)
      if (r.reset) {
        nextToken = await initialSync(uid, calendar, tokens, windowDays)
      } else {
        nextToken = r.nextSyncToken
        count = r.count
      }
    }
    const mergedAccount = {
      ...account,
      sync: {
        ...(account.sync || {}),
        lastRun: new Date().toISOString(),
        status: 'ok',
        perCal: {
          ...(account?.sync?.perCal || {}),
          [calendarId]: { ...(account?.sync?.perCal?.[calendarId] || {}), syncToken: nextToken, lastFullSync: !st ? new Date().toISOString() : (account?.sync?.perCal?.[calendarId]?.lastFullSync || null) },
        },
      },
    }
    const accounts = Array.isArray(integ.accounts) ? integ.accounts.map((a) => (String(a.accountId) === String(accountId) ? mergedAccount : a)) : [mergedAccount]
    await saveUserGoogleIntegration(uid, { ...integ, accounts, connected: accounts.some((a) => a.connected) })
    return { ok: true, updated: count }
  } catch (e) {
    const mergedAccount = {
      ...account,
      sync: {
        ...(account.sync || {}),
        lastRun: new Date().toISOString(),
        status: /401|Unauthorized/i.test(e?.message || '') ? 'auth_error' : 'error',
      },
    }
    const accounts = Array.isArray(integ.accounts) ? integ.accounts.map((a) => (String(a.accountId) === String(accountId) ? mergedAccount : a)) : [mergedAccount]
    await saveUserGoogleIntegration(uid, { ...integ, accounts, connected: accounts.some((a) => a.connected) })
    throw e
  }
}

export async function syncSelectedCalendars(uid, tokens, accountId = 'primary') {
  const integ = (await getUserGoogleIntegration(uid)) || {}
  const account = (integ.accounts || []).find((a) => String(a.accountId) === String(accountId)) || {}
  const calendars = Array.isArray(account?.calendars) ? account.calendars.filter((c) => !!c.selected) : []
  let total = 0
  for (const c of calendars) {
    try {
      const r = await syncCalendar(uid, c.id, tokens, accountId)
      total += r?.updated || 0
    } catch (e) {
      console.warn(`Sync failed for cal=${c.id}:`, e?.message || e)
    }
  }
  return total
}
