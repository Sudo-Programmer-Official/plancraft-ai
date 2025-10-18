import express from "express"
import multer from "multer"
import { handleTextReminder } from "../services/textHandler.js"
import { db } from "../services/firebaseAdmin.js"
import { handleVoiceCommand } from "../services/voiceHandler.js"
import { planUsageMiddleware, getUsageToday } from "../services/planService.js"
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import { requireAuth, ensureUserMatches } from "../middleware/auth.js"

dayjs.extend(utc)
dayjs.extend(timezone)

const router = express.Router()
// Require auth for all reminder endpoints and ensure userId matches token
router.use(requireAuth, ensureUserMatches)
const upload = multer({ storage: multer.memoryStorage() })

// Enforce free/pro usage policy for reminder creation (soft warning via header)
router.use('/text', planUsageMiddleware)

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
      const rootPrefs = data?.notifications || {}
      const nestedPrefs = data?.preferences?.notifications || {}
      const prefChannels = Array.isArray(rootPrefs.channels)
        ? rootPrefs.channels
        : Array.isArray(nestedPrefs.channels)
          ? nestedPrefs.channels
          : null

      const prefDerived = [
        (nestedPrefs.email ?? rootPrefs.email) && 'email',
        ((nestedPrefs.push ?? rootPrefs.push) || (nestedPrefs.pwa ?? rootPrefs.pwa)) && 'pwa',
        (nestedPrefs.whatsapp ?? rootPrefs.whatsapp) && 'whatsapp',
        (nestedPrefs.sms ?? rootPrefs.sms) && 'sms',
        (nestedPrefs.voice_call ?? rootPrefs.voice_call) && 'voice_call',
      ].filter(Boolean)

      const merged = new Set([...(channelsToUse || []), ...(prefChannels || prefDerived)])
      channelsToUse = Array.from(merged)
    } catch {}

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
