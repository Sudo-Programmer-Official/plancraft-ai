import cron from 'node-cron'
import { getUserOutlookIntegration } from '../services/outlookOAuth.js'
import { syncOutlookAccount } from '../services/calendarSyncService.js'
import { db } from '../services/firebaseAdmin.js'
import { normalizeCronSpec } from '../utils/cronSpec.js'

export function initOutlookCalendarSync() {
  const enabled = String(process.env.ENABLE_OUTLOOK_CALENDAR || '').toLowerCase()
  if (enabled !== '1' && enabled !== 'true') {
    console.log('⏳ Outlook Calendar sync disabled (set ENABLE_OUTLOOK_CALENDAR=1 to enable)')
    return
  }
  const cadence = normalizeCronSpec(process.env.OUTLOOK_SYNC_CRON, '*/10 * * * *')
  cron.schedule(cadence, async () => {
    try {
      console.log('[OutlookSync] Cron fired', new Date().toISOString())
      const snap = await db.collection('users').where('integrations.outlook.connected', '==', true).get()
      console.log(`[OutlookSync] Users to check: ${snap.size}`)
      for (const doc of snap.docs) {
        const uid = doc.id
        try {
          const integ = (await getUserOutlookIntegration(uid)) || {}
          const selected = (integ?.accounts || [])
            .flatMap((a) => (Array.isArray(a.calendars) ? a.calendars : []))
            .filter((c) => !!c.selected)
          if (!selected.length) continue
          const stats = await syncOutlookAccount(uid)
          console.log(
            `[OutlookSync] user=${uid} events=${stats.eventsUpserted} ` +
              `created=${stats.created || 0} updated=${stats.updated || 0} cancelled=${stats.cancelled || 0} deleted=${stats.deleted || 0} skipped=${stats.skipped || 0}`,
          )
        } catch (e) {
          console.warn(`[OutlookSync] user=${uid} failed:`, e?.message || e)
        }
      }
    } catch (e) {
      console.error('[OutlookSync] Cron failed:', e)
    }
  })
  console.log(`[OutlookSync] Registered cron job (${cadence})`)
}
