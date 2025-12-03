import admin from 'firebase-admin'
import { userCollection, serverTs, sanitizeForFirestore } from '../utils/db.js'
import { enqueuePostingJob } from '../utils/postingClient.js'

function requireUid(req) {
  const uid = req.user?.uid
  if (!uid) throw new Error('Missing user id')
  return uid
}

function dropUndefined(obj = {}) {
  return sanitizeForFirestore(obj)
}

function parseDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function toTimestamp(value) {
  const d = parseDate(value)
  return d ? admin.firestore.Timestamp.fromDate(d) : null
}

function computeNextOccurrence(month, day) {
  if (!month || !day) return null
  const now = new Date()
  let year = now.getFullYear()
  let candidate = new Date(Date.UTC(year, month - 1, day))
  if (candidate < now) {
    year += 1
    candidate = new Date(Date.UTC(year, month - 1, day))
  }
  return candidate
}

function mapDateField(value) {
  if (!value) return null
  if (typeof value === 'object' && value.dateTime) {
    const d = new Date(value.dateTime)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (value?.toDate) return value.toDate()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function serializeEvent(id, data = {}) {
  const startDate = mapDateField(data.start)
  const endDate = mapDateField(data.end)
  return sanitizeForFirestore({
    id,
    ...data,
    start: startDate ? startDate.toISOString() : data.start || null,
    end: endDate ? endDate.toISOString() : data.end || null,
  })
}

// ---------- OVERVIEW ----------
export async function getOverview(req, res, next) {
  try {
    const uid = requireUid(req)
    const contactsCol = userCollection(uid, 'contacts')
    const occasionsCol = userCollection(uid, 'occasions')
    const eventsCol = userCollection(uid, 'events')
    const issuesCol = userCollection(uid, 'issues')
    const messagesCol = userCollection(uid, 'messages')

    const [contactsSnap, occasionsSnap, eventsSnap, issuesSnap, messagesSnap] = await Promise.all([
      contactsCol.get(),
      occasionsCol.get(),
      eventsCol.get(),
      issuesCol.get(),
      messagesCol.get(),
    ])

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const eventsThisMonth = eventsSnap.docs.filter((d) => {
      const s = mapDateField(d.get('start')) || mapDateField(d.get('startDateTime'))
      return s && s >= startOfMonth && s < endOfMonth
    }).length

    const upcomingOccasions = occasionsSnap.docs.filter((d) => {
      const next = mapDateField(d.get('nextOccurrence')) || mapDateField(d.get('date'))
      return next && next >= now && next <= horizon
    }).length

    const openIssues = issuesSnap.docs.filter((d) => {
      const status = (d.get('status') || '').toLowerCase()
      return status !== 'closed' && status !== 'resolved'
    }).length

    const scheduledMessages = messagesSnap.docs.filter((d) => {
      const status = (d.get('status') || '').toLowerCase()
      const scheduled = mapDateField(d.get('scheduledAt'))
      return status === 'queued' || (!!scheduled && scheduled >= now)
    }).length

    return res.json({
      success: true,
      overview: {
        contacts: contactsSnap.size,
        eventsThisMonth,
        upcomingOccasions,
        openIssues,
        scheduledMessages,
      },
      stats: {
        eventsThisMonth,
        upcomingOccasions,
        openIssues,
        scheduledMessages,
      },
    })
  } catch (err) {
    next(err)
  }
}

// Lightweight stats endpoints for legacy dashboard calls
export async function getEventsStats(req, res, next) {
  try {
    const uid = requireUid(req)
    const snap = await userCollection(uid, 'events').get()
    const total = snap.size
    const planned = snap.docs.filter((d) => (d.get('status') || 'planned') === 'planned').length
    const done = snap.docs.filter((d) => (d.get('status') || '').toLowerCase() === 'done').length
    res.json({ success: true, total, planned, done })
  } catch (err) {
    next(err)
  }
}

export async function getUpcomingOccasions(req, res, next) {
  try {
    const uid = requireUid(req)
    const windowDays = Number.parseInt(req.query.windowDays || '30', 10)
    const now = new Date()
    const horizon = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000)
    const snap = await userCollection(uid, 'occasions').orderBy('nextOccurrence', 'asc').limit(50).get()
    const occasions = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((o) => {
        const next = mapDateField(o.nextOccurrence) || mapDateField(o.date)
        return next && next >= now && next <= horizon
      })
    res.json({ success: true, occasions })
  } catch (err) {
    next(err)
  }
}

export async function getRecentIssues(req, res, next) {
  try {
    const uid = requireUid(req)
    const snap = await userCollection(uid, 'issues').orderBy('updatedAt', 'desc').limit(10).get()
    const issues = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json({ success: true, issues })
  } catch (err) {
    next(err)
  }
}

// ---------- CONTACTS ----------
export async function listContacts(req, res, next) {
  try {
    const uid = requireUid(req)
    const snap = await userCollection(uid, 'contacts').orderBy('createdAt', 'desc').get()
    const contacts = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json({ success: true, contacts })
  } catch (err) {
    next(err)
  }
}

export async function createContact(req, res, next) {
  try {
    const uid = requireUid(req)
    const data = req.body || {}
    const col = userCollection(uid, 'contacts')
    const docRef = col.doc()
    const payload = sanitizeForFirestore({
      ownerId: uid,
      name: data.name || '',
      email: data.email || null,
      phone: data.phone || null,
      tags: data.tags || [],
      groupIds: data.groupIds || data.contactGroupIds || [],
      location: data.location || data.locationText || null,
      notes: data.notes || null,
      timezone: data.timezone || null,
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
    await docRef.set(payload)
    res.status(201).json({ success: true, contact: { id: docRef.id, ...payload } })
  } catch (err) {
    next(err)
  }
}

export async function updateContact(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    const updates = sanitizeForFirestore({ ...(req.body || {}), updatedAt: serverTs() })
    const docRef = userCollection(uid, 'contacts').doc(id)
    await docRef.set(updates, { merge: true })
    const snap = await docRef.get()
    res.json({ success: true, contact: { id: snap.id, ...snap.data() } })
  } catch (err) {
    next(err)
  }
}

export async function deleteContact(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    await userCollection(uid, 'contacts').doc(id).delete()
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ---------- CONTACT GROUPS ----------
export async function listContactGroups(req, res, next) {
  try {
    const uid = requireUid(req)
    const snap = await userCollection(uid, 'contactGroups').orderBy('createdAt', 'desc').get()
    const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json({ success: true, groups })
  } catch (err) {
    next(err)
  }
}

export async function createContactGroup(req, res, next) {
  try {
    const uid = requireUid(req)
    const data = req.body || {}
    const col = userCollection(uid, 'contactGroups')
    const docRef = col.doc()
    const payload = sanitizeForFirestore({
      ownerId: uid,
      name: data.name || '',
      description: data.description || null,
      memberIds: data.memberIds || data.contactIds || [],
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
    await docRef.set(payload)
    res.status(201).json({ success: true, group: { id: docRef.id, ...payload } })
  } catch (err) {
    next(err)
  }
}

export async function updateContactGroup(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    const updates = sanitizeForFirestore({ ...(req.body || {}), updatedAt: serverTs() })
    const docRef = userCollection(uid, 'contactGroups').doc(id)
    await docRef.set(updates, { merge: true })
    const snap = await docRef.get()
    res.json({ success: true, group: { id: snap.id, ...snap.data() } })
  } catch (err) {
    next(err)
  }
}

export async function deleteContactGroup(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    await userCollection(uid, 'contactGroups').doc(id).delete()
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ---------- OCCASIONS ----------
export async function listOccasions(req, res, next) {
  try {
    const uid = requireUid(req)
    const snap = await userCollection(uid, 'occasions').orderBy('nextOccurrence', 'asc').get()
    const occasions = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json({ success: true, occasions })
  } catch (err) {
    next(err)
  }
}

export async function createOccasion(req, res, next) {
  try {
    const uid = requireUid(req)
    const data = req.body || {}
    const col = userCollection(uid, 'occasions')
    const docRef = col.doc()
    const month = data.month || (data.date ? new Date(data.date).getMonth() + 1 : null)
    const day = data.day || (data.date ? new Date(data.date).getDate() : null)
    const next = computeNextOccurrence(month, day)
    const payload = sanitizeForFirestore({
      ownerId: uid,
      contactId: data.contactId || null,
      type: data.type || 'other',
      title: data.title || data.type || '',
      month,
      day,
      date: data.date || null,
      nextOccurrence: next ? admin.firestore.Timestamp.fromDate(next) : null,
      note: data.note || data.notes || null,
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
    await docRef.set(payload)
    res.status(201).json({ success: true, occasion: { id: docRef.id, ...payload } })
  } catch (err) {
    next(err)
  }
}

export async function updateOccasion(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    const data = req.body || {}
    const month = data.month || (data.date ? new Date(data.date).getMonth() + 1 : undefined)
    const day = data.day || (data.date ? new Date(data.date).getDate() : undefined)
    const next = computeNextOccurrence(month, day)
    const updates = sanitizeForFirestore({
      ...data,
      month,
      day,
      nextOccurrence: next ? admin.firestore.Timestamp.fromDate(next) : undefined,
      updatedAt: serverTs(),
    })
    const docRef = userCollection(uid, 'occasions').doc(id)
    await docRef.set(updates, { merge: true })
    const snap = await docRef.get()
    res.json({ success: true, occasion: { id: snap.id, ...snap.data() } })
  } catch (err) {
    next(err)
  }
}

export async function deleteOccasion(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    await userCollection(uid, 'occasions').doc(id).delete()
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ---------- EVENTS ----------
export async function listEvents(req, res, next) {
  try {
    const uid = requireUid(req)
    const { start, end, from, to, thisMonth } = req.query
    const now = new Date()
    const fromDate = thisMonth ? new Date(now.getFullYear(), now.getMonth(), 1) : parseDate(start || from)
    const toDate = thisMonth ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : parseDate(end || to)
    const snap = await userCollection(uid, 'events').orderBy('startDateTime', 'desc').limit(400).get()
    const events = snap.docs
      .map((d) => serializeEvent(d.id, d.data() || {}))
      .filter((evt) => {
        const s = mapDateField(evt.start) || mapDateField(evt.startDateTime)
        if (fromDate && s && s < fromDate) return false
        if (toDate && s && s > toDate) return false
        return true
      })
    res.json({ success: true, events })
  } catch (err) {
    next(err)
  }
}

export async function createEvent(req, res, next) {
  try {
    const uid = requireUid(req)
    const data = dropUndefined(req.body || {})
    const col = userCollection(uid, 'events')
    const docRef = col.doc()
    const startDate = parseDate(data.start?.dateTime || data.startDate || data.start || data.date)
    const startTimezone = data.start?.timezone || data.timezone || 'UTC'
    const endDate = parseDate(data.end?.dateTime || data.endDate || data.end)
    const endTimezone = data.end?.timezone || data.timezone || startTimezone
    const payload = sanitizeForFirestore({
      ownerId: uid,
      contactIds: data.contactIds || (data.contactId ? [data.contactId] : []),
      contactId: data.contactId || null,
      title: data.title || '',
      description: data.description || data.notes || null,
      start: startDate
        ? { dateTime: startDate.toISOString(), timezone: startTimezone }
        : null,
      startDateTime: startDate ? startDate.toISOString() : null,
      startTimezone,
      startTimestamp: toTimestamp(startDate),
      end: endDate
        ? { dateTime: endDate.toISOString(), timezone: endTimezone }
        : null,
      endDateTime: endDate ? endDate.toISOString() : null,
      endTimezone,
      endTimestamp: toTimestamp(endDate),
      locationText: data.locationText || data.location || null,
      locationGeo: data.locationGeo || null,
      tags: data.tags || [],
      occasionId: data.occasionId || null,
      channel: data.channel || 'other',
      status: data.status || 'planned',
      createdAt: serverTs(),
      updatedAt: serverTs(),
    })
    await docRef.set(payload)

    console.info('[leader] event created', {
      type: 'leader_event_created',
      leaderId: uid,
      eventId: docRef.id,
      title: payload.title,
      start: payload.start,
      locationText: payload.locationText,
    })

    res.status(201).json({ success: true, event: serializeEvent(docRef.id, payload) })
  } catch (err) {
    next(err)
  }
}

export async function updateEvent(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    const updates = sanitizeForFirestore({
      ...(req.body || {}),
      start: req.body?.start?.dateTime
        ? { dateTime: req.body.start.dateTime, timezone: req.body.start.timezone || req.body.timezone || 'UTC' }
        : undefined,
      startDateTime: req.body?.start?.dateTime || req.body?.startDate || req.body?.date || undefined,
      startTimezone: req.body?.start?.timezone || req.body?.timezone,
      startTimestamp: toTimestamp(req.body?.start?.dateTime || req.body?.startDate || req.body?.date),
      end: req.body?.end?.dateTime
        ? { dateTime: req.body.end.dateTime, timezone: req.body.end.timezone || req.body.timezone || req.body.start?.timezone }
        : undefined,
      endDateTime: req.body?.end?.dateTime || req.body?.endDate || undefined,
      endTimezone: req.body?.end?.timezone || req.body?.timezone,
      endTimestamp: toTimestamp(req.body?.end?.dateTime || req.body?.end || req.body?.endDate),
      updatedAt: serverTs(),
    })
    const docRef = userCollection(uid, 'events').doc(id)
    await docRef.set(updates, { merge: true })
    const snap = await docRef.get()
    res.json({ success: true, event: serializeEvent(snap.id, snap.data() || {}) })
  } catch (err) {
    next(err)
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    await userCollection(uid, 'events').doc(id).delete()
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ---------- MESSAGES ----------
async function loadContact(uid, id) {
  if (!id) return null
  const snap = await userCollection(uid, 'contacts').doc(id).get()
  return snap.exists ? { id: snap.id, ...snap.data() } : null
}

function resolveRecipient(channel, data = {}, contact = null) {
  if (data.to) return data.to
  const lower = (channel || '').toLowerCase()
  if (lower === 'email') return data.email || contact?.email || null
  return data.phone || contact?.phone || null
}

export async function listMessages(req, res, next) {
  try {
    const uid = requireUid(req)
    const { eventId } = req.query || {}
    let query = userCollection(uid, 'messages').orderBy('createdAt', 'desc').limit(100)
    if (eventId) query = query.where('eventId', '==', eventId)
    const snap = await query.get()
    const messages = snap.docs.map((d) => {
      const data = d.data() || {}
      const scheduledAt = mapDateField(data.scheduledAt)
      return sanitizeForFirestore({
        id: d.id,
        ...data,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
      })
    })
    res.json({ success: true, messages })
  } catch (err) {
    next(err)
  }
}

export async function getRecentMessages(req, res, next) {
  try {
    const uid = requireUid(req)
    const snap = await userCollection(uid, 'messages').orderBy('createdAt', 'desc').limit(20).get()
    const messages = snap.docs.map((d) => {
      const data = d.data() || {}
      const scheduledAt = mapDateField(data.scheduledAt)
      return sanitizeForFirestore({
        id: d.id,
        ...data,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
      })
    })
    res.json({ success: true, messages })
  } catch (err) {
    next(err)
  }
}

export async function createMessage(req, res, next) {
  try {
    const uid = requireUid(req)
    const data = req.body || {}
    const contactIds = Array.isArray(data.contactIds)
      ? data.contactIds
      : data.contactId
        ? [data.contactId]
        : []
    const primaryContact = contactIds.length ? await loadContact(uid, contactIds[0]) : null
    const scheduled = parseDate(data.scheduledAt) || null
    const channel = data.channel || 'custom'
    const to = resolveRecipient(channel, data, primaryContact)
    const col = userCollection(uid, 'messages')
    const docRef = col.doc()
    const payload = sanitizeForFirestore({
      ownerId: uid,
      contactIds,
      eventId: data.eventId || null,
      occasionId: data.occasionId || null,
      channel,
      fromProfileId: data.fromProfileId || 'default',
      to: to || null,
      body: data.body || '',
      bodyPreview: (data.body || '').slice(0, 180),
      scheduledAt: scheduled ? admin.firestore.Timestamp.fromDate(scheduled) : null,
      status: ['sms', 'whatsapp', 'email', 'call'].includes(channel) ? 'scheduled' : data.status || 'draft',
      createdAt: serverTs(),
      updatedAt: serverTs(),
      meta: data.meta || {},
    })
    await docRef.set(payload)

    let job = null
    if (['sms', 'whatsapp', 'email'].includes(channel)) {
      const jobBody = {
        jobType: 'leader_outreach',
        channel,
        fromProfileId: payload.fromProfileId || 'default',
        scheduledAt: (scheduled || new Date()).toISOString(),
        payload: {
          to: payload.to,
          body: payload.body,
          fromProfileId: payload.fromProfileId || 'default',
          contactIds,
        },
        meta: {
          leaderId: uid,
          occasionId: payload.occasionId || null,
          eventId: payload.eventId || null,
          messageId: `leaders/${uid}/messages/${docRef.id}`,
        },
      }
      try {
        job = await enqueuePostingJob(jobBody)
        await docRef.set(
          sanitizeForFirestore({
            status: 'scheduled',
            jobId: job?.jobId || job?.id || null,
            updatedAt: serverTs(),
          }),
          { merge: true },
        )
      } catch (err) {
        console.error('[leader] Failed to enqueue posting job', err?.message || err)
        await docRef.set(
          {
            status: 'failed',
            error: err?.message || 'Failed to queue message',
            updatedAt: serverTs(),
          },
          { merge: true },
        )
      }
    }

    const snap = await docRef.get()
    res.status(201).json({ success: true, message: { id: docRef.id, ...snap.data() }, job })
  } catch (err) {
    next(err)
  }
}

export async function updateMessage(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    const updates = sanitizeForFirestore({
      ...(req.body || {}),
      updatedAt: serverTs(),
    })
    const docRef = userCollection(uid, 'messages').doc(id)
    await docRef.set(updates, { merge: true })
    const snap = await docRef.get()
    res.json({ success: true, message: { id: snap.id, ...snap.data() } })
  } catch (err) {
    next(err)
  }
}

export async function sendMessageNow(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    const snap = await userCollection(uid, 'messages').doc(id).get()
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Message not found' })
    const data = snap.data() || {}
    const channel = data.channel || 'sms'
    const scheduled = new Date()
    const jobBody = {
      jobType: 'leader_outreach',
      channel,
      fromProfileId: data.fromProfileId || 'default',
      scheduledAt: scheduled.toISOString(),
      payload: {
        to: data.to,
        body: data.body,
        fromProfileId: data.fromProfileId || 'default',
        contactIds: data.contactIds || [],
      },
      meta: {
        leaderId: uid,
        occasionId: data.occasionId || null,
        eventId: data.eventId || null,
        messageId: `leaders/${uid}/messages/${id}`,
      },
    }
    let job = null
    try {
      job = await enqueuePostingJob(jobBody)
      await userCollection(uid, 'messages')
        .doc(id)
        .set(
          {
            status: 'scheduled',
            scheduledAt: admin.firestore.Timestamp.fromDate(scheduled),
            jobId: job?.jobId || job?.id || null,
            updatedAt: serverTs(),
          },
          { merge: true },
        )
    } catch (err) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to send' })
    }
    const updated = await userCollection(uid, 'messages').doc(id).get()
    res.json({ success: true, message: { id, ...updated.data() }, job })
  } catch (err) {
    next(err)
  }
}

// ---------- ISSUES & TIMELINE ----------
export async function listIssues(req, res, next) {
  try {
    const uid = requireUid(req)
    const snap = await userCollection(uid, 'issues').orderBy('createdAt', 'desc').limit(200).get()
    const issues = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json({ success: true, issues })
  } catch (err) {
    next(err)
  }
}

export async function createIssue(req, res, next) {
  try {
    const uid = requireUid(req)
    const data = req.body || {}
    const col = userCollection(uid, 'issues')
    const docRef = col.doc()
    const payload = sanitizeForFirestore({
      ownerId: uid,
      contactId: data.contactId || null,
      eventId: data.eventId || null,
      title: data.title || '',
      status: data.status || 'open',
      severity: data.severity || data.priority || 'medium',
      notes: data.notes || data.summary || null,
      createdAt: serverTs(),
      updatedAt: serverTs(),
      lastActivityAt: serverTs(),
    })
    await docRef.set(payload)
    res.status(201).json({ success: true, issue: { id: docRef.id, ...payload } })
  } catch (err) {
    next(err)
  }
}

export async function updateIssue(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    const updates = sanitizeForFirestore({
      ...(req.body || {}),
      updatedAt: serverTs(),
      lastActivityAt: serverTs(),
    })
    const docRef = userCollection(uid, 'issues').doc(id)
    await docRef.set(updates, { merge: true })
    const snap = await docRef.get()
    res.json({ success: true, issue: { id: snap.id, ...snap.data() } })
  } catch (err) {
    next(err)
  }
}

export async function deleteIssue(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    await userCollection(uid, 'issues').doc(id).delete()
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function listIssueTimeline(req, res, next) {
  try {
    const uid = requireUid(req)
    const id = req.params?.id || req.query?.issueId
    if (!id) return res.status(400).json({ success: false, error: 'Missing issueId' })
    const snap = await userCollection(uid, 'issueTimelines')
      .where('issueId', '==', id)
      .orderBy('createdAt', 'asc')
      .get()
    const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json({ success: true, entries })
  } catch (err) {
    next(err)
  }
}

export async function addIssueTimelineEntry(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    const data = req.body || {}
    const col = userCollection(uid, 'issueTimelines')
    const docRef = col.doc()
    const payload = {
      ownerId: uid,
      issueId: id,
      type: data.type || 'note',
      message: data.message || '',
      createdAt: serverTs(),
      meta: data.meta || {},
    }
    await docRef.set(payload)

    await userCollection(uid, 'issues').doc(id).set(
      {
        lastActivityAt: serverTs(),
        updatedAt: serverTs(),
      },
      { merge: true },
    )

    res.status(201).json({ success: true, entry: { id: docRef.id, ...payload } })
  } catch (err) {
    next(err)
  }
}

// ---------- LOCATIONS ----------
export async function listLocations(req, res, next) {
  try {
    const uid = requireUid(req)
    const snap = await userCollection(uid, 'events').orderBy('start', 'desc').limit(200).get()
    const locations = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((evt) => evt.locationText || evt.locationGeo)
      .map((evt) => ({
        id: evt.id,
        type: 'event',
        label: evt.title || evt.locationText || 'Event',
        lat: evt.locationGeo?.lat || evt.location?.lat || null,
        lng: evt.locationGeo?.lng || evt.location?.lng || null,
        refId: evt.id,
        metadata: evt,
      }))
    res.json({ success: true, locations })
  } catch (err) {
    next(err)
  }
}
