import dotenv from 'dotenv'
import twilio from 'twilio'
import { db } from './firebaseAdmin.js'
import { offlineMessagesEnabled } from '../config/flags.js'

dotenv.config()

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER || ''
const API_BASE_URL = process.env.API_BASE_URL || process.env.PUBLIC_API_BASE || 'https://api.plancraftai.com'

let client = null
function envOk() {
  return !!(ACCOUNT_SID && AUTH_TOKEN && FROM_NUMBER)
}
function getClient() {
  if (!client) {
    if (!ACCOUNT_SID || !AUTH_TOKEN) {
      return null
    }
    client = twilio(ACCOUNT_SID, AUTH_TOKEN)
  }
  return client
}

async function getUserPhone(userId, kind = 'sms') {
  const snap = await db.collection('users').doc(String(userId)).get()
  const data = snap.exists ? snap.data() : {}
  const pref = data?.preferences?.notifications || {}
  const integrations = data?.integrations || {}
  const smsPhone = pref?.phone_sms || integrations?.sms?.phone
  const voicePhone = pref?.phone_voice || integrations?.sms?.phone || integrations?.whatsapp?.phone
  const fallback = data?.phone || integrations?.whatsapp?.phone || null
  if (kind === 'voice') return voicePhone || smsPhone || fallback
  return smsPhone || voicePhone || fallback
}

async function logDelivery({ userId, channel, sid, status, message }) {
  try {
    const payload = {
      userId: String(userId || ''),
      channel: String(channel || ''),
      sid: sid || null,
      status: status || 'sent',
      message: message || null,
      timestamp: new Date(),
    }
    await db.collection('delivery_logs').add(payload)
  } catch (e) {
    console.warn('[Twilio] logDelivery failed:', e?.message || e)
  }
}

async function countVoiceCallsToday(userId) {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const snap = await db
      .collection('delivery_logs')
      .where('userId', '==', String(userId))
      .where('channel', '==', 'voice_call')
      .where('timestamp', '>=', start)
      .get()
    return snap.size || 0
  } catch {
    return 0
  }
}

async function sentRecently(userId, channel, windowMinutes = 10) {
  try {
    const now = new Date()
    const winStart = new Date(now.getTime() - windowMinutes * 60 * 1000)
    const q = await db
      .collection('delivery_logs')
      .where('userId', '==', String(userId))
      .where('channel', '==', String(channel))
      .where('timestamp', '>=', winStart)
      .get()
    return !q.empty
  } catch {
    return false
  }
}

function offlineGuard(channel) {
  if (channel !== 'sms') return false
  if (offlineMessagesEnabled()) return false
  console.warn('[CostGuard] Offline messaging disabled — Twilio SMS send skipped')
  return true
}

export async function sendSMS(to, message) {
  if (offlineGuard('sms')) return null
  const c = getClient()
  if (!envOk() || !c) {
    console.warn('[Twilio] Missing credentials — skipping SMS')
    return null
  }
  const res = await c.messages.create({ from: FROM_NUMBER, to, body: String(message || '') })
  return res?.sid || null
}

export async function sendSMSForUser(userId, message) {
  if (offlineGuard('sms')) {
    await logDelivery({ userId, channel: 'sms', sid: null, status: 'skipped', message: 'offline_messages_disabled' })
    return null
  }
  const to = await getUserPhone(userId, 'sms')
  if (!to) throw new Error('User phone not configured')
  try {
    const sid = await sendSMS(to, message)
    const status = sid ? 'sent' : 'skipped'
    await logDelivery({ userId, channel: 'sms', sid, status, message })
    return sid
  } catch (e) {
    await logDelivery({ userId, channel: 'sms', sid: null, status: 'error', message: e?.message || String(e) })
    throw e
  }
}

export async function makeCall(to, message, meta = {}) {
  const c = getClient()
  if (!envOk() || !c) {
    console.warn('[Twilio] Missing credentials — skipping Voice call')
    return null
  }
  // Use a clearer neural voice for reminder calls
  const twiml = `<Response><Say voice="Polly.Joanna-Neural" language="en-US">${String(message || '')}</Say></Response>`
  const statusCallback = `${API_BASE_URL}/api/twilio/call-status` +
    `?u=${encodeURIComponent(meta.userId || '')}&m=${encodeURIComponent(message || '')}`
  const res = await c.calls.create({
    from: FROM_NUMBER,
    to,
    twiml,
    // Log call lifecycle and enable basic AMD to improve voicemail cases
    statusCallback,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    machineDetection: 'Enable',
    machineDetectionTimeout: 30,
    timeout: 20,
  })
  return res?.sid || null
}

export async function makeCallForUser(userId, message, options = {}) {
  const to = await getUserPhone(userId, 'voice')
  if (!to) throw new Error('User phone not configured')

  const maxPerDay = Number(process.env.TWILIO_MAX_CALLS_PER_DAY || 3)
  const recentWindowMin = Number(process.env.TWILIO_DUPLICATE_WINDOW_MIN || 10)

  if (!options?.bypassChecks) {
    const callsToday = await countVoiceCallsToday(userId)
    if (callsToday >= maxPerDay) {
      const err = new Error('Daily call limit reached')
      await logDelivery({ userId, channel: 'voice_call', sid: null, status: 'rate_limited', message: err.message })
      throw err
    }
    const duplicate = await sentRecently(userId, 'voice_call', recentWindowMin)
    if (duplicate) {
      const err = new Error('Duplicate call suppressed')
      await logDelivery({ userId, channel: 'voice_call', sid: null, status: 'duplicate_suppressed', message: err.message })
      throw err
    }
  }

  try {
    const sid = await makeCall(to, message, { userId })
    const status = sid ? 'sent' : 'skipped'
    await logDelivery({ userId, channel: 'voice_call', sid, status, message })
    return sid
  } catch (e) {
    await logDelivery({ userId, channel: 'voice_call', sid: null, status: 'error', message: e?.message || String(e) })
    throw e
  }
}

export default {
  sendSMS,
  sendSMSForUser,
  makeCall,
  makeCallForUser,
}
