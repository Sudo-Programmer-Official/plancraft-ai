import cron from 'node-cron'
import { getUserGoogleIntegration, ensureFreshAccessToken } from '../services/googleOAuth.js'
import { syncSelectedCalendars } from '../services/googleCalendarService.js'
import { db } from '../services/firebaseAdmin.js'

export function initGoogleCalendarSync() {
  const enabled = String(process.env.ENABLE_GOOGLE_CALENDAR || '').toLowerCase()
  if (enabled !== '1' && enabled !== 'true') {
    console.log('⏳ Google Calendar sync disabled (set ENABLE_GOOGLE_CALENDAR=1 to enable)')
    return
  }
  const cadence = String(process.env.GCAL_SYNC_CRON || '*/5 * * * *')
  cron.schedule(cadence, async () => {
    try {
      console.log('[GoogleSync] Cron fired', new Date().toISOString())
      // Find users with google integration connected
      const snap = await db.collection('users').where('integrations.google.connected', '==', true).get()
      console.log(`[GoogleSync] Users to check: ${snap.size}`)
      for (const doc of snap.docs) {
        const uid = doc.id
        try {
          const integ = (await getUserGoogleIntegration(uid)) || {}
          const selected = (integ?.calendars || []).filter((c) => !!c.selected)
          if (!selected.length) continue
          const { tokens } = await ensureFreshAccessToken(uid)
          const count = await syncSelectedCalendars(uid, tokens)
          console.log(`[GoogleSync] user=${uid} synced=${count}`)
        } catch (e) {
          console.warn(`[GoogleSync] user=${uid} failed:`, e?.message || e)
        }
      }
    } catch (e) {
      console.error('[GoogleSync] Cron failed:', e)
    }
  })
  console.log(`[GoogleSync] Registered cron job (${cadence})`)
}

