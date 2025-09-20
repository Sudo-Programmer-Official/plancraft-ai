// // routes/transcribeRoutes.js
// import express from 'express'
// import multer from 'multer'
// import OpenAI from 'openai'
// import { toFile } from 'openai/uploads'

// const router = express.Router()
// const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } }) // 25MB limit

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
// const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1'

// // POST /api/transcribe
// router.post('/transcribe', upload.single('file'), async (req, res) => {
//   try {
//     if (!req.file || !req.file.buffer) {
//       return res.status(400).json({ error: 'No audio file provided (field name should be "file").' })
//     }

//     const filename = req.file.originalname || 'audio.webm'
//     const file = await toFile(req.file.buffer, filename)

//     const response = await openai.audio.transcriptions.create({
//       file,
//       model: TRANSCRIBE_MODEL,
//       // language: 'en', // optionally hint
//       // response_format: 'json', // default returns { text }
//     })

//     res.json({ text: response.text })
//   } catch (err) {
//     // eslint-disable-next-line no-console
//     console.error('Transcription failed:', err)
//     let status = 500
//     let message = 'Transcription failed'
//     if (err?.status) status = err.status
//     if (typeof err?.message === 'string') message = err.message
//     res.status(status).json({ error: message })
//   }
// })

// export default router

import express from 'express'
import multer from 'multer'
import OpenAI from 'openai'
import { toFile } from 'openai/uploads'

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://audit-agent-66451.web.app',
  'https://audit-agent-66451.firebaseapp.com',
]

const router = express.Router()
router.use((req, res, next) => {
  const origin = req.headers.origin || ''
  const allowAny = process.env.ALLOW_DEV_ANY_ORIGIN === '1'
  const isDevVite = /:\d+$/.test(origin) && /:\d+$/.test(origin) && /:5173$/.test(origin)
  if (allowAny || allowedOrigins.includes(origin) || isDevVite) {
    res.set('Access-Control-Allow-Origin', origin)
  }
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.set('Access-Control-Allow-Methods', 'POST,OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// Store file in memory (don’t write to disk)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
// const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1'
const TRANSCRIBE_MODEL = 'whisper-1'

// POST /api/transcribe
router.post('/transcribe', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'No audio file provided. Use field name "file".' })
    }

    // Wrap buffer into File
    const filename = req.file.originalname || 'audio.webm'
    const file = await toFile(req.file.buffer, filename)

    // Call OpenAI Whisper
    const response = await openai.audio.transcriptions.create({
      file,
      model: TRANSCRIBE_MODEL,
      language: 'en', // hint
    })

    res.json({ text: response.text })
  } catch (err) {
    console.error('❌ Transcription failed:', err)
    res.status(err?.status || 500).json({ error: err?.message || 'Transcription failed' })
  }
})

export default router
