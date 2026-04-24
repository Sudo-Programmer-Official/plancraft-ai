import axios from 'axios'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const API_BASE = (process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v18.0').replace(/\/+$/, '')
const DEBUG = process.env.WHATSAPP_DEBUG === '1' || process.env.WHATSAPP_LOG === '1'

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || ''
const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_SMS_FROM || ''
const TWILIO_VOICE = process.env.TWILIO_VOICE || process.env.TWILIO_TTS_VOICE || 'Polly.Joanna'
const TWILIO_BASE = 'https://api.twilio.com/2010-04-01'

const SES_REGION = process.env.AWS_SES_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
const SES_FROM = process.env.SES_FROM_EMAIL || process.env.SES_FROM || process.env.EMAIL_FROM || ''
let sesClient = null

function mask(value) {
  if (!value) return null
  const str = String(value)
  if (str.length <= 4) return '****'
  return `${str.slice(0, 3)}…${str.slice(-2)}`
}

function resolveWhatsAppConfig() {
  const token = process.env.META_WHATSAPP_TOKEN || process.env.WHATSAPP_TOKEN
  const phoneId = process.env.META_WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) {
    throw new Error('WhatsApp API not configured (META_WHATSAPP_TOKEN + META_WHATSAPP_PHONE_ID required)')
  }
  return { token, phoneId }
}

function resolveRecipient(job) {
  return (
    job?.payload?.to ||
    job?.recipients?.[0]?.phoneNumber ||
    job?.recipients?.[0]?.contactId ||
    null
  )
}

function resolveEmailRecipient(job) {
  const cand =
    job?.payload?.to ||
    job?.recipients?.[0]?.email ||
    job?.recipients?.[0]?.contactId ||
    null
  if (cand && String(cand).includes('@')) return cand
  return null
}

function ensureTwilioConfig() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
    throw new Error('Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER required)')
  }
}

function twilioAuth() {
  return {
    username: TWILIO_ACCOUNT_SID,
    password: TWILIO_AUTH_TOKEN,
  }
}

function getSesClient() {
  if (!sesClient) sesClient = new SESClient({ region: SES_REGION })
  return sesClient
}

function ensureSesConfig() {
  if (!SES_FROM) {
    throw new Error('SES not configured (SES_FROM_EMAIL required)')
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function decodeHtmlEntities(value) {
  return String(value || '').replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (match) => {
    if (match === '&nbsp;') return ' '
    if (match === '&amp;') return '&'
    if (match === '&lt;') return '<'
    if (match === '&gt;') return '>'
    if (match === '&quot;') return '"'
    if (match === '&#39;') return "'"
    return match
  })
}

function htmlToText(value) {
  return decodeHtmlEntities(
    String(value || '')
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n\n')
      .replace(/<\s*li[^>]*>/gi, '- ')
      .replace(/<\/li\s*>/gi, '\n')
      .replace(/<\/(ul|ol)\s*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function isRetryableWhatsAppError(err) {
  const status = err?.response?.status
  const code = err?.response?.data?.error?.code
  if (code === 131000) return true // Meta internal error; retry is recommended
  if (status && status >= 500) return true
  return false
}

async function sendWhatsAppTemplate(to, message) {
  const { token, phoneId } = resolveWhatsAppConfig()
  const templateName = String(message?.template || '').trim()
  if (!templateName) throw new Error('WhatsApp template name missing')

  const headerVars = Array.isArray(message?.headerVars) ? message.headerVars : []
  const bodyVars = Array.isArray(message?.bodyVars) ? message.bodyVars : []
  const lang = String(message?.lang || message?.language?.code || 'en_US').trim() || 'en_US'
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
      components: [],
    },
  }

  if (headerVars.length) {
    payload.template.components.push({
      type: 'header',
      parameters: headerVars.map((value) => ({ type: 'text', text: String(value) })),
    })
  }
  if (bodyVars.length) {
    payload.template.components.push({
      type: 'body',
      parameters: bodyVars.map((value) => ({ type: 'text', text: String(value) })),
    })
  }

  const url = `${API_BASE}/${phoneId}/messages`
  if (DEBUG) {
    console.log('[posting-service][WhatsApp] sending template', {
      to: mask(to),
      url,
      template: templateName,
      bodyVars,
    })
  }

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })
    if (DEBUG) {
      console.log('[posting-service][WhatsApp] template response', {
        status: res.status,
        body: res.data,
      })
    }
    return res.data
  } catch (err) {
    const status = err?.response?.status
    const body = err?.response?.data
    if (status === 401 && body?.error?.code === 190) {
      console.warn('[posting-service][WhatsApp] Access token invalid/expired; refresh META_WHATSAPP_TOKEN', body?.error)
    }
    const detail = status ? `${status} ${JSON.stringify(body || {})}` : err?.message || 'unknown error'
    throw new Error(`WhatsApp template send failed: ${detail}`)
  }
}

function resolveWhatsAppTemplate(job) {
  const directTemplate = job?.payload?.template
  if (directTemplate && typeof directTemplate === 'object' && directTemplate.template) return directTemplate

  const bodyTemplate = job?.payload?.body
  if (bodyTemplate && typeof bodyTemplate === 'object' && bodyTemplate.template) return bodyTemplate

  const messageTemplate = job?.message
  if (messageTemplate && typeof messageTemplate === 'object' && messageTemplate.template) return messageTemplate

  return null
}

async function sendWhatsAppText(to, message) {
  const { token, phoneId } = resolveWhatsAppConfig()
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: String(message || 'Hello from PlanCraftAI 👋') },
  }

  const url = `${API_BASE}/${phoneId}/messages`
  if (DEBUG) {
    console.log('[posting-service][WhatsApp] sending', {
      to: mask(to),
      url,
      len: (message || '').length,
      preview: (message || '').slice(0, 50),
    })
  }

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })
    if (DEBUG) {
      console.log('[posting-service][WhatsApp] response', {
        status: res.status,
        body: res.data,
      })
    }
    return res.data
  } catch (err) {
    const status = err?.response?.status
    const body = err?.response?.data
    const headers = err?.response?.headers || {}
    if (status === 401 && body?.error?.code === 190) {
      console.warn('[posting-service][WhatsApp] Access token invalid/expired; refresh META_WHATSAPP_TOKEN', body?.error)
    }
    if (isRetryableWhatsAppError(err)) {
      const detail = status ? `${status} ${JSON.stringify(body || {})}` : err?.message || 'unknown error'
      const fbTraceId = headers['x-fb-trace-id'] || headers['x-fb-trace-id'.toLowerCase()] || null
      const retryError = new Error(`WhatsApp send retryable: ${detail}`)
      retryError.retryable = true
      retryError.fbTraceId = fbTraceId
      throw retryError
    }
    const detail = status ? `${status} ${JSON.stringify(body || {})}` : err?.message || 'unknown error'
    throw new Error(`WhatsApp send failed: ${detail}`)
  }
}

export async function sendTextWhatsApp(job) {
  const to = resolveRecipient(job)
  if (!to) throw new Error('WhatsApp recipient missing')
  const template = resolveWhatsAppTemplate(job)
  if (template) {
    const resp = await sendWhatsAppTemplate(to, template)
    return { status: 'sent', channel: 'whatsapp', recipient: to, response: resp, mode: 'template' }
  }
  const message = job?.message || job?.payload?.body || ''
  const maxAttempts = 3
  const backoffs = [0, 1500, 5000]
  let attempt = 0
  let lastErr = null

  while (attempt < maxAttempts) {
    try {
      if (backoffs[attempt]) await sleep(backoffs[attempt])
      const resp = await sendWhatsAppText(to, message)
      return { status: 'sent', channel: 'whatsapp', recipient: to, response: resp }
    } catch (err) {
      lastErr = err
      if (err?.retryable && attempt < maxAttempts - 1) {
        console.warn('[posting-service][WhatsApp] transient failure, will retry', {
          attempt: attempt + 1,
          to: mask(to),
          detail: err?.message,
          fbTraceId: err?.fbTraceId || null,
        })
        attempt += 1
        continue
      }
      throw err
    }
  }

  throw lastErr || new Error('WhatsApp send failed after retries')
}

export async function sendTextSMS(job) {
  const to = resolveRecipient(job)
  if (!to) throw new Error('SMS recipient missing')
  ensureTwilioConfig()
  const body = String(job?.message || job?.payload?.body || '')

  const url = `${TWILIO_BASE}/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const payload = new URLSearchParams({
    From: TWILIO_FROM,
    To: to,
    Body: body,
  })

  try {
    const res = await axios.post(url, payload, {
      auth: twilioAuth(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    })
    if (DEBUG) {
      console.log('[posting-service][Twilio SMS] sent', {
        to: mask(to),
        sid: res?.data?.sid,
        status: res?.data?.status,
      })
    }
    return { status: 'sent', channel: 'sms', recipient: to, sid: res?.data?.sid }
  } catch (err) {
    const status = err?.response?.status
    const bodyDetail = err?.response?.data
    const detail = status ? `${status} ${JSON.stringify(bodyDetail || {})}` : err?.message || 'unknown error'
    throw new Error(`SMS send failed: ${detail}`)
  }
}

export async function sendVoiceCall(job) {
  const to = resolveRecipient(job)
  if (!to) throw new Error('Voice recipient missing')
  ensureTwilioConfig()

  const audioUrl = job?.audioUrl || job?.payload?.audioUrl || null
  const message = String(job?.message || job?.payload?.body || 'Hello from PlanCraftAI')
  const voiceName = job?.payload?.voice || job?.payload?.voiceName || TWILIO_VOICE || 'Polly.Joanna-Neural'
  const twiml = audioUrl
    ? `<Response><Play>${audioUrl}</Play></Response>`
    : `<Response><Say voice="${voiceName}"><prosody rate="88%"><break time="0.6s"/>${message}</prosody></Say></Response>`

  const url = `${TWILIO_BASE}/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`
  const payload = new URLSearchParams({
    From: TWILIO_FROM,
    To: to,
    Twiml: twiml,
  })

  try {
    const res = await axios.post(url, payload, {
      auth: twilioAuth(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    })
    if (DEBUG) {
      console.log('[posting-service][Twilio Voice] initiated', {
        to: mask(to),
        sid: res?.data?.sid,
        status: res?.data?.status,
      })
    }
    return { status: 'sent', channel: 'voice_call', recipient: to, sid: res?.data?.sid }
  } catch (err) {
    const status = err?.response?.status
    const bodyDetail = err?.response?.data
    const detail = status ? `${status} ${JSON.stringify(bodyDetail || {})}` : err?.message || 'unknown error'
    throw new Error(`Voice call failed: ${detail}`)
  }
}

export async function sendEmail(job) {
  const to = resolveEmailRecipient(job)
  if (!to) throw new Error('Email recipient missing or invalid')
  ensureSesConfig()

  const subject = job?.payload?.subject || 'PlanCraftAI update'
  const html = String(job?.payload?.html || '').trim()
  const body = String(job?.message || job?.payload?.body || '').trim() || (html ? htmlToText(html) : '')
  if (!body && !html) throw new Error('Email body missing')

  const emailBody = {}
  if (body) {
    emailBody.Text = { Data: body, Charset: 'UTF-8' }
  }
  if (html) {
    emailBody.Html = { Data: html, Charset: 'UTF-8' }
  }

  const cmd = new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Source: SES_FROM,
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: emailBody,
    },
    ReplyToAddresses: SES_FROM ? [SES_FROM] : undefined,
  })

  try {
    const res = await getSesClient().send(cmd)
    if (DEBUG) {
      console.log('[posting-service][SES] sent', { to: mask(to), messageId: res?.MessageId })
    }
    return { status: 'sent', channel: 'email', recipient: to, messageId: res?.MessageId }
  } catch (err) {
    const detail = err?.message || 'Email send failed'
    throw new Error(`Email send failed: ${detail}`)
  }
}

export async function handleJob(job) {
  switch (job.channel) {
    case 'whatsapp':
      return sendTextWhatsApp(job)
    case 'sms':
      return sendTextSMS(job)
    case 'voice_call':
      return sendVoiceCall(job)
    case 'email':
      return sendEmail(job)
    default:
      throw new Error(`Unsupported channel ${job.channel}`)
  }
}
