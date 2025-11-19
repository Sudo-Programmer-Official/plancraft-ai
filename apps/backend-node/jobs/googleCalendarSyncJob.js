import cron from 'node-cron'
import { getUserGoogleIntegration } from '../services/googleOAuth.js'
import { getUserOutlookIntegration } from '../services/outlookOAuth.js'
import { syncGoogleAccount, syncOutlookAccount } from '../services/calendarSyncService.js'
import { db } from '../services/firebaseAdmin.js'
import { normalizeCronSpec } from '../utils/cronSpec.js'

export function initGoogleCalendarSync() {
  const enabled = String(process.env.ENABLE_GOOGLE_CALENDAR || '').toLowerCase()
  if (enabled !== '1' && enabled !== 'true') {
    console.log('⏳ Google Calendar sync disabled (set ENABLE_GOOGLE_CALENDAR=1 to enable)')
    return
  }
  const cadence = normalizeCronSpec(process.env.GCAL_SYNC_CRON, '*/5 * * * *')
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
          const stats = await syncGoogleAccount(uid)
          console.log(
            `[GoogleSync] user=${uid} events=${stats.eventsUpserted} ` +
              `created=${stats.created || 0} updated=${stats.updated || 0} cancelled=${stats.cancelled || 0} deleted=${stats.deleted || 0} skipped=${stats.skipped || 0}`
          )
        } catch (e) {
          console.warn(`[GoogleSync] user=${uid} failed:`, e?.message || e)
        }
      }
      try {
        const outlookSnap = await db.collection('users').where('integrations.outlook.connected', '==', true).get()
        console.log(`[OutlookSync] Users to check: ${outlookSnap.size}`)
        for (const doc of outlookSnap.docs) {
          const uid = doc.id
          try {
            const integ = await getUserOutlookIntegration(uid)
            if (!integ?.connected) continue
            const stats = await syncOutlookAccount(uid)
            console.log(`[OutlookSync] user=${uid} events=${stats.eventsUpserted} created=${stats.created || 0} updated=${stats.updated || 0}`)
          } catch (err) {
            console.warn(`[OutlookSync] user=${uid} failed:`, err?.message || err)
          }
        }
      } catch (err) {
        console.warn('[OutlookSync] cron iteration failed', err?.message || err)
      }
    } catch (e) {
      console.error('[GoogleSync] Cron failed:', e)
    }
  })
  console.log(`[GoogleSync] Registered cron job (${cadence})`)
}
