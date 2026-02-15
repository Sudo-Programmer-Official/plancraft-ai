import express from 'express'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import { sendSMS, sendSMSForUser, makeCall, makeCallForUser } from '../services/twilioService.js'
import { generateVoice } from '../services/ttsService.js'
import { db } from '../services/firebaseAdmin.js'

const router = express.Router()

// Parse urlencoded payloads for Twilio webhooks only (not global)
router.use('/incoming-sms', express.urlencoded({ extended: false }))
router.use('/voice-response', express.urlencoded({ extended: false }))
router.use('/call-status', express.urlencoded({ extended: false }))

// POST /api/twilio/send-sms
// Body: { message: string, userId?: string, to?: string }
router.post('/send-sms', requireAuth, ensureUserMatches, async (req, res) => {
  try {
    const { userId, to, message } = req.body || {}
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Missing message' })

    let sid
    if (to) sid = await sendSMS(String(to), message)
    else if (userId) sid = await sendSMSForUser(String(userId), message)
    else return res.status(400).json({ error: 'Provide userId or to' })

    res.json({ ok: true, sid })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'Failed to send SMS' })
  }
})

// POST /api/twilio/make-call
// Body: { message: string, userId?: string, to?: string }
router.post('/make-call', requireAuth, ensureUserMatches, async (req, res) => {
  try {
    const { userId, to, message } = req.body || {}
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Missing message' })

    let sid
    if (to) sid = await makeCall(String(to), message)
    else if (userId) sid = await makeCallForUser(String(userId), message)
    else return res.status(400).json({ error: 'Provide userId or to' })

    res.json({ ok: true, sid })
  } catch (e) {
    const status = /limit|duplicate/i.test(e?.message || '') ? 429 : 500
    res.status(status).json({ ok: false, error: e?.message || 'Failed to initiate call' })
  }
})

export default router

// --- Inbound Webhooks (no auth) ---

// POST (or GET) /api/twilio/voice-response
// Returns simple TwiML for configured number voice handler
const PUBLIC_API_BASE =
  process.env.API_BASE_URL ||
  process.env.PUBLIC_API_BASE ||
  process.env.APP_BASE_URL ||
  process.env.TTS_PUBLIC_BASE ||
  ''

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function resolvePublicBase(req) {
  const configured = String(PUBLIC_API_BASE || '').trim()
  if (configured) return configured.replace(/\/$/, '')

  const forwardedProto = req.headers['x-forwarded-proto']
  const protoHeader = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto
  const proto = (protoHeader || req.protocol || 'https').split(',')[0].trim() || 'https'
  const host = req.get('host')
  if (!host) return ''
  return `${proto}://${host}`.replace(/\/$/, '')
}

function buildPlayResponse(audioUrl, fallbackText) {
  const safeAudio = escapeXml(audioUrl)
  const safeFallback = escapeXml(fallbackText)
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
    `<Play>${safeAudio}</Play>` +
    `<Say voice="Polly.Joanna-Neural" language="en-US"><prosody rate="88%"><break time="0.6s"/>${safeFallback}</prosody></Say>` +
    `</Response>`
  )
}

router.all('/voice-response', async (req, res) => {
  const rawMessage =
    (req.body && (req.body.message || req.body.Body)) ||
    req.query.message ||
    'This is PlanCraft AI. Thanks for calling. We have recorded your call.'
  const message = String(rawMessage || '').trim() || 'This is PlanCraft AI. Thanks for calling. We have recorded your call.'
  res.set('Content-Type', 'text/xml')

  try {
    const voice = await generateVoice(message)
    const base = resolvePublicBase(req)
    if (voice?.url && base) {
      const absoluteUrl = `${base}${voice.url}`
      const twiml = buildPlayResponse(absoluteUrl, message)
      return res.status(200).send(twiml)
    }
    const fallback = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna-Neural" language="en-US"><prosody rate="88%"><break time="0.6s"/>${escapeXml(message)}</prosody></Say></Response>`
    return res.status(200).send(fallback)
  } catch (e) {
    console.error('[Twilio] voice-response TTS failed', e?.message || e)
    const fallback = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna-Neural" language="en-US"><prosody rate="88%"><break time="0.6s"/>${escapeXml(message)}</prosody></Say></Response>`
    return res.status(200).send(fallback)
  }
})

// POST /api/twilio/incoming-sms
router.post('/incoming-sms', async (req, res) => {
  try {
    const from = String(req.body?.From || '')
    const body = String(req.body?.Body || '').trim()
    const sid = String(req.body?.MessageSid || '')

    // Log inbound
    await db.collection('sms_inbound').add({
      from,
      body,
      sid,
      raw: req.body || null,
      receivedAt: new Date(),
    })

    // Link to user if possible
    let userRef = null
    try {
      const snap = await db.collection('users').where('integrations.sms.phone', '==', from).limit(1).get()
      if (!snap.empty) userRef = snap.docs[0].ref
    } catch {}

    // Handle STOP/START keywords for compliance
    const lower = body.toLowerCase()
    if (lower === 'stop' || lower === 'unsubscribe') {
      if (userRef) {
        try {
          await userRef.set({
            preferences: {
              notifications: { sms: false },
            },
            updatedAt: new Date(),
          }, { merge: true })
        } catch {}
      }
      res.set('Content-Type', 'text/xml')
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been opted out. Reply START to opt back in.</Message></Response>')
    }

    if (lower === 'start' || lower === 'unstop') {
      if (userRef) {
        try {
          await userRef.set({
            preferences: {
              notifications: { sms: true },
            },
            updatedAt: new Date(),
          }, { merge: true })
        } catch {}
      }
      res.set('Content-Type', 'text/xml')
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Message>SMS alerts enabled. You can reply STOP anytime to opt out.</Message></Response>')
    }

    // Default reply
    res.set('Content-Type', 'text/xml')
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks! Your message was received by PlanCraft AI.</Message></Response>')
  } catch (e) {
    res.set('Content-Type', 'text/xml')
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
  }
})

// POST /api/twilio/call-status
router.post('/call-status', async (req, res) => {
  try {
    const status = String(req.body?.CallStatus || '').toLowerCase()
    const callSid = String(req.body?.CallSid || '')
    const to = String(req.body?.To || '')
    const from = String(req.body?.From || '')
    const answeredBy = String(req.body?.AnsweredBy || '')
    const userId = String(req.query?.u || '')
    const message = String(req.query?.m || '')

    // Log final state
    await db.collection('delivery_logs').add({
      channel: 'voice_call_status',
      sid: callSid,
      status,
      to,
      from,
      answeredBy,
      userId: userId || null,
      message: message || null,
      timestamp: new Date(),
    })

    // Fallback SMS if not answered/busy/failed and we have userId
    if ((status === 'no-answer' || status === 'busy' || status === 'failed' || status === 'canceled') && userId) {
      try {
        const text = message ? `We tried to call you. ${message}` : 'We tried to call you regarding your reminder.'
        await sendSMSForUser(userId, text)
      } catch {}
    }

    res.status(204).end()
  } catch (e) {
    res.status(204).end()
  }
})
