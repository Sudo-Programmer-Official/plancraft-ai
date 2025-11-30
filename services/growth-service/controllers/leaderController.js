import admin from 'firebase-admin'
import { userCollection, serverTs } from '../utils/db.js'

function requireUid(req) {
  const uid = req.user?.uid
  if (!uid) throw new Error('Missing user id')
  return uid
}

// ---------- OVERVIEW ----------
export async function getOverview(req, res, next) {
  try {
    const uid = requireUid(req)
    const contactsCol = userCollection(uid, 'contacts')
    const occasionsCol = userCollection(uid, 'occasions')
    const eventsCol = userCollection(uid, 'events')
    const issuesCol = userCollection(uid, 'issues')

    const [contactsSnap, occasionsSnap, eventsSnap, issuesSnap] = await Promise.all([
      contactsCol.get(),
      occasionsCol.get(),
      eventsCol.get(),
      issuesCol.get(),
    ])

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const today = now.toISOString().slice(0, 10)

    const eventsThisMonth = eventsSnap.docs.filter((d) => {
      const s = d.get('start')
      return s && s >= startOfMonth
    }).length

    const upcomingOccasions = occasionsSnap.docs.filter((d) => {
      const date = d.get('date')
      return date && date >= today
    }).length

    const openIssues = issuesSnap.docs.filter((d) => {
      const status = (d.get('status') || '').toLowerCase()
      return status !== 'closed'
    }).length

    const engagementScore = eventsThisMonth * 3 + upcomingOccasions * 2 + contactsSnap.size

    return res.json({
      success: true,
      overview: {
        contacts: contactsSnap.size,
        eventsThisMonth,
        upcomingOccasions,
        openIssues,
        engagementScore,
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
    const today = new Date().toISOString().slice(0, 10)
    const snap = await userCollection(uid, 'occasions').where('date', '>=', today).orderBy('date', 'asc').limit(10).get()
    const occasions = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
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
    const payload = {
      ownerId: uid,
      name: data.name || '',
      email: data.email || null,
      phone: data.phone || null,
      tags: data.tags || [],
      groupIds: data.groupIds || [],
      timezone: data.timezone || null,
      createdAt: serverTs(),
      updatedAt: serverTs(),
    }
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
    const updates = { ...(req.body || {}), updatedAt: serverTs() }
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
    const payload = {
      ownerId: uid,
      name: data.name || '',
      description: data.description || null,
      createdAt: serverTs(),
      updatedAt: serverTs(),
    }
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
    const updates = { ...(req.body || {}), updatedAt: serverTs() }
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
    const snap = await userCollection(uid, 'occasions').orderBy('date', 'asc').get()
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
    const payload = {
      ownerId: uid,
      contactId: data.contactId || null,
      type: data.type || 'other',
      title: data.title || '',
      date: data.date,
      notes: data.notes || null,
      createdAt: serverTs(),
      updatedAt: serverTs(),
    }
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
    const updates = { ...(req.body || {}), updatedAt: serverTs() }
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
    const snap = await userCollection(uid, 'events').orderBy('start', 'desc').limit(200).get()
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json({ success: true, events })
  } catch (err) {
    next(err)
  }
}

export async function createEvent(req, res, next) {
  try {
    const uid = requireUid(req)
    const data = req.body || {}
    const col = userCollection(uid, 'events')
    const docRef = col.doc()
    const payload = {
      ownerId: uid,
      contactId: data.contactId || null,
      title: data.title || '',
      start: data.start,
      end: data.end || null,
      channel: data.channel || 'other',
      status: data.status || 'planned',
      notes: data.notes || null,
      createdAt: serverTs(),
      updatedAt: serverTs(),
    }
    await docRef.set(payload)
    res.status(201).json({ success: true, event: { id: docRef.id, ...payload } })
  } catch (err) {
    next(err)
  }
}

export async function updateEvent(req, res, next) {
  try {
    const uid = requireUid(req)
    const { id } = req.params
    const updates = { ...(req.body || {}), updatedAt: serverTs() }
    const docRef = userCollection(uid, 'events').doc(id)
    await docRef.set(updates, { merge: true })
    const snap = await docRef.get()
    res.json({ success: true, event: { id: snap.id, ...snap.data() } })
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
    const payload = {
      ownerId: uid,
      contactId: data.contactId || null,
      title: data.title || '',
      status: data.status || 'open',
      priority: data.priority || 'medium',
      summary: data.summary || null,
      createdAt: serverTs(),
      updatedAt: serverTs(),
      lastActivityAt: serverTs(),
    }
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
    const updates = { ...(req.body || {}), updatedAt: serverTs(), lastActivityAt: serverTs() }
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
    const { id } = req.params
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
