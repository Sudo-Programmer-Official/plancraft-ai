import express from "express"
import multer from "multer"
import { handleTextReminder } from "../services/textHandler.js"
import { db } from "../services/firebaseAdmin.js"
import { queueReminder } from "../services/reminderService.js"
import { handleVoiceCommand } from "../services/voiceHandler.js"
import { planUsageMiddleware, getUsageToday } from "../services/planService.js"
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { requireAuth, ensureUserMatches } from "../middleware/auth.js"

dayjs.extend(utc)
dayjs.extend(timezone)

const REMINDER_CHANNEL_ALLOW_LIST = ['pwa', 'whatsapp', 'email', 'sms', 'voice_call']

function deriveUserReminderPrefs(data = {}) {
  try {
    const rootPrefs = data?.notifications || {}
    const nested = data?.preferences?.notifications || {}
    const reminderPrefs = data?.preferences?.reminders || {}

    const channelCandidates =
      Array.isArray(reminderPrefs?.channels) && reminderPrefs.channels.length
        ? reminderPrefs.channels
        : Array.isArray(nested?.channels) && nested.channels.length
          ? nested.channels
          : Array.isArray(rootPrefs?.channels) && rootPrefs.channels.length
            ? rootPrefs.channels
            : [
                (nested.email ?? rootPrefs.email) && 'email',
                ((nested.push ?? rootPrefs.push) || (nested.pwa ?? rootPrefs.pwa)) && 'pwa',
                (nested.whatsapp ?? rootPrefs.whatsapp) && 'whatsapp',
                (nested.sms ?? rootPrefs.sms) && 'sms',
                (nested.voice_call ?? rootPrefs.voice_call) && 'voice_call',
              ].filter(Boolean)

    const channels = Array.from(
      new Set(
        channelCandidates
          .map((c) => String(c || '').toLowerCase())
          .filter((c) => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
      )
    )

    const enabled =
      reminderPrefs?.enabled !== undefined
        ? !!reminderPrefs.enabled
        : channels.length > 0 ||
          !!rootPrefs?.whatsapp ||
          !!rootPrefs?.push ||
          !!rootPrefs?.pwa ||
          !!rootPrefs?.email ||
          !!rootPrefs?.sms ||
          !!rootPrefs?.voice_call ||
          !!nested?.whatsapp ||
          !!nested?.push ||
          !!nested?.pwa ||
          !!nested?.email ||
          !!nested?.sms ||
          !!nested?.voice_call

    return { enabled, channels }
  } catch {
    return { enabled: true, channels: ['pwa', 'whatsapp'] }
  }
}

const router = express.Router()
// Require auth for all reminder endpoints and ensure userId matches token
router.use(requireAuth, ensureUserMatches)
const upload = multer({ storage: multer.memoryStorage() })

// Enforce free/pro usage policy for reminder creation (soft warning via header)
router.use(['/text', '/batch'], planUsageMiddleware)

// POST /api/reminders/text
router.post("/text", async (req, res) => {
  try {
    const { userId, text, channels, taskId, scheduledTime } = req.body || {}
    const tz = (req.body && req.body.timezone) || req.headers['x-user-tz'] || 'UTC'
    console.log("[Reminder API] /reminders/text", {
      userId,
      taskId,
      channels,
      scheduledTime,
      timezone: tz,
      now: new Date().toISOString(),
    })
    if (!userId || !text) return res.status(400).json({ success: false, error: "Missing userId or text" })
    // If caller ties to a task, require an explicit scheduledTime to avoid ambiguous scheduling
    if (taskId && !scheduledTime) {
      console.warn('[Reminder API] Rejecting task-bound reminder without scheduledTime', { userId, taskId })
      return res.status(400).json({ success: false, error: 'Missing scheduledTime for task-bound reminder' })
    }
    // Resolve channels precedence: request body ∪ user preference
    let channelsToUse = Array.isArray(channels) ? [...channels] : []
    try {
      const u = await db.collection('users').doc(String(userId)).get()
      const data = u.exists ? (u.data() || {}) : {}
      const derived = deriveUserReminderPrefs(data)
      const defaults = derived.enabled ? derived.channels : []
      const merged = new Set(
        [
          ...channelsToUse.map((c) => String(c || '').toLowerCase()),
          ...defaults,
        ].filter(Boolean)
      )
      channelsToUse = Array.from(merged).filter((c) => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
    } catch {
      channelsToUse = Array.isArray(channelsToUse) ? channelsToUse : []
    }
    if (!channelsToUse.length) channelsToUse = ['pwa']

    const reminder = await handleTextReminder(text, userId, channelsToUse, { taskId, scheduledTime, timezone: tz })

    // Optional mirror to tasks/{taskId}.reminderTime so UI reflects immediately
    try {
      if (taskId && scheduledTime) {
        const tzStr = tz || 'UTC'
        const hhmm = dayjs.utc(scheduledTime).tz(tzStr).format('HH:mm')
        await db.collection('tasks').doc(String(taskId)).set({ reminderTime: hhmm, updatedAt: new Date() }, { merge: true })
      }
    } catch (merr) {
      console.warn('[Reminder API] Mirror reminderTime failed', merr?.message || merr)
    }

    res.json({ success: true, reminder })
  } catch (e) {
    console.error("/reminders/text error:", e)
    res.status(500).json({ success: false, error: e?.message || "Server error" })
  }
})

// POST /api/reminders/batch
router.post("/batch", async (req, res) => {
  try {
    const { userId, reminders = [] } = req.body || {}
    if (!userId || !Array.isArray(reminders) || !reminders.length) {
      return res.json({ scheduled: 0, total: 0 })
    }

    const tzHeader = req.headers['x-user-tz'] || 'UTC'
    const jitter = () => Math.floor(15 + Math.random() * 75) // 15–90 seconds
    const voiceCallCutoffMs = 60 * 1000

    let userDefaults = { enabled: true, channels: ['pwa'] }
    try {
      const snap = await db.collection('users').doc(String(userId)).get()
      const data = snap.exists ? (snap.data() || {}) : {}
      userDefaults = deriveUserReminderPrefs(data)
      if (!userDefaults.enabled || !userDefaults.channels.length) {
        userDefaults.channels = ['pwa']
      }
    } catch {
      userDefaults = { enabled: true, channels: ['pwa'] }
    }

    const prepared = reminders
      .map((rem, idx) => {
        if (!rem || !rem.scheduledTime) return null
        const dt = new Date(rem.scheduledTime)
        if (!(dt instanceof Date) || isNaN(dt.getTime())) return null
        const text = String(rem.text || rem.title || '').trim()
        if (!text) return null
        return {
          idx,
          taskId: rem.taskId || null,
          text,
          scheduledAt: dt,
          timezone: rem.timezone || tzHeader,
          channels: Array.isArray(rem.channels) ? rem.channels : [],
        }
      })
      .filter(Boolean)

    if (!prepared.length) {
      return res.json({ scheduled: 0, total: 0 })
    }

    const byMinute = new Map()
    for (const entry of prepared) {
      const keyDate = new Date(entry.scheduledAt)
      keyDate.setSeconds(0, 0)
      const key = keyDate.toISOString()
      if (!byMinute.has(key)) byMinute.set(key, [])
      byMinute.get(key).push(entry)
    }

    const scheduledPayloads = []
    for (const [, group] of byMinute.entries()) {
      group.sort((a, b) => a.idx - b.idx)
      for (const entry of group) {
        const base = entry.scheduledAt
        const scheduledDate = new Date(base.getTime() + jitter() * 1000)
        const scheduledTime = scheduledDate.toISOString()

        const normalized = Array.from(
          new Set(
            (entry.channels.length ? entry.channels : (userDefaults.enabled ? userDefaults.channels : []))
              .map((c) => String(c || '').toLowerCase())
          )
        )

        const filteredChannels = normalized
          .filter((c) => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
          .filter((c) => {
            if (c !== 'voice_call') return true
            return scheduledDate.getTime() - Date.now() > voiceCallCutoffMs
          })

        let channelsToPersist = filteredChannels
        if (!channelsToPersist.length) {
          const fallbackNormalized = Array.from(
            new Set(
              (userDefaults.channels.length ? userDefaults.channels : ['pwa']).map((c) =>
                String(c || '').toLowerCase()
              )
            )
          )
          channelsToPersist = fallbackNormalized
            .filter((c) => REMINDER_CHANNEL_ALLOW_LIST.includes(c))
            .filter((c) => c !== 'voice_call' || scheduledDate.getTime() - Date.now() > voiceCallCutoffMs)
        }
        if (!channelsToPersist.length) channelsToPersist = ['pwa']

        scheduledPayloads.push({
          userId: String(userId),
          taskId: entry.taskId ? String(entry.taskId) : null,
          text: entry.text,
          scheduledTime,
          timezone: entry.timezone || tzHeader,
          channels: channelsToPersist,
        })
      }
    }

    const results = await Promise.allSettled(
      scheduledPayloads.map(async (payload) => {
        const scheduledDate = new Date(payload.scheduledTime)
        const reminderDoc = {
          userId: payload.userId,
          taskId: payload.taskId,
          task: payload.text || '',
          channels: payload.channels,
          scheduledTime: scheduledDate,
          createdAt: new Date(),
          status: 'scheduled',
          sentAt: null,
          timezone: payload.timezone,
          source: 'reminder',
        }

        const ref = await db.collection('reminders').add(reminderDoc)
        queueReminder({ id: ref.id, ...reminderDoc })

        // Mirror reminderTime to task document for UI freshness
        try {
          if (payload.taskId && scheduledDate instanceof Date && !isNaN(scheduledDate.getTime())) {
            const hhmm = dayjs.utc(scheduledDate.toISOString()).tz(payload.timezone || tzHeader).format('HH:mm')
            await db.collection('tasks').doc(String(payload.taskId)).set({
              reminderTime: hhmm,
              updatedAt: new Date(),
            }, { merge: true })
          }
        } catch (mirrorErr) {
          console.warn('[Reminder API] batch mirror reminderTime failed', mirrorErr?.message || mirrorErr)
        }
      })
    )

    const ok = results.filter((r) => r.status === 'fulfilled').length
    res.json({ scheduled: ok, total: scheduledPayloads.length })
  } catch (e) {
    console.error('[reminders/batch] failed', e)
    res.status(500).json({ error: 'Failed to schedule reminders' })
  }
})

// POST /api/reminders/voice (multipart/form-data; field name 'audio')
router.post("/voice", upload.single("audio"), planUsageMiddleware, async (req, res) => {
  try {
    const { userId } = req.body || {}
    const file = req.file
    if (!userId || !file?.buffer) return res.status(400).json({ success: false, error: "Missing userId or audio" })
    const reminder = await handleVoiceCommand(file.buffer, userId, file.originalname || "audio.webm")
    res.json({ success: true, reminder })
  } catch (e) {
    console.error("/reminders/voice error:", e)
    res.status(500).json({ success: false, error: e?.message || "Server error" })
  }
})

// POST /api/reminders/cancel
router.post('/cancel', async (req, res) => {
  const { userId, taskId } = req.body || {}
  try {
    if (!userId || !taskId) return res.status(400).json({ success: false, error: "Missing userId or taskId" })

    const snaps = await db.collection('reminders')
      .where('userId', '==', String(userId))
      .where('taskId', '==', String(taskId))
      .where('status', '==', 'scheduled')
      .get()

    if (snaps.empty) return res.json({ success: true, canceled: 0 })

    const batch = db.batch()
    snaps.forEach((doc) => {
      batch.update(doc.ref, { status: 'canceled', sentAt: new Date() })
    })
    await batch.commit()
    res.json({ success: true, canceled: snaps.size })
  } catch (err) {
    console.error('❌ Cancel Reminder Error:', err)
    res.status(500).json({ success: false, error: err?.message || 'Server error' })
  }
})

// GET /api/reminders?userId=...&taskId=...
router.get('/', async (req, res) => {
  try {
    const { userId, taskId } = req.query || {}
    if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' })

    let q = db.collection('reminders').where('userId', '==', String(userId))
    if (taskId) q = q.where('taskId', '==', String(taskId))

    const snap = await q.get()
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    const hasActive = items.some(r => String(r?.status).toLowerCase() === 'scheduled' && !r?.sentAt)
    res.json({ success: true, items, hasActive })
  } catch (err) {
    console.error('❌ reminders list error', err)
    res.status(500).json({ success: false, error: err?.message || 'Server error' })
  }
})

// GET /api/reminders/usage?userId=...
router.get('/usage', async (req, res) => {
  try {
    const { userId } = req.query || {}
    if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' })
    const usage = await getUsageToday(String(userId), 'reminder')
    res.json({ success: true, ...usage })
  } catch (err) {
    console.error('❌ reminders usage error', err)
    res.status(500).json({ success: false, error: err?.message || 'Server error' })
  }
})

export default router
