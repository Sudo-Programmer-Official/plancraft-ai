import express from "express"
import multer from "multer"
import { handleTextReminder } from "../services/textHandler.js"
import { db } from "../services/firebaseAdmin.js"
import { handleVoiceCommand } from "../services/voiceHandler.js"

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// POST /api/reminders/text
router.post("/text", async (req, res) => {
  try {
    const { userId, text, channels, taskId } = req.body || {}
    if (!userId || !text) return res.status(400).json({ success: false, error: "Missing userId or text" })
    const reminder = await handleTextReminder(text, userId, channels, { taskId })
    res.json({ success: true, reminder })
  } catch (e) {
    console.error("/reminders/text error:", e)
    res.status(500).json({ success: false, error: e?.message || "Server error" })
  }
})

// POST /api/reminders/voice (multipart/form-data; field name 'audio')
router.post("/voice", upload.single("audio"), async (req, res) => {
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

export default router
