import express from 'express'
import requireAdmin from '../middleware/requireAdmin.js'
import { dataStore } from './dataStore.js'
import { db } from '../services/firebaseAdmin.js'
import dayjs from 'dayjs'

const router = express.Router()

// Admin: Notifications
router.get('/notifications', requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('notifications').orderBy('date', 'desc').limit(100).get()
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return res.json(list)
  } catch (e) {
    // Fallback to in-memory demo data if Firestore not configured
    return res.json(dataStore.notifications)
  }
})

router.post('/notifications', requireAdmin, (req, res) => {
  const { title, message } = req.body || {}
  if (!title || !message) return res.status(400).json({ error: 'title and message required' })
  const note = { id: 'n' + (Date.now()), title, message, date: Date.now() }
  dataStore.notifications.unshift(note)
  res.json(note)
})

// Admin: User feedback
router.get('/feedback', requireAdmin, async (req, res) => {
  const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '50'), 10)))
  const after = req.query.after ? String(req.query.after) : null
  try {
    let ref = db.collection('feedback').orderBy('createdAt', 'desc')
    if (after) {
      const lastDoc = await db.collection('feedback').doc(after).get()
      if (lastDoc.exists) ref = ref.startAfter(lastDoc)
    }

    const snap = await ref.limit(limit).get()
    const rows = snap.docs.map((doc) => {
      const data = doc.data() || {}
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ? new Date(data.createdAt).toISOString() : null)
      return {
        id: doc.id,
        userId: data.userId || null,
        rating: data.rating ?? null,
        type: data.type || 'general',
        message: data.message || '',
        context: data.context || {},
        metadata: data.metadata || {},
        locale: data.locale || null,
        userAgent: data.userAgent || null,
        createdAt,
      }
    })

    // Enrich with user profile (best-effort)
    const ids = [...new Set(rows.map((r) => r.userId).filter(Boolean))]
    if (ids.length) {
      try {
        const snaps = await Promise.all(ids.map((uid) => db.collection('users').doc(String(uid)).get()))
        const lookup = {}
        snaps.forEach((d) => {
          if (!d.exists) return
          const u = d.data() || {}
          lookup[d.id] = {
            email: u.email || null,
            name: u.name || u.displayName || null,
            role: u.role || 'user',
            plan: u.plan || 'free',
          }
        })
        rows.forEach((row) => {
          if (row.userId && lookup[row.userId]) row.user = lookup[row.userId]
        })
      } catch {}
    }

    const nextPage = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null
    return res.json({ feedback: rows, nextPage, limit })
  } catch (e) {
    console.error('Admin feedback fetch failed', e)
    return res.json({ feedback: dataStore.feedback || [], nextPage: null, limit })
  }
})

// Admin: Users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '25'), 10)))
    const last = req.query.last ? String(req.query.last) : null
    const role = req.query.role ? String(req.query.role) : null
    const plan = req.query.plan ? String(req.query.plan) : null

    let ref = db.collection('users')
    if (role) ref = ref.where('role', '==', role)
    if (plan) ref = ref.where('plan', '==', plan)

    // Prefer createdAt ordering; fallback to email if field/index missing
    try {
      ref = ref.orderBy('createdAt', 'desc')
    } catch (e) {
      ref = ref.orderBy('email')
    }

    if (last) {
      // Use document snapshot for startAfter
      const lastDoc = await db.collection('users').doc(last).get()
      if (lastDoc.exists) ref = ref.startAfter(lastDoc)
    }

    const snap = await ref.limit(limit).get()
    const users = snap.docs.map((doc) => {
      const data = doc.data() || {}
      return {
        id: doc.id,
        name: data.name || data.displayName || '',
        email: data.email || '',
        role: data.role || 'user',
        plan: (data.plan || 'free'),
        guest: !!data.guest,
        createdAt: data.createdAt || null,
      }
    })
    const lastVisible = snap.docs.length ? snap.docs[snap.docs.length - 1].id : null
    return res.json({ users, nextPage: lastVisible, limit })
  } catch (e) {
    console.error('Admin users fetch failed', e)
    // Fallback to demo data in dev
    return res.json({ users: dataStore.users, nextPage: null, limit: 25 })
  }
})

router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id)
    const { role } = req.body || {}
    if (!role || !['admin', 'user'].includes(String(role))) return res.status(400).json({ error: 'Invalid role' })
    await db.collection('users').doc(id).set({ role }, { merge: true })
    const snap = await db.collection('users').doc(id).get()
    const data = snap.exists ? (snap.data() || {}) : {}
    return res.json({ id, name: data.name || '', email: data.email || '', role: data.role || role, plan: data.plan || 'free' })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update role' })
  }
})

// Admin: Update a user's plan (free|premium)
router.post('/users/updatePlan', requireAdmin, async (req, res) => {
  try {
    const { id, plan } = req.body || {}
    const userId = String(id || '')
    const p = String(plan || '').toLowerCase()
    if (!userId) return res.status(400).json({ error: 'Missing id' })
    if (!['free', 'premium'].includes(p)) return res.status(400).json({ error: 'Invalid plan' })

    await db.collection('users').doc(userId).set({ plan: p, updatedAt: new Date() }, { merge: true })
    const snap = await db.collection('users').doc(userId).get()
    const data = snap.exists ? (snap.data() || {}) : {}
    return res.json({ id: userId, name: data.name || '', email: data.email || '', role: data.role || 'user', plan: data.plan || p })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update plan' })
  }
})

// Admin: Global app settings (Firestore: /settings/global)
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection('settings').doc('global').get()
    const defaults = {
      blogPrompt: 'Generate engaging AI productivity content for PlanCraftAI.',
      aiModel: 'gpt-4o-mini',
      // Default to disabled to avoid noisy pushes
      enableNotifications: false,
      whatsappTemplate: 'blog_update_v1',
    }
    const doc = snap.exists ? (snap.data() || {}) : {}
    const settings = { ...defaults, ...doc }
    // Attach a non-persistent version hint if present via env
    const version = process.env.APP_VERSION || process.env.npm_package_version || undefined
    return res.json({ settings: version ? { ...settings, version } : settings })
  } catch (e) {
    console.error('Admin settings fetch failed', e)
    return res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

router.post('/settings', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {}
    // Coerce and sanitize expected fields
    const toStr = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v))
    const toBool = (v) => {
      if (typeof v === 'boolean') return v
      if (typeof v === 'string') return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())
      return !!v
    }

    const payload = {
      blogPrompt: toStr(body.blogPrompt).trim() || undefined,
      aiModel: toStr(body.aiModel).trim() || undefined,
      enableNotifications: toBool(body.enableNotifications),
      whatsappTemplate: toStr(body.whatsappTemplate).trim() || undefined,
      updatedAt: new Date(),
    }
    await db.collection('settings').doc('global').set(payload, { merge: true })
    return res.json({ success: true })
  } catch (e) {
    console.error('Admin settings update failed', e)
    return res.status(500).json({ success: false, error: 'Failed to update settings' })
  }
})

// Admin: Payments
router.get('/payments', requireAdmin, async (req, res) => {
  try {
    // Build payments view from users' subscription snapshot
    const snap = await db.collection('users').limit(1000).get()
    const rows = []
    let activeSubs = 0
    for (const doc of snap.docs) {
      const u = doc.data() || {}
      const sub = u.subscription || {}
      if (!sub) continue
      const status = String(sub.status || '').toLowerCase()
      const include = ['active', 'trialing', 'past_due', 'canceled'].includes(status)
      if (!include) continue
      if (status === 'active' || status === 'trialing') activeSubs++
      rows.push({
        id: sub.stripeSubId || `user:${doc.id}`,
        userId: doc.id,
        userEmail: u.email || null,
        plan: sub.billingInterval || sub.plan || (u.plan || 'free'),
        status,
        renewsAt: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : null,
      })
    }
    // Sort active first, then by renewsAt desc
    rows.sort((a, b) => {
      const order = (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1)
      if (order !== 0) return order
      const at = a.renewsAt ? new Date(a.renewsAt).getTime() : 0
      const bt = b.renewsAt ? new Date(b.renewsAt).getTime() : 0
      return bt - at
    })
    return res.json(rows)
  } catch (e) {
    return res.json(dataStore.payments)
  }
})

// Admin: High-level stats for dashboard (users, active subs, notifications, daily series)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const usersSnap = await db.collection('users').limit(2000).get()
    const notesSnap = await db.collection('notifications').limit(500).get()

    const usersTotal = usersSnap.size
    const notifications = notesSnap.size

    let activeSubs = 0
    let premium = 0
    const seriesDays = 14
    const series = Array.from({ length: seriesDays }, (_, i) => ({
      day: dayjs().subtract(seriesDays - 1 - i, 'day').format('YYYY-MM-DD'),
      users: 0,
      premium: 0,
    }))
    const indexByDay = series.reduce((acc, it, idx) => { acc[it.day] = idx; return acc }, {})

    usersSnap.forEach((doc) => {
      const u = doc.data() || {}
      const sub = u.subscription || {}
      const status = String(sub.status || '').toLowerCase()
      if (status === 'active' || status === 'trialing') activeSubs++
      if ((u.plan || '').toLowerCase() === 'premium') premium++

      const created = u.createdAt || u.lastLoginAt || u.updatedAt || null
      let dayKey = null
      try {
        const dt = created && created.toDate ? created.toDate() : (created ? new Date(created) : null)
        if (dt && !isNaN(dt.getTime())) dayKey = dayjs(dt).format('YYYY-MM-DD')
      } catch {}
      if (dayKey && dayKey in indexByDay) {
        series[indexByDay[dayKey]].users++
        if ((u.plan || '').toLowerCase() === 'premium') series[indexByDay[dayKey]].premium++
      }
    })

    // Feature usage (totals + last 7d trend if possible)
    const sevenDays = 7
    const from = dayjs().subtract(sevenDays - 1, 'day').startOf('day').toDate()
    const usage = { totals: { journal: 0, reminders: 0, tasks: 0 }, series: [] }
    const labels = Array.from({ length: sevenDays }, (_, i) => dayjs(from).add(i, 'day').format('YYYY-MM-DD'))
    const labelIdx = labels.reduce((a, d, i) => (a[d]=i, a), {})
    const seed = () => Array.from({ length: sevenDays }, () => 0)
    const perDay = { journal: seed(), reminders: seed(), tasks: seed() }

    async function countAndSeries(col, key) {
      try {
        const ref = db.collection(col)
        let snap
        try {
          snap = await ref.where('createdAt', '>=', from).get()
        } catch (e) {
          // fallback no index: pull a few recent docs
          snap = await ref.orderBy('createdAt', 'desc').limit(500).get()
        }
        let total = 0
        snap.forEach((d) => {
          total++
          const x = d.data()?.createdAt
          let dt = null
          try { dt = x?.toDate ? x.toDate() : (x ? new Date(x) : null) } catch {}
          if (dt) {
            const k = dayjs(dt).format('YYYY-MM-DD')
            if (k in labelIdx) perDay[key][labelIdx[k]]++
          }
        })
        usage.totals[key] = total
      } catch {}
    }
    await Promise.all([
      countAndSeries('journalEntries', 'journal'),
      countAndSeries('reminders', 'reminders'),
      countAndSeries('tasks', 'tasks'),
    ])
    usage.series = labels.map((d, i) => ({
      day: d,
      journal: perDay.journal[i],
      reminders: perDay.reminders[i],
      tasks: perDay.tasks[i],
    }))

    // Payments summary (approximate MRR via env price)
    const price = Number(process.env.ADMIN_MONTHLY_PRICE || process.env.MONTHLY_PRICE || 2)
    const paymentsSummary = { price, mrr: Number((activeSubs * price).toFixed(2)), activeSubs }

    res.json({
      users: usersTotal,
      activeSubs,
      notifications,
      series,
      plans: { premium, free: Math.max(0, usersTotal - premium) },
      usage,
      paymentsSummary,
    })
  } catch (e) {
    // Fallback from demo store
    const today = dayjs()
    const series = Array.from({ length: 14 }, (_, i) => ({ day: today.subtract(13 - i, 'day').format('YYYY-MM-DD'), users: 1 + Math.floor(Math.random()*3), premium: Math.floor(Math.random()*2) }))
    res.json({ users: dataStore.users.length, activeSubs: dataStore.payments.filter(p => p.status==='active').length, notifications: dataStore.notifications.length, series, plans: { premium: 1, free: Math.max(0, dataStore.users.length-1) }, usage: { totals: { journal: 0, reminders: 0, tasks: 0 }, series: [] }, paymentsSummary: { price: 2, mrr: 2, activeSubs: 1 } })
  }
})

// Lightweight health probe to verify route mounting in prod
router.get('/health', requireAdmin, (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

export default router
