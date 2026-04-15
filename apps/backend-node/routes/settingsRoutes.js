import express from 'express'
import { db } from '../services/firebaseAdmin.js'
import { requireAuth, ensureUserMatches } from '../middleware/auth.js'
import { normalizePhone, guessCountry } from '../utils/phone.js'

const router = express.Router()
router.use(requireAuth, ensureUserMatches)

const CHANNEL_ALLOW_LIST = ['email','pwa','whatsapp','sms','voice_call']
const ACTION_INBOX_NUDGE_CHANNELS = ['email', 'pwa', 'whatsapp']
const ACTION_INBOX_NUDGE_URGENCY = ['important', 'urgent_only']

function clampMinutes(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return Math.min(Math.max(Math.round(num), 1), 24 * 60)
}

function clampActionInboxNudgeCount(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  return Math.min(Math.max(Math.round(num), 1), 3)
}

function normalizeActionInboxUrgency(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (ACTION_INBOX_NUDGE_URGENCY.includes(normalized)) return normalized
  if (normalized === 'urgent-only') return 'urgent_only'
  return null
}

function parseDateInput(value) {
  if (value === null) return null
  if (!value) return undefined
  if (value instanceof Date) return value
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

// POST /api/settings/updatePreferences
router.post('/settings/updatePreferences', async (req, res) => {
  try {
    const { userId, preferences } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    // Normalize channels list if supplied
    const inChannels = Array.isArray(preferences?.notifications?.channels)
      ? preferences.notifications.channels
          .map((c) => String(c).toLowerCase())
          .filter((c) => CHANNEL_ALLOW_LIST.includes(c))
      : undefined

    const reminderPref = preferences?.reminders || {}
    const reminderChannels = Array.isArray(reminderPref?.channels)
      ? reminderPref.channels
          .map((c) => String(c).toLowerCase())
          .filter((c) => CHANNEL_ALLOW_LIST.includes(c))
      : undefined
    const reminderPayload = {}
    if (reminderPref?.enabled !== undefined) reminderPayload.enabled = !!reminderPref.enabled
    if (reminderChannels) reminderPayload.channels = reminderChannels

    const actionInboxPref =
      preferences?.notifications?.actionInboxNudges ||
      preferences?.actionInboxNudges ||
      {}
    const actionInboxChannels = Array.isArray(actionInboxPref?.channels)
      ? actionInboxPref.channels
          .map((c) => String(c).toLowerCase())
          .filter((c) => ACTION_INBOX_NUDGE_CHANNELS.includes(c))
      : undefined
    const actionInboxPayload = {}
    if (actionInboxPref?.enabled !== undefined) actionInboxPayload.enabled = !!actionInboxPref.enabled
    if (actionInboxPref?.dailyDigest !== undefined || actionInboxPref?.daily_digest !== undefined) {
      actionInboxPayload.dailyDigest = !!(actionInboxPref?.dailyDigest ?? actionInboxPref?.daily_digest)
    }
    const actionInboxUrgency = normalizeActionInboxUrgency(actionInboxPref?.urgency)
    if (actionInboxUrgency) actionInboxPayload.urgency = actionInboxUrgency
    const actionInboxMax = clampActionInboxNudgeCount(
      actionInboxPref?.maxPerSuggestion ?? actionInboxPref?.max_per_suggestion,
    )
    if (actionInboxMax !== null) actionInboxPayload.maxPerSuggestion = actionInboxMax
    if (actionInboxChannels) actionInboxPayload.channels = Array.from(new Set(actionInboxChannels))
    const actionInboxDigestChannels = Array.isArray(actionInboxPref?.digestChannels || actionInboxPref?.digest_channels)
      ? (actionInboxPref?.digestChannels || actionInboxPref?.digest_channels)
          .map((c) => String(c).toLowerCase())
          .filter((c) => ACTION_INBOX_NUDGE_CHANNELS.includes(c))
      : undefined
    if (actionInboxDigestChannels) {
      actionInboxPayload.digestChannels = Array.from(new Set(actionInboxDigestChannels))
    }

    const meetingPref = preferences?.meetings || {}
    const meetingPayload = {}
    if (meetingPref?.autoCreateCalendarTasks !== undefined) {
      meetingPayload.autoCreateCalendarTasks = !!meetingPref.autoCreateCalendarTasks
    }
    const defaultMinutes =
      meetingPref?.defaultReminderMinutes ??
      meetingPref?.defaultMeetingReminderMinutes
    const clampedMinutes = clampMinutes(defaultMinutes)
    if (clampedMinutes !== null) {
      meetingPayload.defaultReminderMinutes = clampedMinutes
    }

    await db.collection('users').doc(userId).set(
      {
        preferences: {
          notifications: {
            email: !!preferences?.notifications?.email,
            push: !!preferences?.notifications?.push,
            whatsapp: !!preferences?.notifications?.whatsapp,
            discord: !!preferences?.notifications?.discord,
            calls: !!preferences?.notifications?.calls,
            // new granular flags
            sms: !!preferences?.notifications?.sms,
            voice_call: !!preferences?.notifications?.voice_call,
            // persist channels array when provided
            ...(inChannels ? { channels: inChannels } : {}),
            ...(Object.keys(actionInboxPayload).length ? { actionInboxNudges: actionInboxPayload } : {}),
          },
          ...(Object.keys(reminderPayload).length ? { reminders: reminderPayload } : {}),
          integrations: {
            googleCalendar: !!preferences?.integrations?.googleCalendar,
            slack: !!preferences?.integrations?.slack,
            discord: !!preferences?.integrations?.discord,
            outlook: !!preferences?.integrations?.outlook,
            whatsapp: !!preferences?.integrations?.whatsapp,
          },
          ...(Object.keys(meetingPayload).length ? { meetings: meetingPayload } : {}),
        },
        updatedAt: new Date(),
      },
      { merge: true }
    )

    res.json({ success: true })
  } catch (err) {
    console.error('❌ updatePreferences error:', err)
    res.status(500).json({ error: 'Failed to update preferences' })
  }
})

// GET /api/settings/preferences?userId=...
router.get('/settings/preferences', async (req, res) => {
  try {
    const { userId } = req.query || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    res.json({ preferences: data?.preferences || {} })
  } catch (err) {
    console.error('❌ getPreferences error:', err)
    res.status(500).json({ error: 'Failed to fetch preferences' })
  }
})

router.get('/settings/profile', async (req, res) => {
  try {
    const { userId } = req.query || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    res.json({ profile: data || {} })
  } catch (err) {
    console.error('❌ getProfile error:', err)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

router.post('/settings/profile', async (req, res) => {
  try {
    const { userId, profile } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    if (!profile || typeof profile !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid profile payload' })
    }

    const patch = {
      updatedAt: new Date(),
    }

    if (profile.name !== undefined) {
      const value = String(profile.name || '').trim()
      patch.name = value || null
    }

    if (profile.email !== undefined) {
      const value = String(profile.email || '').trim()
      patch.email = value || null
    }

    if (profile.phone !== undefined) {
      const country = guessCountry(req)
      const normalized = profile.phone ? normalizePhone(String(profile.phone), country) : ''
      patch.phone = normalized || null
    }

    if (profile.profileComplete !== undefined) {
      patch.profileComplete = !!profile.profileComplete
    }

    await db.collection('users').doc(String(userId)).set(patch, { merge: true })
    res.json({ success: true, profile: patch })
  } catch (err) {
    console.error('❌ updateProfile error:', err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// GET /api/settings/:userId/reminder-preferences
router.get('/settings/:userId/reminder-preferences', async (req, res) => {
  try {
    const { userId } = req.params || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    const notifications = data?.preferences?.notifications || {}
    const rootNotifications = data?.notifications || {}
    const reminders = data?.preferences?.reminders || {}

    const enabled =
      reminders?.enabled !== undefined
        ? !!reminders.enabled
        : !!notifications?.calls ||
          !!notifications?.whatsapp ||
          !!notifications?.push ||
          !!notifications?.pwa ||
          !!notifications?.email ||
          !!notifications?.sms ||
          !!rootNotifications?.whatsapp ||
          !!rootNotifications?.push ||
          !!rootNotifications?.pwa ||
          !!rootNotifications?.email ||
          !!rootNotifications?.sms ||
          !!rootNotifications?.voice_call

    const channelsSource =
      Array.isArray(reminders?.channels) && reminders.channels.length
        ? reminders.channels
        : Array.isArray(notifications?.channels) && notifications.channels.length
          ? notifications.channels
          : Array.isArray(rootNotifications?.channels) && rootNotifications.channels.length
            ? rootNotifications.channels
          : [
              (notifications?.email ?? rootNotifications?.email) && 'email',
              ((notifications?.push ?? rootNotifications?.push) || (notifications?.pwa ?? rootNotifications?.pwa)) && 'pwa',
              (notifications?.whatsapp ?? rootNotifications?.whatsapp) && 'whatsapp',
              (notifications?.sms ?? rootNotifications?.sms) && 'sms',
              (notifications?.voice_call ?? rootNotifications?.voice_call) && 'voice_call',
            ].filter(Boolean)

    const channels = Array.from(
      new Set(
        channelsSource
          .map((c) => String(c || '').toLowerCase())
          .filter((c) => CHANNEL_ALLOW_LIST.includes(c))
      )
    )

    res.json({
      enabled,
      channels,
    })
  } catch (err) {
    console.error('❌ getReminderPreferences error:', err)
    res.status(500).json({ error: 'Failed to fetch reminder preferences' })
  }
})

// export default at end of file after route registrations

// POST /api/settings/updateIntegrations
router.post('/settings/updateIntegrations', async (req, res) => {
  try {
    const { userId, integrations } = req.body || {}
    console.log('[Settings API] updateIntegrations body', {
      hasUserId: !!userId,
      keys: integrations && typeof integrations === 'object' ? Object.keys(integrations) : null,
      whatsappPhone: integrations?.whatsapp?.phone ? String(integrations.whatsapp.phone).slice(0, 6) + '…' : null,
    })

    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    if (!integrations || typeof integrations !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid integrations object' })
    }

    // Normalize + validate
    const toStr = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v))
    const trimUndef = (v) => (toStr(v).trim() || undefined)
    const e164 = /^\+?[0-9]{8,15}$/
    const errs = []

    const userCountry = guessCountry(req)
    let wPhoneInput = trimUndef(integrations?.whatsapp?.phone)
    let sPhoneInput = trimUndef(integrations?.sms?.phone)
    const wPhoneNorm = wPhoneInput ? normalizePhone(wPhoneInput, userCountry) : undefined
    const sPhoneNorm = sPhoneInput ? normalizePhone(sPhoneInput, userCountry) : undefined
    const wPhone = wPhoneNorm
    const sPhone = sPhoneNorm
    if (wPhone && !e164.test(wPhone)) errs.push('whatsapp.phone invalid; please enter a valid number')
    if (sPhone && !e164.test(sPhone)) errs.push('sms.phone invalid; please enter a valid number')

    const dHook = trimUndef(integrations?.discord?.webhook)
    if (dHook && !/^https:\/\/discord\.com\/api\/webhooks\//.test(dHook)) errs.push('discord.webhook must start with https://discord.com/api/webhooks/')

    if (errs.length) return res.status(400).json({ error: 'Invalid fields', details: errs })

    // PWA subscriptions: array of { endpoint, keys: { p256dh, auth } }
    const pwaSubs = Array.isArray(integrations?.pwa?.subscriptions)
      ? integrations.pwa.subscriptions
          .map((s) => ({
            endpoint: trimUndef(s?.endpoint),
            keys:
              s?.keys && typeof s.keys === 'object'
                ? { p256dh: trimUndef(s.keys.p256dh), auth: trimUndef(s.keys.auth) }
                : undefined,
          }))
          .filter((s) => s.endpoint && s.keys?.p256dh && s.keys?.auth)
      : undefined

    // Build object and prune undefined deeply to satisfy Firestore
    const safe = {
      whatsapp: { phone: wPhone },
      sms: { phone: sPhone },
      discord: { webhook: dHook },
      slack: {
        userId: trimUndef(integrations?.slack?.userId),
        token: trimUndef(integrations?.slack?.token),
      },
      email: trimUndef(integrations?.email),
      pwa: pwaSubs ? { subscriptions: pwaSubs } : undefined,
    }

    const pruneUndefinedDeep = (obj) => {
      if (obj == null) return obj
      if (Array.isArray(obj)) {
        const arr = obj.map(pruneUndefinedDeep).filter((v) => v !== undefined)
        return arr
      }
      if (typeof obj === 'object') {
        const out = {}
        for (const [k, v] of Object.entries(obj)) {
          const pv = pruneUndefinedDeep(v)
          if (pv === undefined) continue
          if (typeof pv === 'object' && pv !== null && !Array.isArray(pv) && Object.keys(pv).length === 0) continue
          out[k] = pv
        }
        return out
      }
      return obj
    }

    // Mirror phone to preferences.notifications for backend phone resolution
    const notifPhones = {
      phone_sms: sPhone || undefined,
      phone_voice: (trimUndef(integrations?.voice?.phone) || sPhone || wPhone) ? normalizePhone(trimUndef(integrations?.voice?.phone) || sPhone || wPhone, userCountry) : undefined,
    }

    const payload = pruneUndefinedDeep({
      integrations: safe,
      preferences: { notifications: notifPhones },
      updatedAt: new Date(),
    })

    await db.collection('users').doc(String(userId)).set(
      payload,
      { merge: true }
    )

    res.json({ success: true })
  } catch (err) {
    console.error('❌ updateIntegrations error:', err)
    res.status(500).json({ error: err?.message || 'Failed to update integrations' })
  }
})

// GET /api/settings/integrations?userId=...
router.get('/settings/integrations', async (req, res) => {
  try {
    const { userId } = req.query || {}
    console.log('[Settings API] getIntegrations query', { hasUserId: !!userId })
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    const snap = await db.collection('users').doc(String(userId)).get()
    const data = snap.exists ? snap.data() : {}
    res.json({ integrations: data?.integrations || {} })
  } catch (err) {
    console.error('❌ getIntegrations error:', err)
    res.status(500).json({ error: 'Failed to fetch integrations' })
  }
})

router.post('/settings/onboarding', async (req, res) => {
  try {
    const { userId, onboarding } = req.body || {}
    if (!userId) return res.status(400).json({ error: 'Missing userId' })
    if (!onboarding || typeof onboarding !== 'object') {
      return res.status(400).json({ error: 'Missing onboarding payload' })
    }

    const payload = {}
    if (onboarding.completed !== undefined) payload.completed = !!onboarding.completed
    if (onboarding.lastStep !== undefined) {
      const step = Number(onboarding.lastStep)
      payload.lastStep = Number.isFinite(step) ? step : 0
    }
    if (onboarding.showLaterUntil !== undefined) {
      if (onboarding.showLaterUntil === null) payload.showLaterUntil = null
      else {
        const parsed = parseDateInput(onboarding.showLaterUntil)
        if (parsed) payload.showLaterUntil = parsed
      }
    }

    const dateFields = ['completedAt', 'startedAt', 'skippedAt', 'lastDeferredAt', 'replayRequestedAt']
    dateFields.forEach((field) => {
      if (onboarding[field] === undefined) return
      if (onboarding[field] === null) {
        payload[field] = null
      } else {
        const parsed = parseDateInput(onboarding[field])
        if (parsed) payload[field] = parsed
      }
    })

    if (!Object.keys(payload).length) {
      return res.status(400).json({ error: 'No onboarding fields provided' })
    }

    payload.updatedAt = new Date()

    await db.collection('users').doc(String(userId)).set(
      {
        preferences: {
          onboarding: payload,
        },
        updatedAt: new Date(),
      },
      { merge: true }
    )

    res.json({ success: true, onboarding: payload })
  } catch (err) {
    console.error('❌ onboarding status update error:', err)
    res.status(500).json({ error: 'Failed to update onboarding status' })
  }
})

export default router
