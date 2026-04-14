import { db } from "./firebaseAdmin.js"
import { queueReminder } from "./reminderService.js"
import { initCarryoverJobs } from "./automation/carryoverJobs.js"
import { initReportScheduler } from "../jobs/reportScheduler.js"
import { initHabitAnalyticsScheduler } from "../jobs/habitAnalyticsScheduler.js"
import { initMorningCoach } from "../jobs/morningCoach.js"
import { initGoogleCalendarSync } from "../jobs/googleCalendarSyncJob.js"
import { initSitemapJob } from "../jobs/sitemapJob.js"
import { initRetentionJob } from "../jobs/retentionJob.js"
import { initActionInboxScheduler } from "../jobs/actionInboxScheduler.js"

export async function initScheduler() {
  try {
    const now = new Date()
    let snap
    try {
      snap = await db
        .collection('reminders')
        .where('sentAt', '==', null)
        .where('scheduledTime', '>', now)
        .get()
    } catch (e) {
      console.warn('Composite index missing for reminders init; falling back to single-field query')
      snap = await db
        .collection('reminders')
        .where('scheduledTime', '>', now)
        .get()
    }

    let count = 0
    snap.forEach((doc) => {
      const data = doc.data()
      if (data?.sentAt) return
      if (data?.status && String(data.status).toLowerCase() !== 'scheduled') return
      const reminder = { id: doc.id, ...data }
      queueReminder(reminder)
      console.log(`[Scheduler] Queued reminder on boot id=${doc.id} taskId=${data?.taskId || 'n/a'} at=${(data?.scheduledTime?.toDate ? data.scheduledTime.toDate() : data.scheduledTime)?.toISOString?.() || data?.scheduledTime}`)
      count++
    })
    console.log(`📅 Loaded ${count} reminders into scheduler`)
  } catch (e) {
    console.error('initScheduler error:', e)
  }
  // Boot recurring jobs
  try { initCarryoverJobs() } catch (e) { console.warn('Carryover jobs init failed', e) }
  try { initReportScheduler() } catch (e) { console.warn('Report scheduler init failed', e) }
  try { initHabitAnalyticsScheduler() } catch (e) { console.warn('Habit analytics init failed', e) }
  try { initMorningCoach() } catch (e) { console.warn('Morning coach init failed', e) }
  try { initGoogleCalendarSync() } catch (e) { console.warn('Google calendar sync init failed', e) }
  try { initSitemapJob() } catch (e) { console.warn('Sitemap job init failed', e) }
  try { initRetentionJob() } catch (e) { console.warn('Retention job init failed', e) }
  try { initActionInboxScheduler() } catch (e) { console.warn('Action inbox scheduler init failed', e) }
}
