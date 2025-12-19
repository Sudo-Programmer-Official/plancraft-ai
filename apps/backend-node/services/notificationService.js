import dayjs from 'dayjs'
import { db } from './firebaseAdmin.js'
import { providers } from './integrations/index.js'
import { send as sendWhatsApp } from './integrations/whatsappProvider.js'
import { sendPWA } from './integrations/pwaProvider.js'
import { sendEmail } from './integrations/emailProvider.js'
import { makeCallForUser, sendSMSForUser } from './twilioService.js'
import { getUserPrefs } from './userPrefService.js'
import { buildReminderBrandCopy } from './notificationTemplates.js'
import { enqueueNotificationJob, postingServiceAvailable } from './postingServiceClient.js'

export async function sendNotification(userId, message, channel = 'all', options = {}) {
  const snap = await db.collection('users').doc(String(userId)).get()
  const data = snap.exists ? snap.data() : {}
  const prefs = data?.preferences?.notifications || {}

  const supported = ['whatsapp', 'slack']
  let channels = []
  if (channel === 'all') {
    channels = supported.filter((c) => !!prefs[c] || (c === 'slack' && !!process.env.SLACK_WEBHOOK_URL))
  } else if (Array.isArray(channel)) {
    channels = channel.filter((c) => supported.includes(c))
  } else if (typeof channel === 'string') {
    if (supported.includes(channel)) channels = [channel]
  }

  const results = {}
  for (const c of channels) {
    const provider = providers[c]
    if (!provider?.send) continue
    try {
      results[c] = await provider.send(userId, message, options[c] || options)
    } catch (e) {
      results[c] = { error: String(e?.message || e) }
    }
  }
  return results
}

const CHANNEL_ENV_FLAGS = {
  // Channels default to enabled; set ENABLE_* env vars to "false" to disable at runtime.
  whatsapp: resolveChannelFlag('ENABLE_WHATSAPP'),
  email: resolveChannelFlag('ENABLE_EMAIL'),
  pwa: resolveChannelFlag('ENABLE_PWA'),
  voice: resolveChannelFlag('ENABLE_VOICE'),
  sms: resolveChannelFlag('ENABLE_SMS'),
}

const ALL_CHANNELS = ['whatsapp', 'email', 'pwa', 'voice', 'sms']

function isChannelEnabled(flagValue) {
  if (flagValue === undefined || flagValue === null) return false
  const normalized = String(flagValue).toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

function resolveChannelFlag(envKey, defaultValue = true) {
  const raw = process.env[envKey]
  if (raw === undefined || raw === null || raw === '') return defaultValue
  return isChannelEnabled(raw)
}

function normalizeChannelName(channel) {
  if (!channel) return null
  const normalized = String(channel).trim().toLowerCase()
  if (!normalized) return null
  if (normalized === 'voice_call' || normalized === 'voice-call' || normalized === 'call' || normalized === 'phone') {
    return 'voice'
  }
  if (normalized === 'push' || normalized === 'webpush' || normalized === 'web-push') {
    return 'pwa'
  }
  if (normalized === 'text' || normalized === 'sms_text') {
    return 'sms'
  }
  return normalized
}

function toNormalizedSet(values) {
  if (!Array.isArray(values)) return null
  const set = new Set()
  values.forEach((value) => {
    const normalized = normalizeChannelName(value)
    if (normalized) set.add(normalized)
  })
  return set.size ? set : null
}

function channelPermitted(channel, ctx) {
  if (!channel) return false
  if (channel !== 'pwa' && !CHANNEL_ENV_FLAGS[channel]) return false
  if (ctx.allowedSet && !ctx.allowedSet.has(channel)) return false
  if (ctx.limitSet && !ctx.limitSet.has(channel)) return false
  if (channel === 'voice' && !ctx.includeVoice) return false

  if (channel === 'whatsapp') return ctx.prefs.enable_whatsapp
  if (channel === 'email') return ctx.prefs.enable_email
  if (channel === 'pwa') return ctx.prefs.enable_pwa
  if (channel === 'voice') return ctx.prefs.enable_voice
  if (channel === 'sms') return ctx.prefs.enable_sms

  return false
}

async function resolveUserChannels(userId, overrides, options = {}) {
  const includeVoice = options.includeVoice !== false
  const allowedSet = toNormalizedSet(options.allowed)
  const limitSet = toNormalizedSet(options.limitTo)
  const returnContext = options.returnContext === true
  const requested = Array.isArray(overrides) ? overrides.map(normalizeChannelName).filter(Boolean) : []
  const prefs = await getUserPrefs(userId)
  const ctx = { includeVoice, allowedSet, limitSet, prefs }

  let channels = (requested.length ? requested : ALL_CHANNELS)
    .map(normalizeChannelName)
    .filter(Boolean)
    .filter((channel) => channelPermitted(channel, ctx))

  if (!channels.length) {
    const fallbackSource = limitSet ? Array.from(limitSet) : ALL_CHANNELS
    channels = fallbackSource
      .map(normalizeChannelName)
      .filter(Boolean)
      .filter((channel) => channelPermitted(channel, { ...ctx, limitSet: null }))
  }

  if (!channels.length) {
    channels = ['pwa']
  }

  const unique = Array.from(new Set(channels))
  if (returnContext) {
    return {
      channels: unique,
      prefs,
      requested,
    }
  }
  return unique
}

function ensureArray(items) {
  if (!items) return []
  if (Array.isArray(items)) return items.filter(Boolean)
  return [items].filter(Boolean)
}

async function loadUserContacts(userId) {
  try {
    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    const notifications = data?.preferences?.notifications || {}
    const integrations = data?.integrations || {}
    const whatsapp = integrations?.whatsapp?.phone || notifications?.whatsapp_phone || data?.phone || null
    const sms = notifications?.phone_sms || integrations?.sms?.phone || integrations?.whatsapp?.phone || data?.phone || null
    const voice =
      notifications?.phone_voice || integrations?.sms?.phone || integrations?.whatsapp?.phone || data?.phone || null
    const email =
      integrations?.email ||
      data?.email ||
      data?.profile?.email ||
      data?.preferences?.email ||
      notifications?.email ||
      null
    return { whatsapp, sms, voice, email }
  } catch (err) {
    console.warn('[Notification] loadUserContacts failed', err?.message || err)
    return {}
  }
}

function pickRecipientForChannel(channel, contacts = {}) {
  if (channel === 'whatsapp') return contacts.whatsapp || contacts.sms || contacts.voice || null
  if (channel === 'sms') return contacts.sms || contacts.whatsapp || contacts.voice || null
  if (channel === 'voice') return contacts.voice || contacts.sms || contacts.whatsapp || null
  if (channel === 'email') return contacts.email || null
  return null
}

function describeItem(item) {
  const title = item?.title || item?.text || item?.message || 'Untitled task'
  const parts = []
  if (item?.date) {
    const formatted = dayjs(item.date).isValid() ? dayjs(item.date).format('MMM D') : null
    if (formatted) parts.push(formatted)
  }
  const timeToken = item?.reminderTime || item?.time || item?.scheduledTime || item?.when
  if (timeToken) parts.push(timeToken)
  return parts.length ? `${title} (${parts.join(' · ')})` : title
}

function buildGroupedMessage(title, items, options = {}) {
  const header = title || 'PlanCraftAI Update'
  const list = ensureArray(items)
  if (!list.length) {
    const base = options.fallback || 'Stay on track with PlanCraftAI ✨'
    return `${header}\n\n${base}`
  }
  const lines = list.map((item, idx) => `${idx + 1}. ${describeItem(item)}`)
  const closing = options.closing ?? 'Stay on track with PlanCraftAI ✨'
  return `${header}\n\n${lines.join('\n')}\n\n${closing}`
}

function buildVoiceSummary(intro, items) {
  const safeIntro = intro || 'Heads up'
  const titles = ensureArray(items)
    .map((item) => item?.title || item?.text || item?.message)
    .filter(Boolean)

  if (!titles.length) return `${safeIntro}.`
  if (titles.length === 1) return `${safeIntro}. ${titles[0]} is due now.`
  const last = titles.pop()
  return `${safeIntro}. ${titles.join(', ')} and ${last} are due now.`
}

async function sendWhatsAppWithFallback(userId, primary, fallback) {
  if (!primary) return sendWhatsApp(userId, fallback)
  try {
    return await sendWhatsApp(userId, primary)
  } catch (err) {
    if (!fallback) throw err
    console.warn('[Notification] WhatsApp template send failed, attempting fallback', err?.message || err)
    return await sendWhatsApp(userId, fallback)
  }
}

async function sendViaChannel(channel, userId, payload, contacts = {}, meta = {}) {
  // Prefer routing through posting-service if available and we have a recipient.
  const normalizedChannel = channel === 'voice' ? 'voice_call' : channel
  const postingEnabled = postingServiceAvailable()
  const to = pickRecipientForChannel(channel, contacts)
  if (postingEnabled && to) {
    try {
      const res = await enqueueNotificationJob(normalizedChannel, {
        to,
        body:
          channel === 'whatsapp'
            ? payload.whatsappPrimary || payload.whatsappFallback || payload.message
            : channel === 'email'
              ? payload.emailMessage || payload.message
              : channel === 'sms'
                ? payload.smsMessage || payload.message
                : payload.voiceMessage || payload.message,
        subject: payload.subject || 'PlanCraftAI Update',
        audioUrl: payload.voiceOptions?.audioUrl || null,
      }, { userId, ...meta })
      if (res) return res
    } catch (err) {
      console.warn('[Notification] posting-service send failed; falling back', err?.message || err)
    }
  }

  if (channel === 'whatsapp') {
    return sendWhatsAppWithFallback(userId, payload.whatsappPrimary, payload.whatsappFallback || payload.message)
  }
  if (channel === 'email') {
    return sendEmail(userId, payload.emailMessage || payload.message, payload.subject)
  }
  if (channel === 'pwa') {
    return sendPWA(
      userId,
      payload.pwa || {
        title: 'PlanCraftAI',
        body: payload.message,
        data: payload.pwaData || {},
      },
    )
  }
  if (channel === 'voice') {
    if (!payload.voiceMessage) return null
    return makeCallForUser(userId, payload.voiceMessage, payload.voiceOptions || {})
  }
  if (channel === 'sms') {
    if (!payload.smsMessage) return null
    return sendSMSForUser(userId, payload.smsMessage)
  }
  return null
}

export async function notifyTaskCreated(userId, tasksInput = [], options = {}) {
  const tasks = ensureArray(tasksInput)
  const title = options.title || '🆕 New Tasks Created'
  const message = options.message || buildGroupedMessage(title, tasks, { fallback: 'A new task is ready for you.' })
  const subject = options.subject || 'PlanCraftAI Update'
  const contacts = await loadUserContacts(userId)

  const channelResolution = await resolveUserChannels(userId, options.channels, {
    includeVoice: false,
    allowed: ['whatsapp', 'email', 'pwa'],
    limitTo: options.limitTo,
    returnContext: true,
  })
  const channels = channelResolution.channels

  const defaultPwaBody =
    tasks.length === 1
      ? `“${tasks[0]?.title || 'New task'}” is on your list.`
      : `${tasks.length} tasks were just added to your list.`

  const payload = {
    message,
    subject,
    whatsappPrimary: options.whatsapp,
    whatsappFallback: message,
    emailMessage: options.emailMessage || message,
    pwa: options.pwa || {
      title: tasks.length === 1 ? 'Task created' : 'Tasks created',
      body: defaultPwaBody,
      data: {
        type: 'task-created',
        taskIds: tasks.map((task) => task?.id).filter(Boolean),
      },
    },
  }

  const deliveries = []
  try {
    const titles = tasks.map((t) => t?.title).filter(Boolean)
    const headline = titles.length
      ? `${titles[0]}${titles.length > 1 ? ` (+${titles.length - 1})` : ''}`
      : 'Task'
    console.log(
      `[Notify] Created: ${headline} | Channels=${JSON.stringify(channels)} | Prefs=${JSON.stringify(channelResolution.prefs)}`
    )
  } catch {}
  for (const channel of channels) {
    try {
      deliveries.push(await sendViaChannel(channel, userId, payload, contacts, { workspaceId: tasks[0]?.workspaceId || null, type: 'task_created' }))
      console.log(`[Notify] Task creation alert sent to ${userId} via ${channel}`)
    } catch (err) {
      console.warn(`[Notification] ${channel} failed for task creation`, err?.message || err)
    }
  }

  if (!deliveries.length) {
    console.log('[Notification] No delivery channels enabled for task creation alert')
  }

  return deliveries
}

export async function sendCalendarDigestNotification(userId, createdTasks = []) {
  const tasks = ensureArray(createdTasks).filter(Boolean)
  if (!tasks.length) return null

  const title =
    tasks.length === 1
      ? '📅 Added a meeting from your calendar'
      : `📅 Added ${tasks.length} meetings from your calendar`

  const message = buildGroupedMessage(title, tasks, {
    fallback: 'Your meetings are ready in PlanCraftAI.',
    closing: 'Tap to review and join.',
  })

  const channelResolution = await resolveUserChannels(userId, null, {
    includeVoice: false,
    allowed: ['whatsapp', 'email', 'pwa'],
    returnContext: true,
  })
  const channels = channelResolution.channels
  const contacts = await loadUserContacts(userId)

  const payload = {
    message,
    subject: 'Calendar sync update',
    whatsappPrimary: message,
    whatsappFallback: message,
    emailMessage: message.replace(/\n/g, '<br/>'),
    pwa: {
      title: 'Calendar Sync',
      body:
        tasks.length === 1
          ? `${tasks[0].title || 'Meeting'} is on your list.`
          : `${tasks.length} meetings were added to your plan.`,
      data: { type: 'calendar_sync' },
    },
  }

  const deliveries = []
  for (const channel of channels) {
    try {
      deliveries.push(await sendViaChannel(channel, userId, payload, contacts, { type: 'calendar_digest' }))
      console.log(`[Notify] Calendar digest sent via ${channel}`)
    } catch (err) {
      console.warn('[Notification] calendar digest failed', err?.message || err)
    }
  }
  return deliveries
}

export async function notifyReminderDue(userId, itemsInput = [], options = {}) {
  const reminders = ensureArray(itemsInput)
  const includeVoice = options.includeVoice !== false

  const brandToneEnabled = options.brandTone !== false
  let brandCopy = null
  if (brandToneEnabled) {
    try {
      const identity = await loadNotificationIdentity(userId)
      const callerCta =
        options.ctaUrl ||
        options.deepLink ||
        (options.pwa && options.pwa.data && (options.pwa.data.url || options.pwa.data.cta)) ||
        null
      brandCopy = buildReminderBrandCopy({
        name: identity.firstName || identity.displayName,
        reminders,
        timezone: identity.timezone || reminders[0]?.timezone,
        ctaUrl: callerCta,
      })
    } catch (err) {
      console.warn('[Notification] brand copy fallback', err?.message || err)
      brandCopy = null
    }
  }

  const title = options.title || brandCopy?.headline || '⏰ Task Reminder'
  const message =
    options.message ||
    buildGroupedMessage(title, reminders, { fallback: 'You have something coming up soon.' })

  const voiceMessage =
    includeVoice &&
    (options.voiceMessage ||
      brandCopy?.voiceMessage ||
      buildVoiceSummary('Heads up, you have reminders waiting', reminders))

  const subject = options.subject || brandCopy?.subject || 'PlanCraftAI Reminder'
  const smsMessageBaseline = brandCopy?.sms || message.replace(/\*/g, '')
  const smsMessage = options.smsMessage || smsMessageBaseline

  const limitTo = options.limitTo
  const channelResolution = await resolveUserChannels(userId, options.channels, {
    includeVoice,
    allowed: options.allowed || ALL_CHANNELS,
    limitTo,
    returnContext: true,
  })
  const channels = channelResolution.channels
  const contacts = await loadUserContacts(userId)
  const workspaceId =
    options.workspaceId ||
    reminders.find((r) => r?.workspaceId)?.workspaceId ||
    reminders.find((r) => r?.context?.workspaceId)?.context?.workspaceId ||
    null

  const payload = {
    message,
    subject,
    whatsappPrimary: options.whatsappTemplate || options.whatsapp,
    whatsappFallback: options.whatsappFallback || brandCopy?.whatsapp || message,
    emailMessage: options.emailMessage || brandCopy?.email || message,
    pwa: options.pwa || {
      title: 'Reminder due',
      body: message,
      data: {
        type: 'reminder-due',
        reminderIds: reminders.map((reminder) => reminder?.id).filter(Boolean),
        taskIds: reminders.map((reminder) => reminder?.taskId).filter(Boolean),
      },
    },
    voiceMessage,
    voiceOptions: options.voiceOptions || {},
    smsMessage: options.sms === false ? null : smsMessage,
  }

  const deliveries = []
  try {
    const titles = reminders.map((t) => t?.title).filter(Boolean)
    const headline = titles.length
      ? `${titles[0]}${titles.length > 1 ? ` (+${titles.length - 1})` : ''}`
      : 'Reminder'
    console.log(
      `[Notify] Reminder due: ${headline} | Channels=${JSON.stringify(channels)} | Prefs=${JSON.stringify(channelResolution.prefs)}`
    )
  } catch {}
  for (const channel of channels) {
    try {
      deliveries.push(
        await sendViaChannel(channel, userId, payload, contacts, { type: 'reminder_due', workspaceId }),
      )
      console.log(`[Notify] Reminder alert sent to ${userId} via ${channel}`)
    } catch (err) {
      console.warn(`[Notification] ${channel} failed for reminder`, err?.message || err)
    }
  }

  if (!deliveries.length) {
    console.log('[Notification] No delivery channels enabled for reminder alert')
  }

  return deliveries
}

export async function sendTaskNotification(userId, task, options = {}) {
  const tasks = ensureArray(task)
  return notifyTaskCreated(userId, tasks, options)
}

export async function sendReminderNotification(userId, reminder, options = {}) {
  const items = ensureArray(reminder)
  return notifyReminderDue(userId, items, options)
}

async function loadNotificationIdentity(userId) {
  if (!userId) return {}
  try {
    const snap = await db.collection('users').doc(String(userId)).get()
    if (!snap.exists) return {}
    const data = snap.data() || {}
    const displayName =
      data.displayName ||
      data.name ||
      data.fullName ||
      (data.profile && (data.profile.displayName || data.profile.name)) ||
      null
    const timezone =
      data.timezone ||
      data.tz ||
      (data.preferences && data.preferences.timezone) ||
      (data.settings && data.settings.timezone) ||
      (data.profile && data.profile.timezone) ||
      null
    const firstName = displayName ? String(displayName).split(' ')[0] : null
    return { displayName, firstName, timezone }
  } catch (err) {
    console.warn('[Notification] identity lookup failed', err?.message || err)
    return {}
  }
}
