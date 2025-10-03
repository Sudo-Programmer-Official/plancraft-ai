import express from "express"
import multer from "multer"
import { handleTextReminder } from "../services/textHandler.js"
import { handleVoiceCommand } from "../services/voiceHandler.js"

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// POST /api/reminders/text
router.post("/text", async (req, res) => {
  try {
    const { userId, text, channels } = req.body || {}
    if (!userId || !text) return res.status(400).json({ success: false, error: "Missing userId or text" })
    const reminder = await handleTextReminder(text, userId, channels)
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

export default router

